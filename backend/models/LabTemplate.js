const mongoose = require('mongoose');

const labTemplateSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    dockerImage: { type: String, required: true },
    defaultCommand: { type: [String], default: ['/bin/bash'] },
    category: { type: String, enum: ['programming','networking','database','machine-learning','web-development','other'], default: 'programming' },
    resources: {
        cpu: { type: Number, default: 1 },
        memory: { type: String, default: '512MB' },
        storage: { type: String, default: '2GB' }
    },
    ports: [{ container: Number, host: Number }],
    exampleFiles: [{ filePath: String, content: String }],
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('LabTemplate', labTemplateSchema);
