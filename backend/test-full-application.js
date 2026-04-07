// Comprehensive test script for the Virtual Laboratory Application
require('dotenv').config();
const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';
let studentToken = null;
let adminToken = null;

// Test results tracker
const results = {
    passed: 0,
    failed: 0,
    tests: []
};

function logTest(name, passed, message = '') {
    results.tests.push({ name, passed, message });
    if (passed) {
        results.passed++;
        console.log(`✅ ${name}`);
    } else {
        results.failed++;
        console.log(`❌ ${name}: ${message}`);
    }
}

async function makeRequest(method, endpoint, data = null, token = null) {
    try {
        const config = {
            method,
            url: `${API_BASE}${endpoint}`,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        
        if (data) {
            config.data = data;
        }
        
        const response = await axios(config);
        return { success: true, data: response.data, status: response.status };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data || error.message,
            status: error.response?.status || 500
        };
    }
}

async function runTests() {
    console.log('🧪 Starting Comprehensive Application Tests...\n');
    console.log('='.repeat(60));
    
    // Test 1: Health Check
    console.log('\n1. Testing Health Endpoint...');
    const health = await makeRequest('GET', '/health');
    if (health.status === 0) {
        console.log('❌ Backend server is not running!');
        console.log('   Please start the backend: cd backend && npm start');
        process.exit(1);
    }
    logTest('Health Check', health.success && health.data.success, health.error?.message || JSON.stringify(health.error));
    
    // Test 2: Student Login
    console.log('\n2. Testing Student Authentication...');
    const studentLogin = await makeRequest('POST', '/auth/login', {
        username: 'student1',
        password: 'student123'
    });
    if (studentLogin.success && studentLogin.data.token) {
        studentToken = studentLogin.data.token;
        logTest('Student Login', true);
        console.log(`   Token received: ${studentToken.substring(0, 20)}...`);
    } else {
        logTest('Student Login', false, studentLogin.error?.message || 'No token received');
    }
    
    // Test 3: Admin Login
    console.log('\n3. Testing Admin Authentication...');
    const adminLogin = await makeRequest('POST', '/auth/login', {
        username: 'admin',
        password: 'admin123'
    });
    if (adminLogin.success && adminLogin.data.token) {
        adminToken = adminLogin.data.token;
        logTest('Admin Login', true);
        console.log(`   Token received: ${adminToken.substring(0, 20)}...`);
    } else {
        logTest('Admin Login', false, adminLogin.error?.message || 'No token received');
    }
    
    // Test 4: Get Current User (Student)
    console.log('\n4. Testing Get Current User (Student)...');
    if (studentToken) {
        const me = await makeRequest('GET', '/auth/me', null, studentToken);
        logTest('Get Current User', me.success && me.data.user, me.error?.message);
        if (me.success) {
            console.log(`   User: ${me.data.user.username} (${me.data.user.role})`);
        }
    } else {
        logTest('Get Current User', false, 'No student token available');
    }
    
    // Test 5: Get Labs
    console.log('\n5. Testing Get Labs...');
    if (studentToken) {
        const labs = await makeRequest('GET', '/labs', null, studentToken);
        logTest('Get Labs', labs.success && Array.isArray(labs.data.data), labs.error?.message);
        if (labs.success && labs.data.data) {
            console.log(`   Found ${labs.data.count || labs.data.data.length} labs`);
        }
    } else {
        logTest('Get Labs', false, 'No student token available');
    }
    
    // Test 6: Get Lab Templates
    console.log('\n6. Testing Get Lab Templates...');
    if (studentToken) {
        const templates = await makeRequest('GET', '/lab-templates', null, studentToken);
        logTest('Get Lab Templates', templates.success && Array.isArray(templates.data.data), templates.error?.message);
        if (templates.success && templates.data.data) {
            console.log(`   Found ${templates.data.count || templates.data.data.length} templates`);
        }
    } else {
        logTest('Get Lab Templates', false, 'No student token available');
    }
    
    // Test 7: Get Tasks (Student)
    console.log('\n7. Testing Get Tasks (Student)...');
    if (studentToken) {
        const tasks = await makeRequest('GET', '/tasks?assignedToMe=true', null, studentToken);
        logTest('Get Tasks', tasks.success && Array.isArray(tasks.data.data), tasks.error?.message);
        if (tasks.success && tasks.data.data) {
            console.log(`   Found ${tasks.data.count || tasks.data.data.length} tasks`);
        }
    } else {
        logTest('Get Tasks', false, 'No student token available');
    }
    
    // Test 8: Get Containers (Student)
    console.log('\n8. Testing Get Containers (Student)...');
    if (studentToken) {
        const containers = await makeRequest('GET', '/containers', null, studentToken);
        logTest('Get Containers', containers.success && Array.isArray(containers.data.data), containers.error?.message);
        if (containers.success && containers.data.data) {
            console.log(`   Found ${containers.data.count || containers.data.data.length} containers`);
        }
    } else {
        logTest('Get Containers', false, 'No student token available');
    }
    
    // Test 9: Get Analytics (Student)
    console.log('\n9. Testing Get Analytics (Student)...');
    if (studentToken) {
        const analytics = await makeRequest('GET', '/analytics', null, studentToken);
        logTest('Get Analytics', analytics.success, analytics.error?.message);
    } else {
        logTest('Get Analytics', false, 'No student token available');
    }
    
    // Test 10: Get Gamification (Student)
    console.log('\n10. Testing Get Gamification (Student)...');
    if (studentToken) {
        const gamification = await makeRequest('GET', '/gamification', null, studentToken);
        logTest('Get Gamification', gamification.success, gamification.error?.message);
    } else {
        logTest('Get Gamification', false, 'No student token available');
    }
    
    // Test 11: Admin - Get All Users
    console.log('\n11. Testing Admin - Get All Users...');
    if (adminToken) {
        const users = await makeRequest('GET', '/users', null, adminToken);
        logTest('Admin Get Users', users.success && Array.isArray(users.data.data), users.error?.message);
        if (users.success && users.data.data) {
            console.log(`   Found ${users.data.count || users.data.data.length} users`);
        }
    } else {
        logTest('Admin Get Users', false, 'No admin token available');
    }
    
    // Test 12: Admin - Get All Containers
    console.log('\n12. Testing Admin - Get All Containers...');
    if (adminToken) {
        const allContainers = await makeRequest('GET', '/containers/all', null, adminToken);
        logTest('Admin Get All Containers', allContainers.success && Array.isArray(allContainers.data.data), allContainers.error?.message);
        if (allContainers.success && allContainers.data.data) {
            console.log(`   Found ${allContainers.data.count || allContainers.data.data.length} containers`);
        }
    } else {
        logTest('Admin Get All Containers', false, 'No admin token available');
    }
    
    // Test 13: Test AI Service (if quota allows)
    console.log('\n13. Testing AI Service...');
    if (studentToken) {
        const aiTest = await makeRequest('POST', '/ai/chat', {
            message: 'Hello, this is a test message.',
            context: {}
        }, studentToken);
        // AI might fail due to quota, but we check if endpoint is accessible
        if (aiTest.status === 429) {
            logTest('AI Service Endpoint', true, 'Endpoint accessible (quota exceeded - expected)');
        } else if (aiTest.success) {
            logTest('AI Service', true, 'AI service working!');
        } else {
            logTest('AI Service', false, aiTest.error?.message || 'Unknown error');
        }
    } else {
        logTest('AI Service', false, 'No student token available');
    }
    
    // Test 14: Unauthorized Access Test
    console.log('\n14. Testing Unauthorized Access Protection...');
    const unauthorized = await makeRequest('GET', '/labs');
    logTest('Unauthorized Protection', !unauthorized.success && unauthorized.status === 401, 'Should reject requests without token');
    
    // Print Summary
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 TEST SUMMARY\n');
    console.log(`Total Tests: ${results.passed + results.failed}`);
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
    
    if (results.failed > 0) {
        console.log('\n❌ Failed Tests:');
        results.tests.filter(t => !t.passed).forEach(test => {
            console.log(`   - ${test.name}: ${test.message}`);
        });
    }
    
    console.log('\n' + '='.repeat(60));
    
    if (results.failed === 0) {
        console.log('\n🎉 All tests passed!');
        process.exit(0);
    } else {
        console.log('\n⚠️  Some tests failed. Review the output above.');
        process.exit(1);
    }
}

// Run tests
runTests().catch(error => {
    console.error('Test suite error:', error);
    process.exit(1);
});

