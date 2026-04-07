const mongoose = require('mongoose');

const labSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    template: {
        dockerImage: {
            type: String,
            required: true
        },
        dockerfile: String,
        environment: {
            type: Map,
            of: String
        },
        resources: {
            cpu: {
                type: Number,
                default: 1
            },
            memory: {
                type: String,
                default: '1GB'
            },
            storage: {
                type: String,
                default: '2GB'
            }
        },
        ports: [{
            container: Number,
            host: Number
        }]
    },
    category: {
        type: String,
        enum: ['programming', 'networking', 'database', 'machine-learning', 'web-development', 'other'],
        default: 'programming'
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium'
    },
    instructions: {
        type: String
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    assignedTo: [{
        batch: String,
        section: String,
        assignToAll: { type: Boolean, default: false }
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Lab', labSchema);

