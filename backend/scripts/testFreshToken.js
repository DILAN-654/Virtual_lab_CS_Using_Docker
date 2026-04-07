const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

(async () => {
  require('dotenv').config();

  await mongoose.connect('mongodb://localhost:27017/virtual-lab-workbench');
  const student = await User.findOne({ username: 'student1' });
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  const token = jwt.sign({ id: student._id }, secret, { expiresIn: '7d' });
  console.log('Fresh token:', token);
  
  // Test it immediately
  const response = await fetch('http://localhost:5000/api/tasks?assignedToMe=true', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  console.log('API Status:', response.status);
  console.log('Tasks Count:', data.count);
  if (data.data && data.data.length > 0) {
    console.log('Sample task:', data.data[0].title);
    console.log('First 3 tasks:');
    data.data.slice(0, 3).forEach(task => {
      console.log(`  - ${task.title}`);
    });
  }
  process.exit(0);
})();
