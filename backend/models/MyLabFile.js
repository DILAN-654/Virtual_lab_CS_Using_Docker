const mongoose = require('mongoose');

const MyLabFileSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    fileName: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    topic: {
        type: String,
        enum: ['basics', 'loops', 'functions', 'data-structures', 'oop', 'algorithms', 'web', 'other'],
        default: 'other'
    },
    code: {
        type: String,
        required: true
    },
    language: {
        type: String,
        enum: ['python', 'javascript', 'java', 'c', 'cpp'],
        required: true
    },
    type: {
        type: String,
        enum: ['free-lab', 'assigned-task'],
        default: 'free-lab'
    },
    assignedTaskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AssignedTask',
        default: null
    },
    output: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['draft', 'completed', 'submitted'],
        default: 'draft'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Index for faster queries
MyLabFileSchema.index({ studentId: 1, createdAt: -1 });
MyLabFileSchema.index({ studentId: 1, topic: 1 });
MyLabFileSchema.index({ studentId: 1, type: 1 });
MyLabFileSchema.index({ studentId: 1, fileName: 1, type: 1, assignedTaskId: 1 });

module.exports = mongoose.model('MyLabFile', MyLabFileSchema);
