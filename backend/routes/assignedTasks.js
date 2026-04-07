const express = require('express');
const router = express.Router();
const {
    getAssignedTasks,
    getAssignedTask,
    assignTaskToStudent,
    assignTaskToBatch,
    assignTaskToAll,
    startAssignedTask,
    submitAssignedTask,
    gradeAssignedTask,
    deleteAssignedTask,
    runAssignedTask,
    getAssignedTaskSubmissionsAdmin
} = require('../controllers/assignedTaskController');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Multer storage that places files under backend/uploads/assigned-tasks/:assignedTaskId
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const assignedId = req.params.id || 'tmp';
        const dest = path.join(__dirname, '..', 'uploads', 'assigned-tasks', assignedId);
        fs.mkdirSync(dest, { recursive: true });
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}_${file.originalname}`);
    }
});

const upload = multer({ storage });
const { protect, authorize } = require('../middleware/auth');

// Student routes
router.get('/', protect, getAssignedTasks);
router.get('/:id', protect, getAssignedTask);
router.put('/:id/start', protect, startAssignedTask);
// accept files: csvFile (single) and files (array)
router.put('/:id/submit', protect, upload.fields([{ name: 'csvFile', maxCount: 1 }, { name: 'files', maxCount: 5 }]), submitAssignedTask);
router.post('/:id/run', protect, upload.fields([{ name: 'csvFile', maxCount: 1 }, { name: 'files', maxCount: 5 }]), runAssignedTask);

// Admin only routes
router.get('/admin/submissions', protect, authorize('admin'), getAssignedTaskSubmissionsAdmin);
router.post('/', protect, authorize('admin'), assignTaskToStudent);
router.post('/batch', protect, authorize('admin'), assignTaskToBatch);
router.post('/all', protect, authorize('admin'), assignTaskToAll);
router.put('/:id/grade', protect, authorize('admin'), gradeAssignedTask);
router.delete('/:id', protect, authorize('admin'), deleteAssignedTask);

module.exports = router;
