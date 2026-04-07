const express = require('express');
const router = express.Router();
const {
    getAnalytics,
    trackActivity,
    getPerformanceStats,
    getStudentSummary,
    getAdminSummary
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', getAnalytics);
router.post('/track', trackActivity);
router.get('/stats', getPerformanceStats);
router.get('/student-summary', getStudentSummary);
router.get('/admin-summary', authorize('admin'), getAdminSummary);

module.exports = router;

