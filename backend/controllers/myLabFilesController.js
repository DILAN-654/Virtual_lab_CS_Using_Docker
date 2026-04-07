const MyLabFile = require('../models/MyLabFile');

const LANGUAGE_EXTENSIONS = {
    python: '.py',
    javascript: '.js',
    java: '.java',
    c: '.c',
    cpp: '.cpp'
};

function normalizeLanguageKey(language) {
    const raw = String(language || '').trim().toLowerCase();
    const compact = raw.replace(/\s+/g, '');

    if (!compact) return '';
    if (compact === 'python' || compact === 'py') return 'python';
    if (compact === 'javascript' || compact === 'js' || compact === 'node' || compact === 'node.js' || compact === 'nodejs' || compact === 'ecmascript') return 'javascript';
    if (compact === 'java') return 'java';
    if (compact === 'c') return 'c';
    if (compact === 'cpp' || compact === 'c++' || compact === 'cplusplus' || compact === 'g++') return 'cpp';
    return raw;
}

function ensureFileExtensionMatchesLanguage(fileName, language) {
    const normalizedLanguage = normalizeLanguageKey(language);
    const expectedExtension = LANGUAGE_EXTENSIONS[normalizedLanguage];
    const rawName = String(fileName || '').trim();

    if (!rawName || !expectedExtension) return rawName;

    const dotIndex = rawName.lastIndexOf('.');
    const baseName = dotIndex > 0 ? rawName.slice(0, dotIndex) : rawName;
    const safeBaseName = baseName.trim() || 'solution';

    return `${safeBaseName}${expectedExtension}`;
}

function buildFileIdentity(req, fileName, type, assignedTaskId = null) {
    return {
        studentId: req.user.id,
        fileName,
        type: type || 'free-lab',
        assignedTaskId: assignedTaskId || null
    };
}

// @desc    Get all my lab files for current user
// @route   GET /api/my-lab-files
// @access  Private
exports.getMyLabFiles = async (req, res) => {
    try {
        const files = await MyLabFile.find({ studentId: req.user.id })
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: files.length,
            data: files
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get single lab file
// @route   GET /api/my-lab-files/:id
// @access  Private
exports.getMyLabFile = async (req, res) => {
    try {
        const file = await MyLabFile.findById(req.params.id);

        if (!file) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }

        // Check authorization
        if (file.studentId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this file'
            });
        }

        res.status(200).json({
            success: true,
            data: file
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Create or update a lab file
// @route   POST /api/my-lab-files
// @access  Private
exports.createMyLabFile = async (req, res) => {
    try {
        const { fileName, description, topic, code, language, type, assignedTaskId, output, status } = req.body;

        // Validate required fields
        if (!fileName || !code || !language) {
            return res.status(400).json({
                success: false,
                message: 'fileName, code, and language are required'
            });
        }

        const normalizedLanguage = normalizeLanguageKey(language);
        if (!LANGUAGE_EXTENSIONS[normalizedLanguage]) {
            return res.status(400).json({
                success: false,
                message: `Unsupported language: ${language}`
            });
        }

        const normalizedFileName = ensureFileExtensionMatchesLanguage(fileName, normalizedLanguage);
        const fileIdentity = buildFileIdentity(req, normalizedFileName, type, assignedTaskId);
        const now = new Date();

        let file = await MyLabFile.findOne(fileIdentity);
        let created = false;

        if (file) {
            file.description = description !== undefined ? description : file.description;
            file.topic = topic || file.topic;
            file.code = code;
            file.language = normalizedLanguage;
            file.output = output !== undefined ? output : file.output;
            file.status = status || file.status;
            file.updatedAt = now;
        } else {
            created = true;
            file = new MyLabFile({
                ...fileIdentity,
                description,
                topic: topic || 'other',
                code,
                language: normalizedLanguage,
                output: output || '',
                status: status || 'draft',
                createdAt: now,
                updatedAt: now
            });
        }

        await file.save();

        res.status(created ? 201 : 200).json({
            success: true,
            message: created ? 'File saved successfully' : 'File updated successfully',
            data: file
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Update lab file
// @route   PUT /api/my-lab-files/:id
// @access  Private
exports.updateMyLabFile = async (req, res) => {
    try {
        let file = await MyLabFile.findById(req.params.id);

        if (!file) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }

        // Check authorization
        if (file.studentId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this file'
            });
        }

        // Update fields
        const { fileName, description, topic, code, language, output, status } = req.body;
        const normalizedLanguage = language ? normalizeLanguageKey(language) : file.language;

        if (language && !LANGUAGE_EXTENSIONS[normalizedLanguage]) {
            return res.status(400).json({
                success: false,
                message: `Unsupported language: ${language}`
            });
        }

        if (fileName) {
            file.fileName = ensureFileExtensionMatchesLanguage(fileName, normalizedLanguage);
        }
        if (description !== undefined) file.description = description;
        if (topic) file.topic = topic;
        if (code) file.code = code;
        if (language) file.language = normalizedLanguage;
        if (output !== undefined) file.output = output;
        if (status) file.status = status;
        file.updatedAt = new Date();

        await file.save();

        res.status(200).json({
            success: true,
            message: 'File updated successfully',
            data: file
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Delete lab file
// @route   DELETE /api/my-lab-files/:id
// @access  Private
exports.deleteMyLabFile = async (req, res) => {
    try {
        const file = await MyLabFile.findById(req.params.id);

        if (!file) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }

        // Check authorization BEFORE delete
        if (file.studentId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this file'
            });
        }

        await file.deleteOne();

        res.status(200).json({
            success: true,
            message: 'File deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get files by topic
// @route   GET /api/my-lab-files/topic/:topic
// @access  Private
exports.getFilesByTopic = async (req, res) => {
    try {
        const files = await MyLabFile.find({
            studentId: req.user.id,
            topic: req.params.topic
        }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: files.length,
            data: files
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
