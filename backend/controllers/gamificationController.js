const Gamification = require('../models/Gamification');
const User = require('../models/User');
const Analytics = require('../models/Analytics');
const Lab = require('../models/Lab');
const { createNotification } = require('./notificationController');

const ensureGamification = async (userId) => {
    let g = await Gamification.findOne({ userId });
    if (!g) {
        g = await Gamification.create({ userId, points: 0, level: 1, xp: 0, rank: 'Beginner' });
    }
    return g;
};

const awardBadgeIfMissing = (gamification, badge) => {
    const existing = (gamification.badges || []).find(b => b.badgeId === badge.badgeId);
    if (existing) return false;
    gamification.badges = gamification.badges || [];
    gamification.badges.push({ ...badge, earnedAt: new Date() });
    return true;
};

const awardAchievementIfMissing = (gamification, achievement) => {
    const existing = (gamification.achievements || []).find(item => item.achievementId === achievement.achievementId);
    if (existing) return false;
    gamification.achievements = gamification.achievements || [];
    gamification.achievements.push({
        ...achievement,
        unlockedAt: achievement.unlockedAt || new Date()
    });
    return true;
};

const evaluateBadges = async ({ userId, labId }) => {
    const g = await ensureGamification(userId);

    // Beginner/Intermediate/Advanced based on labs completed (from stats.labsCompleted)
    const labsCompleted = Number(g.stats?.labsCompleted || 0);
    if (labsCompleted >= 1) {
        awardBadgeIfMissing(g, {
            badgeId: 'beginner_first_lab',
            name: 'Beginner',
            description: 'First lab completed',
            icon: 'bx bx-star'
        });
    }
    if (labsCompleted >= 5) {
        awardBadgeIfMissing(g, {
            badgeId: 'intermediate_5_labs',
            name: 'Intermediate',
            description: '5 labs completed',
            icon: 'bx bx-trophy'
        });
    }

    // Advanced: all labs completed (compare against total labs count)
    const totalLabs = await Lab.countDocuments({});
    if (totalLabs > 0 && labsCompleted >= totalLabs) {
        awardBadgeIfMissing(g, {
            badgeId: 'advanced_all_labs',
            name: 'Advanced',
            description: 'All labs completed',
            icon: 'bx bx-award'
        });
    }

    // Fast Learner: completed lab under average time
    if (labId) {
        const allCompleted = await Analytics.find({ labId, 'metrics.completionStatus': 'completed' });
        const avg = allCompleted.length
            ? allCompleted.reduce((s, a) => s + Number(a.metrics?.timeSpent || 0), 0) / allCompleted.length
            : null;
        const myLatest = await Analytics.findOne({ userId, labId, 'metrics.completionStatus': 'completed' }).sort({ createdAt: -1 });
        const myTime = myLatest ? Number(myLatest.metrics?.timeSpent || 0) : null;
        if (avg && myTime !== null && myTime > 0 && myTime < avg) {
            awardBadgeIfMissing(g, {
                badgeId: 'fast_learner',
                name: 'Fast Learner',
                description: 'Completed a lab under average time',
                icon: 'bx bx-timer'
            });
        }
    }

    // Debug Master: solved lab with minimal errors (<=1 error)
    if (labId) {
        const myLatest = await Analytics.findOne({ userId, labId, 'metrics.completionStatus': 'completed' }).sort({ createdAt: -1 });
        const errCount = myLatest ? (myLatest.metrics?.errors?.length || 0) : null;
        if (errCount !== null && errCount <= 1) {
            awardBadgeIfMissing(g, {
                badgeId: 'debug_master',
                name: 'Debug Master',
                description: 'Solved a lab with minimal errors',
                icon: 'bx bx-bug'
            });
        }
    }

    await g.save();
    return g;
};

