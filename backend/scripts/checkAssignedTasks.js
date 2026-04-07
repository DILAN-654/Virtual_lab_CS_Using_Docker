const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Task = require('../models/Task');
const AssignedTask = require('../models/AssignedTask');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find student
    const student = await User.findOne({ username: 'student1' });
    if (!student) {
      console.log('❌ Student not found');
      process.exit(1);
    }
    console.log('✅ Found student:', student.username, '(ID:', student._id + ')');
    
    // Find their assigned tasks
    const assignedTasks = await AssignedTask.find({ studentId: student._id })
      .populate('taskId', 'title description')
      .sort({ createdAt: -1 });
    
    console.log(`\n📋 Found ${assignedTasks.length} assigned tasks:`);
    assignedTasks.forEach((at, idx) => {
      console.log(`\n  [${idx + 1}] Assigned Task ID: ${at._id}`);
      console.log(`      Status: ${at.status}`);
      console.log(`      Task: ${at.taskId ? at.taskId.title : 'NULL'}`);
      console.log(`      Task ID: ${at.taskId ? at.taskId._id : 'NULL'}`);
    });
    
    process.exit(0);
  } catch(e) {
    console.error('❌ Error:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
})();
