const express = require('express');
const router = express.Router();
const { getMonitoringOverview } = require('../controllers/monitoringController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('admin'));

router.get('/overview', getMonitoringOverview);

module.exports = router;
