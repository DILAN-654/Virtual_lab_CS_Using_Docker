// Simple test to verify backend connectivity
const axios = require('axios');

async function test() {
    console.log('Testing backend connection...\n');
    
    try {
        // Test health endpoint
        console.log('1. Testing /api/health...');
        const health = await axios.get('http://localhost:5000/api/health', { timeout: 5000 });
        console.log('✅ Health check passed:', health.data);
        
        // Test login
        console.log('\n2. Testing /api/auth/login...');
        const login = await axios.post('http://localhost:5000/api/auth/login', {
            username: 'student1',
            password: 'student123'
        }, { timeout: 5000 });
        
        if (login.data.token) {
            console.log('✅ Login successful!');
            console.log('   Token:', login.data.token.substring(0, 30) + '...');
            console.log('   User:', login.data.user?.username);
            
            // Test authenticated endpoint
            console.log('\n3. Testing authenticated endpoint /api/labs...');
            const labs = await axios.get('http://localhost:5000/api/labs', {
                headers: {
                    'Authorization': `Bearer ${login.data.token}`
                },
                timeout: 5000
            });
            console.log('✅ Labs endpoint working!');
            console.log('   Found', labs.data.count || labs.data.data?.length || 0, 'labs');
        } else {
            console.log('❌ Login failed - no token received');
            console.log('   Response:', login.data);
        }
        
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log('❌ Connection refused - Backend not running on port 5000');
            console.log('   Start backend with: npm start');
        } else if (error.code === 'ETIMEDOUT') {
            console.log('❌ Request timed out - Backend may be slow to start');
        } else {
            console.log('❌ Error:', error.message);
            if (error.response) {
                console.log('   Status:', error.response.status);
                console.log('   Data:', JSON.stringify(error.response.data, null, 2));
            }
        }
        process.exit(1);
    }
}

test();

