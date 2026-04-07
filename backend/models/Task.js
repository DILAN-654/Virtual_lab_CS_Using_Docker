const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    labId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lab'
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium'
    },
    deadline: {
        type: Date,
        required: true
    },
    isImportant: {
        type: Boolean,
        default: false
    },
    attachments: [{
        filename: String,
        path: String,
        uploadedAt: Date
    }],
    assignedTo: {
        type: [{
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            batch: String,
            section: String,
            assignToAll: {
                type: Boolean,
                default: false
            }
        }]
    },
    submissions: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        files: [{
            filename: String,
            path: String
        }],
        submittedAt: {
            type: Date,
            default: Date.now
        },
        grade: Number,
        feedback: String,
        status: {
            type: String,
            enum: ['submitted', 'graded', 'returned'],
            default: 'submitted'
        }
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'closed'],
        default: 'active'
    }
}, {
    timestamps: true
});

// When a Task is deleted, also remove any AssignedTask documents that reference it.
// Use post hooks for findOneAndDelete and remove to cover common deletion methods.
taskSchema.post('findOneAndDelete', async function(doc) {
    try {
        if (!doc) return;
        // Require here to avoid circular dependency at module load time
        const AssignedTask = require('./AssignedTask');
        await AssignedTask.deleteMany({ taskId: doc._id });
        // Optionally, could also clean up other references (submissions, files) here
    } catch (err) {
        // Log but don't throw from middleware
        console.error('Error cascading delete to AssignedTask for Task:', err);
    }
});

taskSchema.post('remove', async function(doc) {
    try {
        if (!doc) return;
        const AssignedTask = require('./AssignedTask');
        await AssignedTask.deleteMany({ taskId: doc._id });
    } catch (err) {
        console.error('Error cascading remove to AssignedTask for Task:', err);
    }
});

module.exports = mongoose.model('Task', taskSchema);

