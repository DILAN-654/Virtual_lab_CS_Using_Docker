/**
 * Test Language Detection API Endpoints
 */

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
    console.log('✅ Login successful\n');
    
    // Step 2: Test language detection API
    console.log('🔍 Testing Language Detection API...\n');
    
    const testCases = [
      { filename: 'hello.py', code: "print('Hello')" },
      { filename: 'Main.java', code: "System.out.println('Hello');" },
      { filename: 'prog.cpp', code: "#include <iostream>" },
      { filename: 'app.js', code: "console.log('Hello');" }
    ];
    
    for (const testCase of testCases) {
      const res = await axios.post(`${API_BASE}/tools/detect-language`, 
        testCase,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const data = res.data.data;
      console.log(`📄 ${testCase.filename}`);
      console.log(`   ✅ Detected: ${data.language}`);
      console.log(`   📊 Confidence: ${data.confidence}%`);
      console.log(`   🔧 Method: ${data.method}\n`);
    }
    
    // Step 3: Get supported languages
    console.log('📋 Supported Languages:');
    const langRes = await axios.get(`${API_BASE}/tools/supported-languages`);
    langRes.data.data.forEach(lang => {
      console.log(`   ✅ ${lang.name}: ${lang.extensions.join(', ')}`);
    });
    
    console.log('\n✅ All API tests passed!');
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
    }
    process.exit(1);
  }
})();
