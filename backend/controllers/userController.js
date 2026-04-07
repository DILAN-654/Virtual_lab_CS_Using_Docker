const User = require('../models/User');
const csv = require('csv-parser');
const fs = require('fs');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
    try {
        const { role, batch, section, status } = req.query;
        const query = {};

        if (role) query.role = role;
        if (batch) query.batch = batch;
        if (section) query.section = section;
        if (status) query.status = status;

        const users = await User.find(query).select('-password');

        res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Create user
// @route   POST /api/users
// @access  Private/Admin
exports.createUser = async (req, res) => {
    try {
        const user = await User.create(req.body);

        res.status(201).json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Bulk upload users from CSV
// @route   POST /api/users/bulk-upload
// @access  Private/Admin
exports.bulkUpload = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Please upload a CSV file'
            });
        }

        const users = [];

        // Read CSV file
        fs.createReadStream(req.file.path)
            .pipe(csv())
            .on('data', (row) => {
                users.push({
                    username: row.username || row.email,
                    email: row.email,
                    password: row.password || 'default123',
                    role: row.role || 'student',
                    batch: row.batch,
                    section: row.section,
                    profile: {
                        firstName: row.firstName,
                        lastName: row.lastName,
                        studentId: row.studentId
                    }
                });
            })
            .on('end', async () => {
                const results = {
                    created: [],
                    failed: []
                };

                try {
                    for (const userData of users) {
                        try {
                            const createdUser = await User.create(userData);
                            results.created.push({
                                id: createdUser._id,
                                username: createdUser.username,
                                email: createdUser.email
                            });
                        } catch (err) {
                            results.failed.push({
                                username: userData.username,
                                email: userData.email,
                                error: err.message
                            });
                        }
                    }

                    // Clean up uploaded file
                    fs.unlinkSync(req.file.path);

                    res.status(201).json({
                        success: true,
                        count: results.created.length,
                        created: results.created,
                        failedCount: results.failed.length,
                        failed: results.failed
                    });
                } catch (error) {
                    fs.unlinkSync(req.file.path);

                    res.status(500).json({
                        success: false,
                        message: error.message
                    });
                }
            });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Reset user password
// @route   PUT /api/users/:id/reset-password
// @access  Private/Admin
exports.resetPassword = async (req, res) => {
    try {
        const { newPassword } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        user.password = newPassword || 'default123';
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password reset successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

