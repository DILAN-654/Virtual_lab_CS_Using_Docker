const mongoose = require('mongoose');

const assignedTaskSchema = new mongoose.Schema({
    taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        required: true
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    labId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lab',
        required: false
    },
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assignedAt: {
        type: Date,
        default: Date.now
    },
    deadline: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'in-progress', 'submitted', 'graded'],
        default: 'pending'
    },
    startedAt: Date,
    submittedAt: Date,
    gradedAt: Date,
    submission: {
        code: String,
        language: String,
        csvFile: String,  // For Python tasks with CSV uploads
        output: String,
        files: [{
            filename: String,
            path: String,
            uploadedAt: Date
        }]
    },
    grade: {
        type: Number,
        min: 0,
        max: 100
    },
    feedback: String,
    reviewDecision: {
        type: String,
        enum: ['approved', 'rejected']
    },
    completionPercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    }
}, {
    timestamps: true
});

// Index for quick lookups
assignedTaskSchema.index({ studentId: 1, status: 1 });
assignedTaskSchema.index({ taskId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('AssignedTask', assignedTaskSchema);
