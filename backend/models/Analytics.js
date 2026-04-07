const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    labId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lab'
    },
    taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task'
    },
    metrics: {
        timeSpent: {
            type: Number, // in seconds
            default: 0
        },
        completionStatus: {
            type: String,
            enum: ['not-started', 'in-progress', 'completed'],
            default: 'not-started'
        },
        score: {
            type: Number,
            default: 0
        },
        // NOTE: Do not use "type" as a nested field name in Mongoose schemas unless you wrap it,
        // because "type" is a reserved key for schema type declarations.
        errors: [{
            errorType: String,
            timestamp: Date
        }],
        actions: [{
            action: String,
            timestamp: Date
        }],
        executionAttempts: {
            type: Number,
            default: 0
        },
        runAttempts: {
            type: Number,
            default: 0
        }
    },
    sessionData: {
        startTime: Date,
        endTime: Date,
        duration: Number
    }
}, {
    timestamps: true
});

// Index for faster queries
analyticsSchema.index({ userId: 1, createdAt: -1 });
analyticsSchema.index({ labId: 1 });

module.exports = mongoose.model('Analytics', analyticsSchema);

