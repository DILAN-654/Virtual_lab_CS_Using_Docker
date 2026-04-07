/**
 * Test Assigned Tasks for Multiple Users
 */

const axios = require('axios');
require('dotenv').config();

const API_BASE = 'http://localhost:5000/api';

async function testUserTasks(username, password) {
  try {
    console.log(`\n🔑 Testing ${username}...`);
    
    // Login
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      username,
      password
    });
    
    const token = loginRes.data.token;
    const userId = loginRes.data.user._id;
    console.log(`✅ Logged in. User ID: ${userId}`);
    
    // Get assigned tasks
    const tasksRes = await axios.get(`${API_BASE}/assigned-tasks`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`📋 Assigned tasks: ${tasksRes.data.count}`);
    if (tasksRes.data.data.length > 0) {
      tasksRes.data.data.slice(0, 2).forEach(task => {
        console.log(`   - ${task.taskId.title} (${task.status})`);
      });
    }
    
    return tasksRes.data.count;
    
  } catch (error) {
    if (error.response) {
      console.error(`❌ Error: ${error.response.status}`);
      console.error(JSON.stringify(error.response.data, null, 2));
    } else if (error.code === 'ECONNREFUSED') {
      console.error('❌ Cannot connect to server at http://localhost:5000');
    } else {
      console.error(`❌ Error: ${error.message}`);
      console.error(error.stack);
    }
    return 0;
  }
}

(async () => {
  try {
    console.log('🔍 Testing Assigned Tasks for Multiple Users\n');
    console.log('=' .repeat(50));
    
    // Test multiple students
    const testUsers = [
      { username: 'student1', password: 'student123' },
      { username: 'student2', password: 'student123' },
      { username: 'achinthya.m', password: 'student123' },
      { username: 'adeeksha.hk', password: 'student123' }
    ];
    
    let totalTasks = 0;
    for (const user of testUsers) {
      const count = await testUserTasks(user.username, user.password);
      totalTasks += count;
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`\n✅ Test Complete!`);
    console.log(`Total tasks across all users: ${totalTasks}`);
    console.log('\n💡 Each student should see 3 tasks (Python, REST API, Neural Network)');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
})();
