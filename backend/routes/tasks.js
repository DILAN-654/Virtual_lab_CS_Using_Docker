const express = require('express');
const router = express.Router();
const {
    getTasks,
    getTask,
    createTask,
    updateTask,
    deleteTask,
    submitTask,
    getSubmissions
} = require('../controllers/taskController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, getTasks);
router.get('/:id', protect, getTask);
router.post('/:id/submit', protect, submitTask);
router.get('/:id/submissions', protect, getSubmissions);

// Admin only routes
router.post('/', protect, authorize('admin'), createTask);
router.put('/:id', protect, authorize('admin'), updateTask);
router.delete('/:id', protect, authorize('admin'), deleteTask);

module.exports = router;

