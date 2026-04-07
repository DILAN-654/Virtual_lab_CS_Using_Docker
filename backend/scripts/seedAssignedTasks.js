const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Task = require('../models/Task');
const User = require('../models/User');
const Lab = require('../models/Lab');
const AssignedTask = require('../models/AssignedTask');

dotenv.config();

async function seedAssignedTasks() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/virtual-lab-workbench', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('MongoDB connected for seeding...');

        // Get first student
        const student = await User.findOne({ role: 'student' }).lean();
        if (!student) {
            console.log('❌ No student found. Please create a student first.');
            await mongoose.connection.close();
            process.exit(1);
        }
        console.log(`✓ Found student: ${student.username}`);

        // Get first admin/teacher
        const admin = await User.findOne({ role: 'admin' }).lean();
        if (!admin) {
            console.log('❌ No admin found. Please create an admin first.');
            await mongoose.connection.close();
            process.exit(1);
        }
        console.log(`✓ Found admin: ${admin.username}`);

        // Get first lab
        const lab = await Lab.findOne().lean();
        if (!lab) {
            console.log('❌ No lab found. Please create a lab first.');
            await mongoose.connection.close();
            process.exit(1);
        }
        console.log(`✓ Found lab: ${lab.name}`);

        // Create some test tasks if they don't exist
        let task1 = await Task.findOne({ title: 'Python Array Manipulation' });
        if (!task1) {
            task1 = await Task.create({
                title: 'Python Array Manipulation',
                description: 'Write a Python program that takes a list of numbers and performs various array operations: sorting, filtering, and mapping.',
                difficulty: 'medium',
                deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                createdBy: admin._id,
                status: 'active'
            });
            console.log('Created task: Python Array Manipulation');
        }

        let task2 = await Task.findOne({ title: 'Data Processing with CSV' });
        if (!task2) {
            task2 = await Task.create({
                title: 'Data Processing with CSV',
                description: 'Read a CSV file, process the data, and output statistics (mean, median, standard deviation).',
                difficulty: 'hard',
                deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                createdBy: admin._id,
                status: 'active'
            });
            console.log('Created task: Data Processing with CSV');
        }

        let task3 = await Task.findOne({ title: 'Web Scraping Basics' });
        if (!task3) {
            task3 = await Task.create({
                title: 'Web Scraping Basics',
                description: 'Write a Python script to scrape a website and extract specific information using BeautifulSoup.',
                difficulty: 'easy',
                deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                createdBy: admin._id,
                status: 'active'
            });
            console.log('Created task: Web Scraping Basics');
        }

        // Assign tasks to student
        const existingAssignments = await AssignedTask.find({ studentId: student._id });
        if (existingAssignments.length === 0) {
            const assigned1 = await AssignedTask.create({
                taskId: task1._id,
                studentId: student._id,
                labId: lab._id,
                assignedBy: admin._id,
                deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                status: 'pending'
            });
            console.log(`✓ Assigned "${task1.title}" to ${student.username}`);

            const assigned2 = await AssignedTask.create({
                taskId: task2._id,
                studentId: student._id,
                labId: lab._id,
                assignedBy: admin._id,
                deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                status: 'pending'
            });
            console.log(`✓ Assigned "${task2.title}" to ${student.username}`);

            const assigned3 = await AssignedTask.create({
                taskId: task3._id,
                studentId: student._id,
                labId: lab._id,
                assignedBy: admin._id,
                deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                status: 'in-progress',
                startedAt: new Date()
            });
            console.log(`✓ Assigned "${task3.title}" to ${student.username} (in-progress)`);

            console.log('\n✅ Seeding completed successfully!');
            console.log(`Assigned ${existingAssignments.length + 3} tasks to student: ${student.username}`);
        } else {
            console.log(`\n📌 Tasks already assigned to ${student.username}. Skipping...`);
            console.log(`Found ${existingAssignments.length} existing assignments.`);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error seeding assigned tasks:', error);
        process.exit(1);
    }
}

seedAssignedTasks();