// @desc    Get user gamification data
// @route   GET /api/gamification
// @access  Private
exports.getGamification = async (req, res) => {
    try {
        let gamification = await Gamification.findOne({ userId: req.user.id });

        if (!gamification) {
            gamification = await Gamification.create({
                userId: req.user.id,
                points: 0,
                level: 1,
                xp: 0,
                rank: 'Beginner'
            });
        }

        res.status(200).json({
            success: true,
            data: gamification
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Award points based on lab events (start/complete/first-attempt bonus)
// @route   POST /api/gamification/award
// @access  Private
exports.awardPoints = async (req, res) => {
    try {
        const { event, labId, taskId, assignedTaskId, meta } = req.body;
        if (!event) {
            return res.status(400).json({ success: false, message: 'event is required' });
        }

        const g = await ensureGamification(req.user.id);
        g.stats = g.stats || {};
        g.stats.lastActivityDate = new Date();

        let points = 0;
        let reason = 'activity';

        if (event === 'lab_started') {
            points = 5;
            reason = 'Started a lab';
            g.stats.labsStarted = Number(g.stats.labsStarted || 0) + 1;
        } else if (event === 'lab_completed') {
            points = 20;
            reason = 'Completed a lab';
            g.stats.labsCompleted = Number(g.stats.labsCompleted || 0) + 1;
        } else if (event === 'completed_first_attempt') {
            points = 10;
            reason = 'Completed on first attempt';
            g.stats.firstAttemptCompletions = Number(g.stats.firstAttemptCompletions || 0) + 1;
        } else if (event === 'practice_run') {
            points = 3;
            reason = 'Completed a practice run';
        } else if (event === 'error') {
            points = 0;
            reason = 'Error during execution';
            g.stats.totalErrors = Number(g.stats.totalErrors || 0) + 1;
        } else {
            return res.status(400).json({ success: false, message: 'Unknown event' });
        }

        let xpResult = { leveledUp: false, currentLevel: g.level };
        if (points !== 0) {
            g.addPoints(points, reason, {
                ...(labId ? { labId } : {}),
                ...(taskId ? { taskId } : {}),
                ...(assignedTaskId ? { assignedTaskId } : {}),
                ...(meta && typeof meta === 'object' ? meta : {})
            });
            xpResult = g.addXP(points);
        }
        await g.save();

        let newlyEarnedBadges = [];
        if (event === 'lab_completed') {
            const badgeIdsBefore = new Set((g.badges || []).map(badge => badge.badgeId));
            const updatedGamification = await evaluateBadges({ userId: req.user.id, labId });
            newlyEarnedBadges = (updatedGamification.badges || []).filter(badge => !badgeIdsBefore.has(badge.badgeId));

            newlyEarnedBadges.forEach((badge) => {
                awardAchievementIfMissing(updatedGamification, {
                    achievementId: `badge:${badge.badgeId}`,
                    name: badge.name,
                    description: badge.description,
                    unlockedAt: badge.earnedAt || new Date()
                });
            });

            await updatedGamification.save();
        }

        const updated = await ensureGamification(req.user.id);

        if (xpResult.leveledUp) {
            awardAchievementIfMissing(updated, {
                achievementId: `level:${updated.level}`,
                name: `Level ${updated.level} unlocked`,
                description: `You reached ${updated.rank} rank.`,
                unlockedAt: new Date()
            });
        }

        await updated.save();

        if (xpResult.leveledUp) {
            await createNotification({
                userId: req.user.id,
                title: 'Level Up!',
                message: `You reached Level ${updated.level} and unlocked the ${updated.rank} rank.`,
                type: 'gamification',
                meta: {
                    level: updated.level,
                    rank: updated.rank,
                    section: 'gamification',
                    event: 'level_up'
                }
            });
        }

        if (newlyEarnedBadges.length > 0) {
            await Promise.all(newlyEarnedBadges.map((badge) => createNotification({
                userId: req.user.id,
                title: 'New Badge Earned',
                message: `You earned the ${badge.name} badge.`,
                type: 'gamification',
                meta: {
                    badgeId: badge.badgeId,
                    section: 'gamification',
                    event: 'badge_earned'
                }
            })));
        }

        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Add XP to user
// @route   POST /api/gamification/xp
// @access  Private
exports.addXP = async (req, res) => {
    try {
        const { points, reason } = req.body;

        let gamification = await Gamification.findOne({ userId: req.user.id });

        if (!gamification) {
            gamification = await Gamification.create({
                userId: req.user.id,
                level: 1,
                xp: 0
            });
        }

        const result = gamification.addXP(points || 10);
        if (result.leveledUp) {
            awardAchievementIfMissing(gamification, {
                achievementId: `level:${result.newLevel}`,
                name: `Level ${result.newLevel} unlocked`,
                description: `You reached ${gamification.rank} rank.`,
                unlockedAt: new Date()
            });
        }
        await gamification.save();

        if (result.leveledUp) {
            await createNotification({
                userId: req.user.id,
                title: 'Level Up!',
                message: `You reached Level ${result.newLevel} and unlocked the ${gamification.rank} rank.`,
                type: 'gamification',
                meta: {
                    level: result.newLevel,
                    rank: gamification.rank,
                    section: 'gamification',
                    event: 'level_up'
                }
            });
        }

        res.status(200).json({
            success: true,
            data: {
                gamification,
                leveledUp: result.leveledUp,
                newLevel: result.newLevel || result.currentLevel
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Award badge
// @route   POST /api/gamification/badge
// @access  Private
exports.awardBadge = async (req, res) => {
    try {
        const { badgeId, name, description, icon } = req.body;

        let gamification = await Gamification.findOne({ userId: req.user.id });

        if (!gamification) {
            gamification = await Gamification.create({
                userId: req.user.id
            });
        }

        // Check if badge already exists
        const existingBadge = gamification.badges.find(b => b.badgeId === badgeId);
        if (existingBadge) {
            return res.status(400).json({
                success: false,
                message: 'Badge already earned'
            });
        }

        gamification.badges.push({
            badgeId,
            name,
            description,
            icon,
            earnedAt: new Date()
        });
        awardAchievementIfMissing(gamification, {
            achievementId: `badge:${badgeId}`,
            name,
            description,
            unlockedAt: new Date()
        });

        await gamification.save();

        await createNotification({
            userId: req.user.id,
            title: 'New Badge Earned',
            message: `You earned the ${name} badge.`,
            type: 'gamification',
            meta: {
                badgeId,
                section: 'gamification',
                event: 'badge_earned'
            }
        });

        res.status(200).json({
            success: true,
            data: gamification
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get leaderboard
// @route   GET /api/gamification/leaderboard
// @access  Private
exports.getLeaderboard = async (req, res) => {
    try {
        const { limit = 10, batch } = req.query;

        // Batch-wise leaderboard based on points
        const pipeline = [
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            ...(batch ? [{ $match: { 'user.batch': batch } }] : []),
            {
                $project: {
                    userId: 1,
                    points: { $ifNull: ['$points', 0] },
                    level: 1,
                    xp: 1,
                    rank: 1,
                    username: '$user.username',
                    email: '$user.email',
                    batch: '$user.batch'
                }
            },
            { $sort: { points: -1, level: -1, xp: -1 } },
            { $limit: parseInt(limit) }
        ];

        const leaderboard = await Gamification.aggregate(pipeline);

        res.status(200).json({
            success: true,
            count: leaderboard.length,
            data: leaderboard
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

