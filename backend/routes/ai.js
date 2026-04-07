const express = require('express');
const router = express.Router();
const {
    sendMessage,
    debugCode,
    getDockerHelp,
    explainInstructions
} = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

router.post('/chat', sendMessage);
router.post('/debug', debugCode);
router.post('/docker-help', getDockerHelp);
router.post('/explain', explainInstructions);
router.get('/status', require('../controllers/aiController').status);

module.exports = router;

