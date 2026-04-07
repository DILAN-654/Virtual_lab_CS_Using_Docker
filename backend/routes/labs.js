const express = require('express');
const router = express.Router();
const {
    getLabs,
    getLab,
    createLab,
    updateLab,
    deleteLab,
    startLab,
    stopContainer,
    pauseContainer,
    resumeContainer,
    getContainerLogs,
    getContainerStatus
} = require('../controllers/labController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, getLabs);
router.get('/:id', protect, getLab);
router.post('/:id/start', protect, startLab);

// Container management routes
router.post('/:containerId/stop', protect, stopContainer);
router.post('/:containerId/pause', protect, pauseContainer);
router.post('/:containerId/resume', protect, resumeContainer);
router.get('/:containerId/logs', protect, getContainerLogs);
router.get('/:containerId/status', protect, getContainerStatus);

// Admin only routes
router.post('/', protect, authorize('admin'), createLab);
router.put('/:id', protect, authorize('admin'), updateLab);
router.delete('/:id', protect, authorize('admin'), deleteLab);

module.exports = router;

