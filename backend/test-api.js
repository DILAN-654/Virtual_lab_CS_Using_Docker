#!/usr/bin/env node

/**
 * Test Code Execution API
 * 
 * Purpose: Verify the code execution endpoint is working
 * Usage: npm run test:api (or node test-api.js directly)
 * 
 * This script:
 * 1. Connects to the backend
 * 2. Authenticates with test student credentials
 * 3. Gets assigned tasks
 * 4. Tests code execution
 * 5. Reports results
 */

// Node.js 18+ provides a global fetch; avoid external dependency.
const fetchFn = typeof fetch === 'function' ? fetch : null;

const BASE_URL = 'http://localhost:5000/api';
let token = null;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

async function request(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    if (!fetchFn) {
      throw new Error('Global fetch is not available. Please use Node.js 18+ to run this script.');
    }

    const response = await fetchFn(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`${response.status}: ${data.message || 'Unknown error'}`);
    }

    return data;
  } catch (error) {
    throw error;
  }
}

async function runTests() {
  log('\n🧪 Code Execution API Test Suite\n', 'blue');

  try {
    // Step 1: Login
    log('Step 1: Authenticating...', 'blue');
    const loginRes = await request('/auth/login', 'POST', {
      username: 'student1',
      password: 'student123'
    });
    token = loginRes.token || (loginRes.data && loginRes.data.token) || null;
    const uname = (loginRes.user && loginRes.user.username) || (loginRes.data && loginRes.data.user && loginRes.data.user.username) || 'student1';
    log(`✓ Logged in as ${uname}`, 'green');

    // Step 2: Get assigned tasks
    log('\nStep 2: Fetching assigned tasks...', 'blue');
    const tasksRes = await request('/assigned-tasks');
    const tasks = tasksRes.data;
    
    if (!tasks || tasks.length === 0) {
      log('✗ No assigned tasks found', 'red');
      log('  Tip: Admin needs to assign tasks first', 'yellow');
      return;
    }

    log(`✓ Found ${tasks.length} assigned task(s)`, 'green');
    
    // Step 3: Test code execution
    const testTask = tasks[0];
    log(`\nStep 3: Testing code execution on task "${testTask._id.substring(0, 8)}..."`, 'blue');

    const testCases = [
      {
        name: 'Simple print',
        code: 'print("Hello, World!")',
        language: 'python',
        stdin: '',
        expectStdout: true
      },
      {
        name: 'Loop output',
        code: 'for i in range(3):\n    print(i)',
        language: 'python',
        stdin: '',
        expectStdout: true
      },
      {
        name: 'With input',
        code: 'x = input()\nprint(f"You entered: {x}")',
        language: 'python',
        stdin: 'test123',
        expectStdout: true
      }
    ];

    let passCount = 0;
    let failCount = 0;

    for (const testCase of testCases) {
      try {
        log(`\n  Testing: ${testCase.name}`, 'gray');
        const result = await request(`/assigned-tasks/${testTask._id}/run`, 'POST', {
          code: testCase.code,
          language: testCase.language,
          stdin: testCase.stdin
        });

        if (result.success && result.data) {
          log(`  ✓ Success`, 'green');
          log(`    stdout: "${result.data.stdout.substring(0, 60)}${result.data.stdout.length > 60 ? '...' : ''}"`, 'gray');
          if (result.data.stderr) {
            log(`    stderr: "${result.data.stderr.substring(0, 60)}${result.data.stderr.length > 60 ? '...' : ''}"`, 'red');
          }
          passCount++;
        } else {
          log(`  ✗ Failed: ${result.message}`, 'red');
          failCount++;
        }
      } catch (error) {
        log(`  ✗ Error: ${error.message}`, 'red');
        failCount++;
      }
    }

    // Summary
    log('\n' + '='.repeat(50), 'blue');
    log(`\n📊 Test Results: ${passCount} passed, ${failCount} failed\n`, 
      failCount === 0 ? 'green' : failCount === 1 ? 'yellow' : 'red');

    if (failCount === 0) {
      log('✅ All tests passed! Code execution is working correctly.', 'green');
    } else if (passCount > 0) {
      log('⚠️  Some tests failed. Check the output above.', 'yellow');
    } else {
      log('❌ All tests failed. Check backend logs.', 'red');
    }

  } catch (error) {
    log(`\n❌ Test failed: ${error.message}`, 'red');
    log('\nTroubleshooting:', 'yellow');
    log('• Is backend running on port 5000?', 'yellow');
    log('• Is MongoDB connected?', 'yellow');
    log('• Check backend logs for details', 'yellow');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  log(`Fatal error: ${error.message}`, 'red');
  process.exit(1);
});
