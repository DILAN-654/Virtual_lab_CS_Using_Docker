const Task = require('../models/Task');
const User = require('../models/User');
const AssignedTask = require('../models/AssignedTask');
const { createNotification } = require('./notificationController');

// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Private
exports.getTasks = async (req, res) => {
    try {
        const { status, difficulty, assignedToMe } = req.query;
        const query = {};

        if (status) query.status = status;
        if (difficulty) query.difficulty = difficulty;

        // If user wants only their tasks
        if (assignedToMe === 'true') {
            query.$or = [
                { 'assignedTo.userId': req.user.id },
                { 'assignedTo.0.assignToAll': true },  // assignToAll flag in first element
                { 'assignedTo.batch': req.user.batch },
                { 'assignedTo.section': req.user.section }
            ];
        }

        const tasks = await Task.find(query)
            .populate('labId', 'name description')
            .populate('createdBy', 'username email')
            .sort({ deadline: 1 });

        // Admin dashboard expects submissions count to reflect AssignedTask submissions (not legacy Task.submissions).
        // We only compute this extra aggregation for admin/faculty users to avoid unnecessary work for students.
        if (req.user && (req.user.role === 'admin' || req.user.role === 'faculty')) {
            const taskIds = tasks.map(t => t._id).filter(Boolean);
            const rows = taskIds.length
                ? await AssignedTask.aggregate([
                    { $match: { taskId: { $in: taskIds }, status: { $in: ['submitted', 'graded'] } } },
                    { $group: { _id: '$taskId', count: { $sum: 1 } } }
                ])
                : [];

            const countByTaskId = new Map(rows.map(r => [String(r._id), Number(r.count || 0)]));
            const data = tasks.map(t => {
                const obj = t.toObject({ virtuals: true });
                obj.assignedSubmissionCount = countByTaskId.get(String(t._id)) || 0;
                return obj;
            });

            return res.status(200).json({
                success: true,
                count: data.length,
                data
            });
        }

        res.status(200).json({
            success: true,
            count: tasks.length,
            data: tasks
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
exports.getTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id)
            .populate('labId')
            .populate('createdBy', 'username email');

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        res.status(200).json({
            success: true,
            data: task
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Create task (and AssignedTask records when assignedTo is set)
// @route   POST /api/tasks
// @access  Private/Admin
exports.createTask = async (req, res) => {
    try {
        req.body.createdBy = req.user.id;
        const task = await Task.create(req.body);

        // Create AssignedTask records when task has assignedTo entries
        const assignedTo = task.assignedTo || [];
        if (assignedTo.length > 0) {
            let students = [];
            for (const assignment of assignedTo) {
                if (assignment.assignToAll) {
                    const all = await User.find({ role: 'student', status: 'active' }).lean();
                    students.push(...all);
                } else if (assignment.batch || assignment.section) {
                    const filter = { role: 'student', status: 'active' };
                    if (assignment.batch) filter.batch = assignment.batch;
                    if (assignment.section) filter.section = assignment.section;
                    const batchStudents = await User.find(filter).lean();
                    students.push(...batchStudents);
                } else if (assignment.userId) {
                    const u = await User.findById(assignment.userId).lean();
                    if (u) students.push(u);
                }
            }
            // Deduplicate by _id
            const seen = new Set();
            students = students.filter(s => {
                const id = String(s._id);
                if (seen.has(id)) return false;
                seen.add(id);
                return true;
            });
            if (students.length > 0) {
                const deadline = task.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                const docs = students.map(s => ({
                    taskId: task._id,
                    studentId: s._id,
                    labId: task.labId || null,
                    assignedBy: req.user.id,
                    deadline,
                    status: 'pending'
                }));
                const created = await AssignedTask.insertMany(docs);
                // Notify students
                try {
                    const teacherName = (req.user && req.user.username) ? req.user.username : 'Admin';
                    const dueText = deadline ? new Date(deadline).toLocaleString() : '7 days';
                    for (const a of created) {
                        await createNotification({
                            userId: a.studentId,
                            title: 'New Task Assigned',
                            message: `A new task has been assigned by ${teacherName}. Deadline: ${dueText}.`,
                            type: 'task',
                            meta: { taskId: task._id, assignedTaskId: a._id, labId: task.labId }
                        });
                    }
                } catch (e) {
                    console.error('[Notifications] createTask assign:', e.message);
                }
            }
        }

        res.status(201).json({
            success: true,
            data: task
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Task already assigned to one or more students'
            });
        }
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private/Admin
exports.updateTask = async (req, res) => {
    try {
        const task = await Task.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        res.status(200).json({
            success: true,
            data: task
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private/Admin
exports.deleteTask = async (req, res) => {
    try {
        const task = await Task.findByIdAndDelete(req.params.id);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
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

// @desc    Submit task
// @route   POST /api/tasks/:id/submit
// @access  Private
exports.submitTask = async (req, res) => {
    try {
        const { files } = req.body;
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Check if already submitted
        const existingSubmission = task.submissions.find(
            sub => sub.userId.toString() === req.user.id.toString()
        );

        if (existingSubmission) {
            // Update existing submission
            existingSubmission.files = files;
            existingSubmission.submittedAt = new Date();
            existingSubmission.status = 'submitted';
        } else {
            // Create new submission
            task.submissions.push({
                userId: req.user.id,
                files,
                status: 'submitted'
            });
        }

        await task.save();

        res.status(200).json({
            success: true,
            message: 'Task submitted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get task submissions
// @route   GET /api/tasks/:id/submissions
// @access  Private
exports.getSubmissions = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id).populate('submissions.userId', 'username email');

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        res.status(200).json({
            success: true,
            count: task.submissions.length,
            data: task.submissions
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

