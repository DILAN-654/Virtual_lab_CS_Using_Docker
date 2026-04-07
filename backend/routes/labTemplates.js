const express = require('express');
const router = express.Router();
const { getLabTemplates, getLabTemplate, createLabTemplate, updateLabTemplate, deleteLabTemplate } = require('../controllers/labTemplateController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, getLabTemplates);
router.get('/:id', protect, getLabTemplate);

// Admin-only management endpoints
router.post('/', protect, authorize('admin'), createLabTemplate);
router.put('/:id', protect, authorize('admin'), updateLabTemplate);
router.delete('/:id', protect, authorize('admin'), deleteLabTemplate);

module.exports = router;
