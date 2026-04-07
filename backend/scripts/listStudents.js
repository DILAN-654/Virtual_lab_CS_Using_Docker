const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const students = await User.find({ role: 'student' }).select('username _id');
    console.log('📋 Students in database:');
    students.slice(0, 15).forEach((u, i) => {
      console.log(`  ${i+1}. ${u.username}`);
    });
    
    const totalStudents = await User.countDocuments({ role: 'student' });
    console.log(`\n📊 Total students: ${totalStudents}`);
    
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
