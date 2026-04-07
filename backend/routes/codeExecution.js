const express = require('express');
const router = express.Router();
const runner = require('../utils/runner');
const { protect } = require('../middleware/auth');
const { logActivity } = require('../utils/activityLogger');

// @desc    Execute code (for free editor and assigned tasks)
// @route   POST /api/code/execute
// @access  Private
router.post('/execute', protect, async (req, res) => {
    try {
        const { code, language, stdin } = req.body;

        // Validate input
        if (!code || !language) {
            return res.status(400).json({
                success: false,
                message: 'code and language are required'
            });
        }

        // Run the code
        const result = await runner.runCode(code, language, stdin || '');

        try {
            await logActivity({
                userId: req.user.id,
                labId: req.body.labId || null,
                taskId: req.body.taskId || null,
                action: 'code_execution',
                metadata: {
                    language,
                    exitCode: result.exitCode,
                    hadError: Boolean(result.stderr)
                }
            });
        } catch (activityError) {
            console.error('[Activity] codeExecution:', activityError.message);
        }

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
