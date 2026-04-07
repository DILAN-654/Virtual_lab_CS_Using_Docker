const mongoose = require('mongoose');

const gamificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    points: {
        type: Number,
        default: 0
    },
    pointsHistory: [{
        points: Number,
        reason: String,
        meta: {
            labId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab' },
            taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
            assignedTaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'AssignedTask' }
        },
        createdAt: { type: Date, default: Date.now }
    }],
    level: {
        type: Number,
        default: 1
    },
    xp: {
        type: Number,
        default: 0
    },
    rank: {
        type: String,
        default: 'Beginner'
    },
    badges: [{
        badgeId: String,
        name: String,
        description: String,
        icon: String,
        earnedAt: Date
    }],
    achievements: [{
        achievementId: String,
        name: String,
        description: String,
        unlockedAt: Date
    }],
    stats: {
        labsCompleted: {
            type: Number,
            default: 0
        },
        labsStarted: {
            type: Number,
            default: 0
        },
        firstAttemptCompletions: {
            type: Number,
            default: 0
        },
        totalErrors: {
            type: Number,
            default: 0
        },
        perfectScores: {
            type: Number,
            default: 0
        },
        streakDays: {
            type: Number,
            default: 0
        },
        lastActivityDate: Date
    }
}, {
    timestamps: true
});

// Calculate rank based on level
gamificationSchema.methods.updateRank = function() {
    if (this.level >= 10) this.rank = 'Expert';
    else if (this.level >= 7) this.rank = 'Advanced';
    else if (this.level >= 4) this.rank = 'Intermediate';
    else this.rank = 'Beginner';
};

// Add XP and check level up
gamificationSchema.methods.addXP = function(points) {
    this.xp += points;
    const xpForNextLevel = this.level * 200;
    if (this.xp >= xpForNextLevel) {
        this.level += 1;
        this.xp = this.xp - xpForNextLevel;
        this.updateRank();
        return { leveledUp: true, newLevel: this.level };
    }
    this.updateRank();
    return { leveledUp: false, currentLevel: this.level };
};

// Add points with history
gamificationSchema.methods.addPoints = function(points, reason, meta = {}) {
    const p = Number(points) || 0;
    this.points += p;
    this.pointsHistory = this.pointsHistory || [];
    this.pointsHistory.push({ points: p, reason: reason || 'activity', meta });
    return { points: this.points };
};

module.exports = mongoose.model('Gamification', gamificationSchema);

