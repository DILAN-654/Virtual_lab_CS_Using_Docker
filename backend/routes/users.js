const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
    getUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    bulkUpload,
    resetPassword
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

// Configure multer for CSV upload
const upload = multer({
    dest: './uploads/',
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'));
        }
    }
});

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

router.route('/')
    .get(getUsers)
    .post(createUser);

router.route('/:id')
    .get(getUser)
    .put(updateUser)
    .delete(deleteUser);

router.post('/bulk-upload', upload.single('file'), bulkUpload);
router.put('/:id/reset-password', resetPassword);

module.exports = router;

