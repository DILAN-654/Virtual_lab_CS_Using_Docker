const express = require('express');
const router = express.Router();
const { assignAllToUser } = require('../controllers/debugController');
const { protect, authorize } = require('../middleware/auth');

// Admin-only helper route (development)
router.post('/assign-all', protect, authorize('admin'), assignAllToUser);

module.exports = router;
