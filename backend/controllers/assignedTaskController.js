const AssignedTask = require('../models/AssignedTask');
const Task = require('../models/Task');
const User = require('../models/User');
const runner = require('../utils/runner');
const { logActivity } = require('../utils/activityLogger');
const { createNotification } = require('./notificationController');

// @desc    Get all assigned tasks for a student
// @route   GET /api/assigned-tasks
// @access  Private/Student
exports.getAssignedTasks = async (req, res) => {
    try {
        const { status, labId } = req.query;
        const userId = req.user.id;
        
        const query = { studentId: userId };
        if (status) query.status = status;
        if (labId) query.labId = labId;

        const assignedTasks = await AssignedTask.find(query)
            .populate('taskId', 'title description difficulty')
            .populate('labId', 'name description')
            .populate('assignedBy', 'username')
            .sort({ deadline: 1, createdAt: -1 });

        res.status(200).json({
            success: true,
            count: assignedTasks.length,
            data: assignedTasks
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get single assigned task
// @route   GET /api/assigned-tasks/:id
// @access  Private
exports.getAssignedTask = async (req, res) => {
    try {
        const assignedTask = await AssignedTask.findById(req.params.id)
            .populate('taskId')
            .populate('labId')
            .populate('studentId', 'username email batch section')
            .populate('assignedBy', 'username');

        if (!assignedTask) {
            return res.status(404).json({
                success: false,
                message: 'Assigned task not found'
            });
        }

        // Check authorization: student can only see their own, admin/teacher can see all
        if (req.user.role === 'student' && assignedTask.studentId._id.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this task'
            });
        }

        res.status(200).json({
            success: true,
            data: assignedTask
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Admin assigns task to student(s)
// @route   POST /api/assigned-tasks
// @access  Private/Admin
exports.assignTaskToStudent = async (req, res) => {
    try {
        const { taskId, studentIds, labId, deadline } = req.body;

        // Validate task exists
        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Ensure studentIds is an array
        const students = Array.isArray(studentIds) ? studentIds : [studentIds];

        // Create assigned task for each student
        const createdAssignments = await AssignedTask.insertMany(
            students.map(studentId => ({
                taskId,
                studentId,
                labId,
                assignedBy: req.user.id,
                deadline: deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Default 7 days
            }))
        );

        // Notify students
        try {
            const teacherName = (req.user && req.user.username) ? req.user.username : 'Admin';
            const dueText = deadline ? new Date(deadline).toLocaleString() : '7 days';
            await Promise.all(createdAssignments.map(a =>
                createNotification({
                    userId: a.studentId,
                    title: 'New Task Assigned',
                    message: `A new task has been assigned by ${teacherName}. Deadline: ${dueText}.`,
                    type: 'task',
                    meta: { taskId, assignedTaskId: a._id, labId }
                })
            ));
        } catch (e) {
            console.error('[Notifications] assignTaskToStudent:', e.message);
        }

        res.status(201).json({
            success: true,
            count: createdAssignments.length,
            data: createdAssignments
        });
    } catch (error) {
        // Handle duplicate key error
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

// @desc    Assign task to all students in a batch
// @route   POST /api/assigned-tasks/batch
// @access  Private/Admin
exports.assignTaskToBatch = async (req, res) => {
    try {
        const { taskId, batchName, labId, deadline } = req.body;

        // Validate task exists
        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Find all students in the batch
        const students = await User.find({
            batch: batchName,
            role: 'student',
            status: 'active'
        });

        if (students.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No active students found in batch: ${batchName}`
            });
        }

        // Create assigned task for each student in batch
        const createdAssignments = await AssignedTask.insertMany(
            students.map(student => ({
                taskId,
                studentId: student._id,
                labId,
                assignedBy: req.user.id,
                deadline: deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }))
        );

        res.status(201).json({
            success: true,
            count: createdAssignments.length,
            message: `Task assigned to ${createdAssignments.length} students in batch: ${batchName}`,
            data: {
                summary: {
                    taskId,
                    batchName,
                    totalStudentsAssigned: createdAssignments.length,
                    deadline: createdAssignments[0]?.deadline
                }
            }
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Task already assigned to one or more students in this batch'
            });
        }
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Assign task to ALL students in system
// @route   POST /api/assigned-tasks/all
// @access  Private/Admin
exports.assignTaskToAll = async (req, res) => {
    try {
        const { taskId, labId, deadline } = req.body;

        // Validate task exists
        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Find all active students
        const students = await User.find({
            role: 'student',
            status: 'active'
        });

        if (students.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No active students found in system'
            });
        }

        // Create assigned task for each student
        const createdAssignments = await AssignedTask.insertMany(
            students.map(student => ({
                taskId,
                studentId: student._id,
                labId,
                assignedBy: req.user.id,
                deadline: deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }))
        );

        res.status(201).json({
            success: true,
            count: createdAssignments.length,
            message: `Task assigned to all ${createdAssignments.length} students in system`,
            data: {
                summary: {
                    taskId,
                    totalStudentsAssigned: createdAssignments.length,
                    deadline: createdAssignments[0]?.deadline
                }
            }
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

// @desc    Student starts a task (mark as in-progress)
// @route   PUT /api/assigned-tasks/:id/start
// @access  Private
exports.startAssignedTask = async (req, res) => {
    try {
        const assignedTask = await AssignedTask.findById(req.params.id);

        if (!assignedTask) {
            return res.status(404).json({
                success: false,
                message: 'Assigned task not found'
            });
        }

        // Authorization check
        if (assignedTask.studentId.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        assignedTask.status = 'in-progress';
        assignedTask.startedAt = new Date();
        await assignedTask.save();

        res.status(200).json({
            success: true,
            data: assignedTask
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Student submits task with code/files
// @route   PUT /api/assigned-tasks/:id/submit
// @access  Private
exports.submitAssignedTask = async (req, res) => {
    try {
        // incoming may be multipart/form-data (via multer) or JSON
        const assignedTask = await AssignedTask.findById(req.params.id);

        if (!assignedTask) {
            return res.status(404).json({
                success: false,
                message: 'Assigned task not found'
            });
        }

        // Authorization check
        if (assignedTask.studentId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        // Prevent multiple submissions per task per student (one-shot submission rule).
        // If you need resubmissions later, introduce an explicit "resubmissionAllowed" flow instead.
        if (assignedTask.status === 'submitted' || assignedTask.status === 'graded' || assignedTask.submittedAt) {
            return res.status(400).json({
                success: false,
                message: 'Lab already submitted'
            });
        }

        // Collect submission fields from either req.body (JSON) or multer-managed req.files
        const code = req.body.code || '';
        const language = req.body.language || 'python';
        const output = req.body.output || '';

        const submission = {
            code,
            language,
            csvFile: null,
            output,
            files: []
        };

        if (req.files) {
            if (req.files['csvFile'] && req.files['csvFile'][0]) {
                submission.csvFile = req.files['csvFile'][0].filename;
            }
            if (req.files['files']) {
                submission.files = req.files['files'].map(f => ({ filename: f.filename, path: f.path, uploadedAt: new Date() }));
            }
        }

        assignedTask.status = 'submitted';
        assignedTask.submittedAt = new Date();
        assignedTask.submission = submission;

        await assignedTask.save();

        // Notify admin/assigner
        try {
            await createNotification({
                userId: assignedTask.assignedBy,
                title: 'Task Submission Received',
                message: `A student has submitted an assigned task for review.`,
                type: 'submission',
                meta: { taskId: assignedTask.taskId, assignedTaskId: assignedTask._id, labId: assignedTask.labId }
            });
        } catch (e) {
            console.error('[Notifications] submitAssignedTask:', e.message);
        }

        res.status(200).json({
            success: true,
            message: 'Task submitted successfully',
            data: assignedTask
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Admin grades task
// @route   PUT /api/assigned-tasks/:id/grade
// @access  Private/Admin
exports.gradeAssignedTask = async (req, res) => {
    try {
        const { grade, feedback, decision } = req.body;
        const assignedTask = await AssignedTask.findById(req.params.id);

        if (!assignedTask) {
            return res.status(404).json({
                success: false,
                message: 'Assigned task not found'
            });
        }

        assignedTask.status = 'graded';
        assignedTask.grade = grade;
        assignedTask.feedback = feedback;
        if (decision === 'approved' || decision === 'rejected') {
            assignedTask.reviewDecision = decision;
        }
        assignedTask.gradedAt = new Date();
        await assignedTask.save();

        // Notify student
        try {
            await createNotification({
                userId: assignedTask.studentId,
                title: 'Task Graded',
                message: `Your submission has been graded. Score: ${grade}/100.`,
                type: 'grading',
                meta: { taskId: assignedTask.taskId, assignedTaskId: assignedTask._id, labId: assignedTask.labId }
            });
        } catch (e) {
            console.error('[Notifications] gradeAssignedTask:', e.message);
        }

        res.status(200).json({
            success: true,
            data: assignedTask
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Delete assigned task
// @route   DELETE /api/assigned-tasks/:id
// @access  Private/Admin
exports.deleteAssignedTask = async (req, res) => {
    try {
        const assignedTask = await AssignedTask.findByIdAndDelete(req.params.id);

        if (!assignedTask) {
            return res.status(404).json({
                success: false,
                message: 'Assigned task not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Assigned task deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Run code for assigned task (stubbed runner)
// @route   POST /api/assigned-tasks/:id/run
// @access  Private
exports.runAssignedTask = async (req, res) => {
    try {
        const assignedTask = await AssignedTask.findById(req.params.id).populate('taskId');
        if (!assignedTask) {
            return res.status(404).json({ success: false, message: 'Assigned task not found' });
        }

        // Authorization: only owner or admin
        if (req.user.role === 'student' && assignedTask.studentId.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const fs = require('fs');
        const path = require('path');

        const code = req.body.code || (assignedTask.submission && assignedTask.submission.code) || '';
        const language = req.body.language || (assignedTask.submission && assignedTask.submission.language) || 'python';
        const stdin = req.body.stdin || '';

        // If a CSV file was uploaded during submit, make it available for execution.
        // Strategy: copy it to a predictable filename in the same directory as the temp code file.
        // The runner currently executes from OS tmpdir; we inject the CSV contents via a small prelude.
        let finalCode = code;
        if (language.toLowerCase() === 'python') {
            // Prefer CSV from the current run if provided (multipart/form-data), else fallback to submission CSV.
            let csvPath = null;
            if (req.file && req.file.path) {
                csvPath = req.file.path;
            }
            if (!csvPath && req.files && req.files['csvFile'] && req.files['csvFile'][0] && req.files['csvFile'][0].path) {
                csvPath = req.files['csvFile'][0].path;
            }
            if (!csvPath) {
                const uploadedCsv = assignedTask.submission && assignedTask.submission.csvFile;
                if (uploadedCsv) {
                    const fallback = path.join(__dirname, '..', 'uploads', 'assigned-tasks', String(assignedTask._id), uploadedCsv);
                    if (fs.existsSync(fallback)) {
                        csvPath = fallback;
                    }
                }
            }

            if (csvPath && fs.existsSync(csvPath)) {
                const csvBase64 = fs.readFileSync(csvPath).toString('base64');
                const prelude = `import base64\nimport os\n_csv_b64 = "${csvBase64}"\nwith open('uploaded_file.csv','wb') as _f:\n    _f.write(base64.b64decode(_csv_b64))\n`;
                finalCode = prelude + '\n' + code;
            }
        }

        const result = await runner.runCode(finalCode, language, stdin);

        try {
            await logActivity({
                userId: req.user.id,
                labId: assignedTask.labId || null,
                taskId: assignedTask.taskId?._id || assignedTask.taskId || null,
                assignedTaskId: assignedTask._id,
                action: 'code_execution',
                metadata: {
                    language,
                    exitCode: result.exitCode,
                    hadError: Boolean(result.stderr)
                }
            });
        } catch (activityError) {
            console.error('[Activity] assignedTask run:', activityError.message);
        }

        res.status(200).json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Admin: list assigned task submissions (real submissions from AssignedTask)
// @route   GET /api/assigned-tasks/admin/submissions
// @access  Private/Admin
exports.getAssignedTaskSubmissionsAdmin = async (req, res) => {
    try {
        const { batch, taskId, status } = req.query;

        const query = {};
        if (taskId) query.taskId = taskId;
        if (status) query.status = status;
        else query.status = { $in: ['submitted', 'graded'] };

        const submissions = await AssignedTask.find(query)
            .populate('taskId', 'title difficulty')
            .populate('labId', 'name')
            .populate('studentId', 'username email batch section')
            .populate('assignedBy', 'username')
            .sort({ submittedAt: -1, createdAt: -1 });

        const filtered = batch
            ? submissions.filter(s => (s.studentId && String(s.studentId.batch || '') === String(batch)))
            : submissions;

        res.status(200).json({
            success: true,
            count: filtered.length,
            data: filtered
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
