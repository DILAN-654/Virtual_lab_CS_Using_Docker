const express = require('express');
const router = express.Router();
const {
    startContainer,
    stopContainer,
    pauseContainer,
    resumeContainer,
    removeContainer,
    getContainerStatus,
    getContainerLogs,
    getUserContainers,
    createSnapshot,
    getAllContainers,
    adminStartContainer,
    adminStopContainer,
    adminRestartContainer,
    adminRemoveContainer,
    adminGetContainerLogs
} = require('../controllers/containerController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

router.get('/', getUserContainers);
router.get('/all', authorize('admin'), getAllContainers); // Admin only

// Admin-only control routes (can manage any container)
router.post('/:id/admin/start', authorize('admin'), adminStartContainer);
router.post('/:id/admin/stop', authorize('admin'), adminStopContainer);
router.post('/:id/admin/restart', authorize('admin'), adminRestartContainer);
router.delete('/:id/admin', authorize('admin'), adminRemoveContainer);
router.get('/:id/admin/logs', authorize('admin'), adminGetContainerLogs);

router.post('/start', startContainer);
router.post('/:id/stop', stopContainer);
router.post('/:id/pause', pauseContainer);
router.post('/:id/resume', resumeContainer);
router.delete('/:id', removeContainer);
router.get('/:id/status', getContainerStatus);
router.get('/:id/logs', getContainerLogs);
router.post('/:id/snapshot', createSnapshot);

module.exports = router;
