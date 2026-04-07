const Analytics = require('../models/Analytics');
const Gamification = require('../models/Gamification');
const AssignedTask = require('../models/AssignedTask');

const COMPLETED_TASK_STATUSES = new Set(['submitted', 'graded']);

const getAssignedTaskDurationSeconds = (task) => {
    const start = task?.startedAt ? new Date(task.startedAt) : null;
    const end = task?.submittedAt
        ? new Date(task.submittedAt)
        : task?.gradedAt
            ? new Date(task.gradedAt)
            : null;

    if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return 0;
    }

    return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
};

const normalizeRange = (startDate, endDate) => {
    const range = {};
    if (startDate) range.$gte = new Date(startDate);
    if (endDate) range.$lte = new Date(endDate);
    return Object.keys(range).length ? range : null;
};

// @desc    Get analytics for user
// @route   GET /api/analytics
// @access  Private
exports.getAnalytics = async (req, res) => {
    try {
        const { labId, startDate, endDate } = req.query;
        const query = { userId: req.user.id };

        if (labId) query.labId = labId;
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const analytics = await Analytics.find(query)
            .populate('labId', 'name')
            .populate('taskId', 'title')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: analytics.length,
            data: analytics
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Track user activity
// @route   POST /api/analytics/track
// @access  Private
exports.trackActivity = async (req, res) => {
    try {
        const {
            labId,
            taskId,
            action,
            status,
            error,
            errorType,
            startTime,
            endTime,
            duration,
            attemptsDelta,
            executionDelta
        } = req.body;

        const now = new Date();
        const query = { userId: req.user.id };
        if (labId) query.labId = labId;
        if (taskId) query.taskId = taskId;
        if (!labId && !taskId) {
            query.labId = { $exists: false };
            query.taskId = { $exists: false };
        }

        let doc = await Analytics.findOne(query).sort({ createdAt: -1 });
        if (!doc) {
            doc = new Analytics({
                userId: req.user.id,
                labId: labId || undefined,
                taskId: taskId || undefined,
                metrics: {
                    timeSpent: 0,
                    completionStatus: 'not-started',
                    score: 0,
                    errors: [],
                    actions: [],
                    executionAttempts: 0,
                    runAttempts: 0
                },
                sessionData: {}
            });
        }

        // Actions
        if (action) {
            doc.metrics.actions = doc.metrics.actions || [];
            doc.metrics.actions.push({ action, timestamp: now });
        }

        // Status update
        if (status && ['not-started', 'in-progress', 'completed'].includes(status)) {
            doc.metrics.completionStatus = status;
        }

        // Errors
        const errValue = errorType || error;
        if (errValue) {
            doc.metrics.errors = doc.metrics.errors || [];
            doc.metrics.errors.push({ errorType: String(errValue), timestamp: now });
        }

        // Attempts
        const incExec = Number.isFinite(Number(executionDelta)) ? Number(executionDelta) : 0;
        const incAttempts = Number.isFinite(Number(attemptsDelta)) ? Number(attemptsDelta) : 0;
        doc.metrics.executionAttempts = (doc.metrics.executionAttempts || 0) + Math.max(0, incExec);
        doc.metrics.runAttempts = (doc.metrics.runAttempts || 0) + Math.max(0, incAttempts);

        // Session timing
        if (startTime) doc.sessionData.startTime = new Date(startTime);
        if (endTime) doc.sessionData.endTime = new Date(endTime);
        if (Number.isFinite(Number(duration))) doc.sessionData.duration = Number(duration);

        // Auto infer duration and timeSpent
        if (doc.sessionData.startTime && doc.sessionData.endTime) {
            const durSec = Math.max(0, Math.floor((doc.sessionData.endTime - doc.sessionData.startTime) / 1000));
            doc.sessionData.duration = durSec;
            doc.metrics.timeSpent = durSec;
        }

        // Ensure startedAt for "lab-start" and completion logic
        if (action === 'lab-start' || action === 'task-start') {
            if (!doc.sessionData.startTime) doc.sessionData.startTime = now;
            doc.metrics.completionStatus = 'in-progress';
        }
        if (action === 'lab-complete' || action === 'task-complete') {
            if (!doc.sessionData.endTime) doc.sessionData.endTime = now;
            doc.metrics.completionStatus = 'completed';
            if (doc.sessionData.startTime && doc.sessionData.endTime) {
                const durSec = Math.max(0, Math.floor((doc.sessionData.endTime - doc.sessionData.startTime) / 1000));
                doc.sessionData.duration = durSec;
                doc.metrics.timeSpent = durSec;
            }
        }

        // Back-compat: allow caller to pass { timeSpent }
        if (Number.isFinite(Number(req.body.timeSpent))) {
            doc.metrics.timeSpent = Number(req.body.timeSpent);
        }

        await doc.save();

        res.status(201).json({
            success: true,
            data: doc
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get performance statistics
// @route   GET /api/analytics/stats
// @access  Private
exports.getPerformanceStats = async (req, res) => {
    try {
        const [analytics, assignedTasks] = await Promise.all([
            Analytics.find({ userId: req.user.id }),
            AssignedTask.find({ studentId: req.user.id })
        ]);

        const analyticsCompletedCount = analytics.filter(a => a.metrics.completionStatus === 'completed').length;
        const assignedCompleted = assignedTasks.filter(task => COMPLETED_TASK_STATUSES.has(String(task.status || '').toLowerCase()));
        const assignedCompletedCount = assignedCompleted.length;

        const analyticsTimeSpent = analytics.reduce((sum, a) => sum + (a.metrics.timeSpent || 0), 0);
        const assignedTimeSpent = assignedCompleted.reduce((sum, task) => sum + getAssignedTaskDurationSeconds(task), 0);

        const analyticsScores = analytics
            .map(a => Number(a.metrics.score || 0))
            .filter(score => score > 0);
        const assignedScores = assignedTasks
            .map(task => Number(task.grade || 0))
            .filter(score => Number.isFinite(score) && score > 0);

        const effectiveScores = analyticsScores.length > 0 ? analyticsScores : assignedScores;

        const stats = {
            totalLabsCompleted: assignedTasks.length > 0 ? assignedCompletedCount : analyticsCompletedCount,
            totalTimeSpent: analyticsTimeSpent > 0 ? analyticsTimeSpent : assignedTimeSpent,
            averageScore: effectiveScores.length > 0
                ? effectiveScores.reduce((sum, score) => sum + score, 0) / effectiveScores.length
                : 0,
            totalErrors: analytics.reduce((sum, a) => sum + (a.metrics.errors?.length || 0), 0),
            commonErrors: {}
        };

        // Count common errors
        analytics.forEach(a => {
            a.metrics.errors?.forEach(err => {
                const key =
                    err && typeof err === 'object'
                        ? String(err.errorType || err.type || '').trim()
                        : String(err || '').trim();
                if (!key) return;
                stats.commonErrors[key] = (stats.commonErrors[key] || 0) + 1;
            });
        });

        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Student-level summary (labs completed vs pending, time per lab, weekly activity)
// @route   GET /api/analytics/student-summary
// @access  Private
exports.getStudentSummary = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const query = { userId: req.user.id };
        const range = normalizeRange(startDate, endDate);
        if (range) query.createdAt = range;

        const [items, assignedTasks] = await Promise.all([
            Analytics.find(query)
                .populate('labId', 'name')
                .populate('taskId', 'title')
                .sort({ createdAt: -1 }),
            AssignedTask.find({ studentId: req.user.id })
                .populate('labId', 'name')
                .populate('taskId', 'title')
                .sort({ createdAt: -1 })
        ]);

        // Labs completed vs pending based on completionStatus
        const completed = items.filter(i => i.metrics?.completionStatus === 'completed');
        const pending = items.filter(i => i.metrics?.completionStatus !== 'completed');

        // Time spent per lab (aggregate)
        const timeByLab = {};
        items.forEach(i => {
            if (!i.labId) return;
            const id = String(i.labId._id || i.labId);
            const name = i.labId.name || 'Lab';
            const timeSpent = Number(i.metrics?.timeSpent || 0);
            if (!timeByLab[id]) timeByLab[id] = { labId: id, name, timeSpent: 0, completedCount: 0, pendingCount: 0 };
            timeByLab[id].timeSpent += timeSpent;
            if (i.metrics?.completionStatus === 'completed') timeByLab[id].completedCount += 1;
            else timeByLab[id].pendingCount += 1;
        });

        // Weekly learning activity summary (last 7 days): total time + executions + errors
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const weekItems = items.filter(i => (i.createdAt || new Date(0)) >= weekAgo);
        const weekly = {
            from: weekAgo.toISOString(),
            to: new Date().toISOString(),
            totalTimeSpent: weekItems.reduce((sum, i) => sum + Number(i.metrics?.timeSpent || 0), 0),
            totalExecutionAttempts: weekItems.reduce((sum, i) => sum + Number(i.metrics?.executionAttempts || 0), 0),
            totalErrors: weekItems.reduce((sum, i) => sum + (i.metrics?.errors?.length || 0), 0)
        };

        if (assignedTasks.length > 0) {
            const assignedCompleted = assignedTasks.filter(task => COMPLETED_TASK_STATUSES.has(String(task.status || '').toLowerCase()));
            const assignedPending = assignedTasks.filter(task => !COMPLETED_TASK_STATUSES.has(String(task.status || '').toLowerCase()));

            Object.values(timeByLab).forEach(entry => {
                entry.source = 'analytics';
            });

            assignedTasks.forEach(task => {
                if (!task.labId) return;

                const id = String(task.labId._id || task.labId);
                const name = task.labId.name || task.taskId?.title || 'Lab';
                const estimatedDuration = getAssignedTaskDurationSeconds(task);

                if (!timeByLab[id]) {
                    timeByLab[id] = {
                        labId: id,
                        name,
                        timeSpent: 0,
                        completedCount: 0,
                        pendingCount: 0,
                        source: 'assigned-task'
                    };
                }

                if (timeByLab[id].timeSpent <= 0 && estimatedDuration > 0) {
                    timeByLab[id].timeSpent = estimatedDuration;
                }

                if (COMPLETED_TASK_STATUSES.has(String(task.status || '').toLowerCase())) {
                    timeByLab[id].completedCount = Math.max(timeByLab[id].completedCount, 1);
                } else {
                    timeByLab[id].pendingCount = Math.max(timeByLab[id].pendingCount, 1);
                }
            });

            const weeklyTaskActivity = assignedTasks.filter(task => {
                const activityTime = task.updatedAt || task.submittedAt || task.startedAt || task.createdAt;
                return activityTime && new Date(activityTime) >= weekAgo;
            });

            weekly.totalExecutionAttempts = weekly.totalExecutionAttempts || weeklyTaskActivity.length;

            return res.status(200).json({
                success: true,
                data: {
                    completedCount: assignedCompleted.length,
                    pendingCount: assignedPending.length,
                    timeByLab: Object.values(timeByLab).sort((a, b) => b.timeSpent - a.timeSpent),
                    weekly
                }
            });
        }

        res.status(200).json({
            success: true,
            data: {
                completedCount: completed.length,
                pendingCount: pending.length,
                timeByLab: Object.values(timeByLab).sort((a, b) => b.timeSpent - a.timeSpent),
                weekly
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Admin-level analytics (batch completion, difficult labs, average time)
// @route   GET /api/analytics/admin-summary
// @access  Private/Admin
exports.getAdminSummary = async (req, res) => {
    try {
        const { batch, startDate, endDate } = req.query;
        const match = {};
        const range = normalizeRange(startDate, endDate);
        if (range) match.createdAt = range;

        // Join users to get batch; keep aggregation readable for Mongo
        const pipeline = [
            { $match: match },
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
                    labId: 1,
                    completionStatus: '$metrics.completionStatus',
                    timeSpent: '$metrics.timeSpent',
                    errorsCount: { $size: { $ifNull: ['$metrics.errors', []] } },
                    executionAttempts: { $ifNull: ['$metrics.executionAttempts', 0] },
                    batch: '$user.batch'
                }
            }
        ];

        const rows = await Analytics.aggregate(pipeline);

        // Batch-wise completion statistics
        const batchStatsMap = {};
        rows.forEach(r => {
            const b = r.batch || 'Unknown';
            if (!batchStatsMap[b]) batchStatsMap[b] = { batch: b, completed: 0, inProgress: 0, notStarted: 0, total: 0 };
            batchStatsMap[b].total += 1;
            if (r.completionStatus === 'completed') batchStatsMap[b].completed += 1;
            else if (r.completionStatus === 'in-progress') batchStatsMap[b].inProgress += 1;
            else batchStatsMap[b].notStarted += 1;
        });

        // Most difficult labs based on error count
        const labErrorMap = {};
        const labTimeMap = {};
        rows.forEach(r => {
            if (!r.labId) return;
            const id = String(r.labId);
            labErrorMap[id] = (labErrorMap[id] || 0) + (r.errorsCount || 0);
            labTimeMap[id] = labTimeMap[id] || { totalTime: 0, count: 0 };
            labTimeMap[id].totalTime += Number(r.timeSpent || 0);
            labTimeMap[id].count += 1;
        });

        const difficultLabs = Object.entries(labErrorMap)
            .map(([labId, errorCount]) => ({ labId, errorCount }))
            .sort((a, b) => b.errorCount - a.errorCount)
            .slice(0, 10);

        const avgTimePerLab = Object.entries(labTimeMap)
            .map(([labId, t]) => ({ labId, averageTime: t.count ? Math.round(t.totalTime / t.count) : 0 }))
            .sort((a, b) => b.averageTime - a.averageTime);

        res.status(200).json({
            success: true,
            data: {
                batchCompletion: Object.values(batchStatsMap).sort((a, b) => (a.batch || '').localeCompare(b.batch || '')),
                difficultLabs,
                avgTimePerLab
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

