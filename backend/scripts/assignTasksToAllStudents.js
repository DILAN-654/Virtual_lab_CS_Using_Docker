/**
 * Assign all tasks to all students
 * Bulk creates AssignedTask records for every student-task combination
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Task = require('../models/Task');
const Lab = require('../models/Lab');
const AssignedTask = require('../models/AssignedTask');
require('dotenv').config();

(async () => {
  try {
    console.log('⚙️  Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected\n');

    // Get all students, tasks, and a default lab
    const students = await User.find({ role: 'student' }).select('_id username');
    const tasks = await Task.find().select('_id title');
    const defaultLab = await Lab.findOne().select('_id name');

    console.log(`📊 Found: ${students.length} students, ${tasks.length} tasks, 1 lab\n`);

    if (students.length === 0 || tasks.length === 0 || !defaultLab) {
      console.error('❌ Missing required data: students, tasks, or lab');
      process.exit(1);
    }

    // Clear existing assignments
    console.log('🗑️  Clearing existing assignments...');
    const deleteResult = await AssignedTask.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} old assignments\n`);

    // Create assignments for all student-task combinations
    console.log('📝 Creating assignments...');
    let createdCount = 0;
    let skippedCount = 0;

    for (const student of students) {
      for (const task of tasks) {
        try {
          const assigned = await AssignedTask.create({
            taskId: task._id,
            studentId: student._id,
            labId: defaultLab._id,
            assignedBy: student._id, // Self-assigned for testing
            status: 'pending',
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
          });
          createdCount++;
        } catch (err) {
          if (err.code === 11000) {
            // Duplicate key error - task already assigned to this student
            skippedCount++;
          } else {
            console.error(`Error assigning task to ${student.username}:`, err.message);
          }
        }
      }
      
      // Progress indicator
      process.stdout.write(`\r  Processing: ${students.indexOf(student) + 1}/${students.length} students`);
    }

    console.log('\n\n✅ Assignment complete!');
    console.log(`   Created: ${createdCount} new assignments`);
    console.log(`   Skipped: ${skippedCount} (already assigned)`);
    console.log(`   Total: ${createdCount + skippedCount} assignments\n`);

    // Show sample
    console.log('📋 Sample: First 3 students\' assignments:');
    const sample = await AssignedTask.find()
      .populate('studentId', 'username')
      .populate('taskId', 'title')
      .limit(3);
    
    sample.forEach(at => {
      console.log(`   - ${at.studentId.username} → ${at.taskId.title}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
