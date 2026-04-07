const axios = require('axios');
require('dotenv').config();

const API_BASE = 'http://localhost:5000/api';

(async () => {
  try {
    console.log('🔑 Logging in as student1...');
    
    // Step 1: Login
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      username: 'student1',
      password: 'student123'
    });
    
    const token = loginRes.data.token;
    console.log('✅ Login successful. Token:', token.substring(0, 20) + '...');
    
    // Step 2: Get assigned tasks
    console.log('\n📋 Fetching assigned tasks...');
    const tasksRes = await axios.get(`${API_BASE}/assigned-tasks`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Response status:', tasksRes.status);
    console.log('Assigned tasks count:', tasksRes.data.count);
    console.log('Sample task:', JSON.stringify(tasksRes.data.data[0], null, 2).substring(0, 300) + '...');
    
    // Step 3: Test AI chat
    console.log('\n🤖 Testing AI chat...');
    const aiRes = await axios.post(`${API_BASE}/ai/chat`, {
      message: 'explain code about factorial'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('AI Response status:', aiRes.status);
    console.log('AI Response data type:', typeof aiRes.data.data);
    console.log('AI Response (first 200 chars):', JSON.stringify(aiRes.data.data).substring(0, 200));
    
    process.exit(0);
  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else if (error.code === 'ECONNREFUSED') {
      console.error('❌ Cannot connect to server at http://localhost:5000');
      console.error('   Make sure the backend server is running');
    } else {
      console.error('❌ Error:', error.message);
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
})();
