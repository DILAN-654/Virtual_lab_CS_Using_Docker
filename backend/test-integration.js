#!/usr/bin/env node

/**
 * Code Execution System - Integration Test
 * 
 * This script verifies that all components of the code execution
 * system are working together correctly.
 * 
 * Usage: node test-integration.js
 */

const http = require('http');
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

class CodeExecutionTester {
  constructor() {
    this.results = [];
    this.token = null;
    this.taskId = null;
  }

  log(msg, color = 'reset', indent = 0) {
    const prefix = '  '.repeat(indent);
    console.log(`${colors[color]}${prefix}${msg}${colors.reset}`);
  }

  async makeRequest(method, path, data = null, isBackend = true) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: isBackend ? 5000 : 8000,
        path,
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (this.token) {
        options.headers['Authorization'] = `Bearer ${this.token}`;
      }

      const req = (isBackend ? http : http).request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseData);
            resolve({
              status: res.statusCode,
              data: parsed,
              headers: res.headers
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              data: responseData,
              headers: res.headers
            });
          }
        });
      });

      req.on('error', reject);

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  async test() {
    this.log('\n🧪 Code Execution System - Integration Test\n', 'blue');

    let passed = 0;
    let failed = 0;

    // Test 1: Backend Health Check
    this.log('TEST 1: Backend Connectivity', 'cyan');
    try {
      const response = await this.makeRequest('GET', '/api/health', null, true);
      if (response.status === 200 || response.status === 404) {
        this.log('✓ Backend is running on port 5000', 'green', 1);
        passed++;
      } else {
        this.log(`✗ Backend returned status ${response.status}`, 'red', 1);
        failed++;
      }
    } catch (error) {
      this.log(`✗ Cannot reach backend: ${error.message}`, 'red', 1);
      failed++;
    }

    // Test 2: Frontend Server Check
    this.log('\nTEST 2: Frontend Server', 'cyan');
    try {
      const response = await this.makeRequest('GET', '/code-editor.html', null, false);
      if (response.status === 200) {
        this.log('✓ Frontend server is running on port 8000', 'green', 1);
        passed++;
      } else {
        this.log(`✗ Frontend returned status ${response.status}`, 'red', 1);
        failed++;
      }
    } catch (error) {
      this.log(`✗ Cannot reach frontend: ${error.message}`, 'red', 1);
      failed++;
    }

    // Test 3: Authentication
    this.log('\nTEST 3: Authentication', 'cyan');
    try {
      const response = await this.makeRequest('POST', '/api/auth/login', {
        username: 'student1',
        password: 'student123'
      }, true);

      if (response.status === 200 && response.data.success) {
        // Backend returns { success, token, user }. Older scripts might expect { data: { token } }.
        this.token = (response.data && (response.data.token || (response.data.data && response.data.data.token))) || null;
        this.log(`✓ Login successful (token: ${this.token.substring(0, 20)}...)`, 'green', 1);
        passed++;
      } else {
        this.log(`✗ Login failed: ${response.data.message}`, 'red', 1);
        failed++;
      }
    } catch (error) {
      this.log(`✗ Authentication failed: ${error.message}`, 'red', 1);
      failed++;
    }

    // Test 4: Get Assigned Tasks
    this.log('\nTEST 4: Get Assigned Tasks', 'cyan');
    try {
      const response = await this.makeRequest('GET', '/api/assigned-tasks', null, true);

      if (response.status === 200 && response.data.success) {
        const tasks = response.data.data;
        if (tasks.length > 0) {
          this.taskId = tasks[0]._id;
          this.log(`✓ Found ${tasks.length} assigned task(s)`, 'green', 1);
          this.log(`  Using task: ${this.taskId.substring(0, 20)}...`, 'gray', 1);
          passed++;
        } else {
          this.log('⚠ No assigned tasks found', 'yellow', 1);
        }
      } else {
        this.log(`✗ Failed to get tasks: ${response.data.message}`, 'red', 1);
        failed++;
      }
    } catch (error) {
      this.log(`✗ Get tasks failed: ${error.message}`, 'red', 1);
      failed++;
    }

    // Test 5: Code Execution (Python)
    if (this.taskId) {
      this.log('\nTEST 5: Code Execution (Python)', 'cyan');
      try {
        const response = await this.makeRequest('POST', `/api/assigned-tasks/${this.taskId}/run`, {
          code: 'print("Hello, World!")',
          language: 'python',
          stdin: ''
        }, true);

        if (response.status === 200 && response.data.success) {
          const data = response.data.data;
          this.log(`✓ Code execution successful`, 'green', 1);
          this.log(`  stdout: "${data.stdout.trim()}"`, 'gray', 1);
          if (data.stderr) {
            this.log(`  stderr: "${data.stderr.trim()}"`, 'gray', 1);
          }
          passed++;
        } else {
          this.log(`✗ Code execution failed: ${response.data.message}`, 'red', 1);
          failed++;
        }
      } catch (error) {
        this.log(`✗ Code execution error: ${error.message}`, 'red', 1);
        failed++;
      }
    }

    // Test 6: Code with Input
    if (this.taskId) {
      this.log('\nTEST 6: Code Execution with Input', 'cyan');
      try {
        const response = await this.makeRequest('POST', `/api/assigned-tasks/${this.taskId}/run`, {
          code: 'x = input()\nprint(f"You entered: {x}")',
          language: 'python',
          stdin: 'test123'
        }, true);

        if (response.status === 200 && response.data.success) {
          this.log(`✓ Code with input executed successfully`, 'green', 1);
          this.log(`  stdout: "${response.data.data.stdout.trim()}"`, 'gray', 1);
          passed++;
        } else {
          this.log(`✗ Input execution failed: ${response.data.message}`, 'red', 1);
          failed++;
        }
      } catch (error) {
        this.log(`✗ Input execution error: ${error.message}`, 'red', 1);
        failed++;
      }
    }

    // Test 7: Error Handling
    if (this.taskId) {
      this.log('\nTEST 7: Error Handling', 'cyan');
      try {
        const response = await this.makeRequest('POST', `/api/assigned-tasks/${this.taskId}/run`, {
          code: 'print(undefined_variable)',
          language: 'python',
          stdin: ''
        }, true);

        if (response.status === 200 && response.data.success) {
          const data = response.data.data;
          if (data.stderr) {
            this.log(`✓ Error properly captured in stderr`, 'green', 1);
            this.log(`  Error message: ${data.stderr.substring(0, 60)}...`, 'gray', 1);
            passed++;
          } else {
            this.log(`⚠ Code error not in stderr (exitCode: ${data.exitCode})`, 'yellow', 1);
          }
        } else {
          this.log(`✗ Error handling failed: ${response.data.message}`, 'red', 1);
          failed++;
        }
      } catch (error) {
        this.log(`✗ Error test failed: ${error.message}`, 'red', 1);
        failed++;
      }
    }

    // Results Summary
    this.log('\n' + '='.repeat(50), 'blue');
    this.log(`\n📊 Test Results: ${passed} passed, ${failed} failed\n`, passed > failed ? 'green' : 'red');

    if (failed === 0 && passed >= 5) {
      this.log('✅ All tests passed! Code execution system is working!', 'green');
      this.log('\nYou can now:', 'blue');
      this.log('1. Open http://localhost:8000/login.html', 'cyan', 1);
      this.log('2. Login with student1/student123', 'cyan', 1);
      this.log('3. Click a task to open code editor', 'cyan', 1);
      this.log('4. Write code and click Run', 'cyan', 1);
      this.log('5. See output in Output tab!', 'cyan', 1);
    } else if (passed > 0) {
      this.log('⚠️  Some tests failed. Check details above.', 'yellow');
      this.log('\nCommon issues:', 'yellow');
      this.log('• Backend not running: npm start (in backend folder)', 'gray', 1);
      this.log('• Frontend not running: python -m http.server 8000', 'gray', 1);
      this.log('• MongoDB not connected: Check backend logs', 'gray', 1);
      this.log('• No tasks assigned: Admin needs to create tasks first', 'gray', 1);
    } else {
      this.log('❌ Critical failure! No tests passed.', 'red');
      this.log('\nCheck:', 'red');
      this.log('• Is backend running on port 5000?', 'gray', 1);
      this.log('• Is MongoDB connected?', 'gray', 1);
      this.log('• Check backend logs for errors', 'gray', 1);
    }

    this.log('\n' + '='.repeat(50) + '\n', 'blue');
  }
}

// Run the test
const tester = new CodeExecutionTester();
tester.test().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
