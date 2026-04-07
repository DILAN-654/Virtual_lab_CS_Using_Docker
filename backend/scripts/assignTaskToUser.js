const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Task = require('../models/Task');
const User = require('../models/User');
const AssignedTask = require('../models/AssignedTask');

dotenv.config();

async function assignTask({ username, taskTitle, taskId, labId, deadlineDays = 7 }) {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/virtual-lab-workbench';
    await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

    try {
        const user = await User.findOne({ username });
        if (!user) {
            console.error('User not found:', username);
            process.exit(1);
        }

        let task = null;
        if (taskId) {
            task = await Task.findById(taskId);
        } else if (taskTitle) {
            // Try exact match first
            task = await Task.findOne({ title: taskTitle });
            // If not found, try a case-insensitive partial match
            if (!task) {
                const candidates = await Task.find({ title: { $regex: taskTitle, $options: 'i' } }).limit(10);
                if (candidates.length === 1) {
                    task = candidates[0];
                } else if (candidates.length > 1) {
                    console.error('Multiple tasks match the provided title. Please use a more specific title or taskId.');
                    console.log('Matching tasks:');
                    candidates.forEach(t => console.log(`- ${t._id}: ${t.title}`));
                    process.exit(1);
                }
            }
        }

        if (!task) {
            console.error('Task not found. Provide taskId or a more specific taskTitle (use --list to see titles).');
            process.exit(1);
        }

        const lab = labId || task.labId;

        const existing = await AssignedTask.findOne({ taskId: task._id, studentId: user._id });
        if (existing) {
            console.log(`Task "${task.title}" is already assigned to ${username}.`);
            process.exit(0);
        }

        const at = await AssignedTask.create({
            taskId: task._id,
            studentId: user._id,
            labId: lab,
            assignedBy: user._id, // set to same user to indicate script action
            deadline: new Date(Date.now() + deadlineDays * 24 * 60 * 60 * 1000),
            status: 'pending'
        });

        console.log(`Assigned task "${task.title}" to ${username}. AssignedTask id: ${at._id}`);
        process.exit(0);
    } catch (err) {
        console.error('Error assigning task:', err);
        process.exit(1);
    }
}

// CLI support: node assignTaskToUser.js --username student1 --taskTitle "Python Array Manipulation"
if (require.main === module) {
    // Simple arg parsing to avoid external deps. Usage:
    // node assignTaskToUser.js --username student1 --taskTitle "Task Title"
    const argv = process.argv.slice(2);
    const args = {};
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a.startsWith('--')) {
            const key = a.replace(/^--/, '');
            const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true;
            args[key] = val;
            if (val !== true) i++;
        }
    }

    const username = args.username || args.u;
    const taskTitle = args.taskTitle || args.t;
    const taskId = args.taskId || args.id;
    const days = parseInt(args.days || args.deadline || '7', 10) || 7;
    const doList = args.list || args.l;

    if (doList) {
        // Connect and list tasks
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/virtual-lab-workbench';
        (async () => {
            await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
            const tasks = await Task.find({}).sort({ createdAt: -1 }).limit(100);
            console.log('Available tasks (id : title):');
            tasks.forEach(t => console.log(`${t._id} : ${t.title}`));
            process.exit(0);
        })();
        return;
    }

    if (!username || (!taskTitle && !taskId)) {
        console.error('Usage: node assignTaskToUser.js --username student1 --taskTitle "Task Title"');
        console.error('Or use --list to list available tasks.');
        process.exit(1);
    }

    assignTask({ username, taskTitle, taskId, deadlineDays: days });
}
