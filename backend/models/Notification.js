const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['task', 'submission', 'grading', 'gamification', 'system'],
        default: 'system'
    },
    meta: {
        taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
        assignedTaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'AssignedTask' },
        labId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab' },
        points: Number,
        badgeId: String,
        level: Number,
        rank: String,
        event: String,
        section: String
    },
    readAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
