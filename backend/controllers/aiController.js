const aiService = require('../utils/aiService');

// @desc    Send message to AI
// @route   POST /api/ai/chat
// @access  Private
exports.sendMessage = async (req, res) => {
    try {
        const { message, context } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a message'
            });
        }

        const response = await aiService.sendMessage(message, context || {});

        res.status(200).json({
            success: true,
            data: response  // Return response directly as string
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'AI service unavailable'
        });
    }
};

// @desc    Debug code
// @route   POST /api/ai/debug
// @access  Private
exports.debugCode = async (req, res) => {
    try {
        const { code, language } = req.body;

        if (!code) {
            return res.status(400).json({
                success: false,
                message: 'Please provide code to debug'
            });
        }

        const response = await aiService.debugCode(code, language || 'python');

        res.status(200).json({
            success: true,
            data: {
                response
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'AI service unavailable'
        });
    }
};

// @desc    Get Docker help
// @route   POST /api/ai/docker-help
// @access  Private
exports.getDockerHelp = async (req, res) => {
    try {
        const { command } = req.body;

        if (!command) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a Docker command'
            });
        }

        const response = await aiService.getDockerHelp(command);

        res.status(200).json({
            success: true,
            data: {
                response
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'AI service unavailable'
        });
    }
};

// @desc    Explain instructions
// @route   POST /api/ai/explain
// @access  Private
exports.explainInstructions = async (req, res) => {
    try {
        const { instructions } = req.body;

        if (!instructions) {
            return res.status(400).json({
                success: false,
                message: 'Please provide instructions to explain'
            });
        }

        const response = await aiService.explainInstructions(instructions);

        res.status(200).json({
            success: true,
            data: {
                response
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'AI service unavailable'
        });
    }
};

// @desc    AI service status
// @route   GET /api/ai/status
// @access  Private
exports.status = async (req, res) => {
    try {
        const aiService = require('../utils/aiService');
        const provider = aiService.currentProvider || process.env.AI_PROVIDER || 'openai';
        const keyPresent = aiService.apiKey === 'present';

        // If query param test=true, perform a lightweight ping to provider (may consume minimal quota)
        let testResult = null;
        if (keyPresent && req.query.test === '1') {
            try {
                const reply = await aiService.sendMessage('Health check: please reply with OK');
                testResult = { ok: true, reply };
            } catch (err) {
                testResult = { ok: false, message: err.message || 'provider error' };
            }
        }

        res.status(200).json({
            success: true,
            data: {
                provider,
                keyPresent,
                model: aiService.activeModel || null,
                primaryModel: aiService.primaryModel || null,
                backupModel: aiService.backupModel || null,
                test: testResult
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Unable to determine AI status' });
    }
};

