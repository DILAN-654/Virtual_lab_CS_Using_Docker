// Test file for Google Gemini AI Integration
// Location: backend/test-gemini.js
// Run: node test-gemini.js

const axios = require('axios');
require('dotenv').config();

const API_BASE = 'http://localhost:5000/api';
let authToken = null;

console.log('🧪 Testing Google Gemini AI Integration\n');
console.log('Configuration:');
console.log(`  AI Provider: ${process.env.AI_PROVIDER}`);
console.log(`  Gemini API Key: ${process.env.GEMINI_API_KEY ? '✅ Set' : '❌ Missing'}`);
console.log(`  Gemini Model: ${process.env.GEMINI_MODEL}`);
console.log(`  OpenAI API Key: ${process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing'}\n`);

// Test user credentials
const testUser = {
    email: 'test@example.com',
    password: 'password123'
};

/**
 * Test 1: Login and get JWT token
 */
async function testLogin() {
    console.log('Test 1: Login 🔐');
    try {
        const response = await axios.post(`${API_BASE}/auth/login`, testUser);
        authToken = response.data.data.token;
        console.log('✅ Login successful');
        console.log(`   Token: ${authToken.substring(0, 20)}...\n`);
        return true;
    } catch (error) {
        console.log('❌ Login failed');
        if (error.response?.status === 401) {
            console.log('   Hint: Wrong credentials. Try signing up first.\n');
            return testSignup();
        }
        console.log(`   Error: ${error.message}\n`);
        return false;
    }
}

/**
 * Test 2: Signup (if login fails)
 */
async function testSignup() {
    console.log('Test 1b: Sign Up 📝');
    try {
        const response = await axios.post(`${API_BASE}/auth/signup`, {
            name: 'Test User',
            email: testUser.email,
            password: testUser.password,
            role: 'student'
        });
        authToken = response.data.data.token;
        console.log('✅ Signup successful');
        console.log(`   Token: ${authToken.substring(0, 20)}...\n`);
        return true;
    } catch (error) {
        console.log('❌ Signup failed');
        console.log(`   Error: ${error.response?.data?.message || error.message}\n`);
        return false;
    }
}

/**
 * Test 3: Check AI Status
 */
async function testAIStatus() {
    console.log('Test 2: Check AI Status 📊');
    try {
        const response = await axios.get(`${API_BASE}/ai/status`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const { provider, enabled, apiKey } = response.data.data;
        console.log(`✅ AI Status retrieved`);
        console.log(`   Provider: ${provider}`);
        console.log(`   Enabled: ${enabled}`);
        console.log(`   API Key: ${apiKey}\n`);
        return response.data.data;
    } catch (error) {
        console.log('❌ AI Status check failed');
        console.log(`   Error: ${error.response?.data?.message || error.message}\n`);
        return null;
    }
}

/**
 * Test 4: Chat with AI
 */
async function testChat() {
    console.log('Test 3: Chat with AI 💬');
    try {
        const message = 'What is Python and what can you do with it?';
        console.log(`   Question: "${message}"`);

        const response = await axios.post(`${API_BASE}/ai/chat`, 
            { message },
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );

        console.log('✅ Chat successful');
        console.log(`   Response (first 200 chars):\n   "${response.data.data.substring(0, 200)}..."\n`);
        return true;
    } catch (error) {
        console.log('❌ Chat failed');
        console.log(`   Error: ${error.response?.data?.message || error.message}\n`);
        return false;
    }
}

/**
 * Test 5: Explain Code
 */
async function testExplain() {
    console.log('Test 4: Explain Code 📖');
    try {
        const code = `def factorial(n):
    if n == 0:
        return 1
    return n * factorial(n-1)`;

        console.log(`   Code to explain:\n${code}\n`);

        const response = await axios.post(`${API_BASE}/ai/explain`,
            { instructions: code },
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );

        console.log('✅ Explain successful');
        console.log(`   Explanation (first 300 chars):\n   "${response.data.data.substring(0, 300)}..."\n`);
        return true;
    } catch (error) {
        console.log('❌ Explain failed');
        console.log(`   Error: ${error.response?.data?.message || error.message}\n`);
        return false;
    }
}

/**
 * Test 6: Debug Code
 */
async function testDebug() {
    console.log('Test 5: Debug Code 🐞');
    try {
        const code = `x = 10
y = 20
print(z)  # z is not defined`;

        console.log(`   Buggy code:\n${code}\n`);

        const response = await axios.post(`${API_BASE}/ai/debug`,
            { code, language: 'python' },
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );

        console.log('✅ Debug successful');
        console.log(`   Debug output (first 300 chars):\n   "${response.data.data.response?.substring(0, 300) || response.data.data.substring(0, 300)}..."\n`);
        return true;
    } catch (error) {
        console.log('❌ Debug failed');
        console.log(`   Error: ${error.response?.data?.message || error.message}\n`);
        return false;
    }
}

/**
 * Test 7: Docker Help
 */
async function testDockerHelp() {
    console.log('Test 6: Docker Help 🐳');
    try {
        const command = 'docker run';

        console.log(`   Docker command: "${command}"\n`);

        const response = await axios.post(`${API_BASE}/ai/docker-help`,
            { command },
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );

        console.log('✅ Docker help successful');
        console.log(`   Help (first 300 chars):\n   "${response.data.data.response?.substring(0, 300) || response.data.data.substring(0, 300)}..."\n`);
        return true;
    } catch (error) {
        console.log('❌ Docker help failed');
        console.log(`   Error: ${error.response?.data?.message || error.message}\n`);
        return false;
    }
}

/**
 * Run all tests
 */
async function runAllTests() {
    const results = {
        login: false,
        status: false,
        chat: false,
        explain: false,
        debug: false,
        docker: false
    };

    // Test 1: Login
    const loggedIn = await testLogin();
    if (!loggedIn) {
        console.log('⚠️  Skipping remaining tests (not authenticated)\n');
        return results;
    }
    results.login = true;

    // Test 2: AI Status
    const status = await testAIStatus();
    results.status = !!status;

    // Test 3-7: AI Features
    results.chat = await testChat();
    results.explain = await testExplain();
    results.debug = await testDebug();
    results.docker = await testDockerHelp();

    // Summary
    console.log('════════════════════════════════════════════');
    console.log('TEST SUMMARY 📋\n');
    console.log(`Login:         ${results.login ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`AI Status:     ${results.status ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Chat:          ${results.chat ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Explain:       ${results.explain ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Debug:         ${results.debug ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Docker Help:   ${results.docker ? '✅ PASS' : '❌ FAIL'}`);

    const passed = Object.values(results).filter(r => r).length;
    const total = Object.values(results).length;
    console.log(`\nTotal: ${passed}/${total} tests passed\n`);

    if (passed === total) {
        console.log('🎉 All tests passed! Gemini AI is working correctly!\n');
    } else {
        console.log('⚠️  Some tests failed. Check the errors above.\n');
    }
}

// Run tests
runAllTests().catch(console.error);
