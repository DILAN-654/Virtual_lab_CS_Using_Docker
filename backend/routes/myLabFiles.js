const express = require('express');
const router = express.Router();
const {
    getMyLabFiles,
    getMyLabFile,
    createMyLabFile,
    updateMyLabFile,
    deleteMyLabFile,
    getFilesByTopic
} = require('../controllers/myLabFilesController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Get all my lab files
router.get('/', getMyLabFiles);

// Get files by topic
router.get('/topic/:topic', getFilesByTopic);

// Get single file
router.get('/:id', getMyLabFile);

// Create new file
router.post('/', createMyLabFile);

// Update file
router.put('/:id', updateMyLabFile);

// Delete file
router.delete('/:id', deleteMyLabFile);

module.exports = router;
