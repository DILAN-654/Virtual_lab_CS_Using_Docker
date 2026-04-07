const mongoose = require('mongoose');

const containerSchema = new mongoose.Schema({
    containerId: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    labId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lab',
        required: true
    },
    status: {
        type: String,
        enum: ['running', 'stopped', 'paused', 'exited'],
        default: 'stopped'
    },
    volumeName: {
        type: String
    },
    ports: [{
        container: Number,
        host: Number
    }],
    startedAt: {
        type: Date
    },
    lastAccessed: {
        type: Date,
        default: Date.now
    },
    snapshot: {
        data: mongoose.Schema.Types.Mixed,
        createdAt: Date
    }
}, {
    timestamps: true
});

// Update lastAccessed on save
containerSchema.pre('save', function(next) {
    if (this.isModified('status') && this.status === 'running') {
        this.lastAccessed = new Date();
    }
    next();
});

module.exports = mongoose.model('Container', containerSchema);

