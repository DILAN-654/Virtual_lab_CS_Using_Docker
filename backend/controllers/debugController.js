const User = require('../models/User');
const Task = require('../models/Task');
const AssignedTask = require('../models/AssignedTask');

// @desc    Assign all active tasks to a specific user (admin-only, dev helper)
// @route   POST /api/debug/assign-all
// @access  Private/Admin
exports.assignAllToUser = async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) {
            return res.status(400).json({ success: false, message: 'Provide username in body' });
        }

        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const tasks = await Task.find({ status: 'active' });
        if (!tasks || tasks.length === 0) {
            return res.status(200).json({ success: true, message: 'No active tasks to assign' });
        }

        const created = [];
        for (const task of tasks) {
            const exists = await AssignedTask.findOne({ taskId: task._id, studentId: user._id });
            if (exists) continue;

            const at = await AssignedTask.create({
                taskId: task._id,
                studentId: user._id,
                labId: task.labId || null,
                assignedBy: req.user.id,
                deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                status: 'pending'
            });
            created.push(at);
        }

        res.status(201).json({ success: true, createdCount: created.length, createdIds: created.map(x => x._id) });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
