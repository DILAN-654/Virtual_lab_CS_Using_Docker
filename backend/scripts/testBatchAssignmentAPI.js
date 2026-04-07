/**
 * Test Batch Assignment API Endpoints
 * 
 * Tests the new API endpoints:
 * - POST /api/assigned-tasks/batch - Assign to specific batch
 * - POST /api/assigned-tasks/all - Assign to all students
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';
let adminToken = null;
let testData = {};

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

function log(type, message) {
    const prefix = {
        success: `${colors.green}✅${colors.reset}`,
        error: `${colors.red}❌${colors.reset}`,
        info: `${colors.blue}ℹ️${colors.reset}`,
        warn: `${colors.yellow}⚠️${colors.reset}`
    }[type] || '➜';
    console.log(`${prefix} ${message}`);
}

async function loginAsAdmin() {
    try {
        log('info', 'Logging in as admin...');
        const response = await axios.post(`${API_BASE}/auth/login`, {
            username: 'admin',
            password: 'admin123'
        });
        
        adminToken = response.data.data.token;
        log('success', `Admin logged in (Token: ${adminToken.substring(0, 20)}...)`);
        return true;
    } catch (error) {
        log('error', `Login failed: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

async function getTasks() {
    try {
        log('info', 'Fetching tasks...');
        const response = await axios.get(`${API_BASE}/tasks`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        
        testData.tasks = response.data.data;
        log('success', `Found ${testData.tasks.length} tasks`);
        return testData.tasks.length > 0;
    } catch (error) {
        log('error', `Failed to fetch tasks: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

async function getLabs() {
    try {
        log('info', 'Fetching labs...');
        const response = await axios.get(`${API_BASE}/labs`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        
        testData.labs = response.data.data;
        log('success', `Found ${testData.labs.length} labs`);
        return testData.labs.length > 0;
    } catch (error) {
        log('error', `Failed to fetch labs: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

async function getStudents() {
    try {
        log('info', 'Fetching students...');
        const response = await axios.get(`${API_BASE}/users?role=student`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        
        testData.students = response.data.data;
        log('success', `Found ${testData.students.length} students`);
        
        // Get unique batches
        const batches = new Set(testData.students.map(s => s.batch).filter(Boolean));
        testData.batches = Array.from(batches);
        log('info', `Batches: ${testData.batches.length > 0 ? testData.batches.join(', ') : 'None assigned'}`);
        
        return testData.students.length > 0;
    } catch (error) {
        log('error', `Failed to fetch students: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

async function testAssignToBatch() {
    try {
        console.log(`\n${'='.repeat(60)}`);
        console.log('TEST 1: ASSIGN TASK TO BATCH');
        console.log('='.repeat(60));
        
        if (!testData.batches || testData.batches.length === 0) {
            log('warn', 'No batches available for testing. Skipping batch assignment test.');
            return false;
        }
        
        const batchName = testData.batches[0];
        const task = testData.tasks[0];
        const lab = testData.labs[0];
        
        log('info', `Assigning task "${task.title}" to batch "${batchName}"`);
        
        const response = await axios.post(
            `${API_BASE}/assigned-tasks/batch`,
            {
                taskId: task._id,
                batchName: batchName,
                labId: lab._id,
                deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                headers: { Authorization: `Bearer ${adminToken}` }
            }
        );
        
        const studentsInBatch = testData.students.filter(s => s.batch === batchName).length;
        log('success', `Assignment successful!`);
        log('info', `   - Students assigned: ${response.data.count}`);
        log('info', `   - Students in batch: ${studentsInBatch}`);
        log('info', `   - Message: ${response.data.message}`);
        
        // Verify assignment
        log('info', 'Verifying assignment...');
        const assignedTasks = await axios.get(`${API_BASE}/assigned-tasks`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        
        const thisAssignment = assignedTasks.data.data.filter(a => a.taskId._id === task._id);
        log('success', `Verified: ${thisAssignment.length} assignments found`);
        
        return true;
    } catch (error) {
        log('error', `Batch assignment failed: ${error.response?.data?.message || error.message}`);
        if (error.response?.data?.message === 'Task already assigned to one or more students in this batch') {
            log('info', 'Task already assigned to this batch (expected on repeat runs)');
            return true;
        }
        return false;
    }
}

async function testAssignToAll() {
    try {
        console.log(`\n${'='.repeat(60)}`);
        console.log('TEST 2: ASSIGN TASK TO ALL STUDENTS');
        console.log('='.repeat(60));
        
        const task = testData.tasks[1] || testData.tasks[0];
        const lab = testData.labs[0];
        
        log('info', `Assigning task "${task.title}" to ALL students (${testData.students.length} total)`);
        
        const response = await axios.post(
            `${API_BASE}/assigned-tasks/all`,
            {
                taskId: task._id,
                labId: lab._id,
                deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                headers: { Authorization: `Bearer ${adminToken}` }
            }
        );
        
        log('success', `Assignment successful!`);
        log('info', `   - Students assigned: ${response.data.count}`);
        log('info', `   - Message: ${response.data.message}`);
        
        return true;
    } catch (error) {
        log('error', `All assignment failed: ${error.response?.data?.message || error.message}`);
        if (error.response?.data?.message?.includes('already assigned')) {
            log('info', 'Task already assigned (expected on repeat runs)');
            return true;
        }
        return false;
    }
}

async function verifyStudentView() {
    try {
        console.log(`\n${'='.repeat(60)}`);
        console.log('TEST 3: VERIFY STUDENTS CAN SEE ASSIGNMENTS');
        console.log('='.repeat(60));
        
        // Login as a random student
        const randomStudent = testData.students[Math.floor(Math.random() * testData.students.length)];
        
        log('info', `Logging in as student: ${randomStudent.username}`);
        
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
            username: randomStudent.username,
            password: 'student123'
        });
        
        const studentToken = loginResponse.data.data.token;
        log('success', `Student logged in`);
        
        // Get assigned tasks
        log('info', 'Fetching assigned tasks for student...');
        const tasksResponse = await axios.get(`${API_BASE}/assigned-tasks`, {
            headers: { Authorization: `Bearer ${studentToken}` }
        });
        
        const assignedTasks = tasksResponse.data.data;
        log('success', `Student has ${assignedTasks.length} assigned tasks`);
        
        // Show task details
        if (assignedTasks.length > 0) {
            console.log('\n📋 Assigned Tasks:');
            assignedTasks.slice(0, 3).forEach((task, idx) => {
                console.log(`   ${idx + 1}. ${task.taskId.title} (Status: ${task.status})`);
            });
            if (assignedTasks.length > 3) {
                console.log(`   ... and ${assignedTasks.length - 3} more`);
            }
        }
        
        return assignedTasks.length > 0;
    } catch (error) {
        log('error', `Verification failed: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

async function getAssignmentStatistics() {
    try {
        console.log(`\n${'='.repeat(60)}`);
        console.log('STATISTICS');
        console.log('='.repeat(60));
        
        // This would need an admin endpoint to get stats
        log('info', 'Assignment data collected');
        log('info', `   - Total students in system: ${testData.students.length}`);
        log('info', `   - Batches: ${testData.batches.length}`);
        log('info', `   - Tasks: ${testData.tasks.length}`);
        
        return true;
    } catch (error) {
        log('error', `Statistics gathering failed: ${error.message}`);
        return false;
    }
}

async function runTests() {
    try {
        console.log('\n' + '='.repeat(60));
        console.log('BATCH ASSIGNMENT API TEST SUITE');
        console.log('='.repeat(60));
        
        // Prerequisites
        if (!(await loginAsAdmin())) {
            log('error', 'Cannot proceed without admin login');
            return;
        }
        
        if (!(await getTasks())) {
            log('error', 'Cannot proceed without tasks');
            return;
        }
        
        if (!(await getLabs())) {
            log('error', 'Cannot proceed without labs');
            return;
        }
        
        if (!(await getStudents())) {
            log('error', 'Cannot proceed without students');
            return;
        }
        
        // Run tests
        const test1 = await testAssignToBatch();
        const test2 = await testAssignToAll();
        const test3 = await verifyStudentView();
        await getAssignmentStatistics();
        
        // Summary
        console.log(`\n${'='.repeat(60)}`);
        console.log('TEST SUMMARY');
        console.log('='.repeat(60));
        console.log(`${test1 ? colors.green : colors.red}✓${colors.reset} Batch assignment`);
        console.log(`${test2 ? colors.green : colors.red}✓${colors.reset} All students assignment`);
        console.log(`${test3 ? colors.green : colors.red}✓${colors.reset} Student view verification`);
        
        if (test1 && test2 && test3) {
            log('success', 'All tests passed! Batch assignment feature is working correctly.');
        } else {
            log('warn', 'Some tests failed. Please check the output above.');
        }
        
        console.log('='.repeat(60) + '\n');
        
    } catch (error) {
        log('error', `Test suite error: ${error.message}`);
    }
}

// Run tests
runTests();
