const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        labId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Lab',
            default: null
        },
        taskId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Task',
            default: null
        },
        assignedTaskId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'AssignedTask',
            default: null
        },
        action: {
            type: String,
            required: true,
            trim: true
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    {
        timestamps: true
    }
);

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
