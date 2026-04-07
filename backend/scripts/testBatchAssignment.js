/**
 * Test Batch Assignment Feature
 * 
 * This script tests the new batch assignment functionality:
 * 1. Assign task to a specific batch
 * 2. Assign task to all students
 * 3. Verify students in batch can see the task
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Task = require('../models/Task');
const AssignedTask = require('../models/AssignedTask');
const Lab = require('../models/Lab');

// Connect to MongoDB
async function connectDB() {
    try {
        await mongoose.connect('mongodb://localhost:27017/virtual_lab', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Connected to MongoDB');
    } catch (err) {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    }
}

async function testBatchAssignment() {
    try {
        console.log('\n🧪 BATCH ASSIGNMENT TEST\n');

        // Step 1: Check available batches
        console.log('📊 Step 1: Finding students and their batches...');
        const students = await User.find({ role: 'student', status: 'active' });
        const batches = [...new Set(students.map(s => s.batch).filter(Boolean))];
        
        console.log(`   Found ${students.length} students`);
        console.log(`   Batches: ${batches.length > 0 ? batches.join(', ') : 'None assigned'}`);
        
        if (batches.length === 0) {
            console.log('   ⚠️  No batches found. Assigning batches to students...');
            
            // Assign batches based on first letter of username
            for (let i = 0; i < students.length; i++) {
                const batchNum = Math.floor(i / 20) + 1; // 20 students per batch
                students[i].batch = `Batch-${batchNum}`;
                await students[i].save();
            }
            console.log('   ✅ Batches assigned');
            batches.push('Batch-1', 'Batch-2', 'Batch-3');
        }

        // Step 2: Get first available task and lab
        console.log('\n📝 Step 2: Getting test task and lab...');
        const task = await Task.findOne();
        const lab = await Lab.findOne();
        
        if (!task || !lab) {
            console.log('   ❌ No test task or lab found. Please seed database first.');
            return;
        }
        
        console.log(`   Task: ${task.title}`);
        console.log(`   Lab: ${lab.name}`);

        // Step 3: Get admin user for assignment
        console.log('\n👨‍💼 Step 3: Finding admin user...');
        const admin = await User.findOne({ role: 'admin' });
        if (!admin) {
            console.log('   ❌ No admin user found');
            return;
        }
        console.log(`   Admin: ${admin.username}`);

        // Step 4: Test batch assignment
        console.log('\n📌 Step 4: Testing batch assignment...');
        if (batches.length > 0) {
            const firstBatch = batches[0];
            const studentsInBatch = await User.find({ batch: firstBatch, role: 'student' });
            console.log(`   Assigning to batch "${firstBatch}" (${studentsInBatch.length} students)...`);
            
            // Delete any existing assignments for this batch
            await AssignedTask.deleteMany({
                taskId: task._id,
                studentId: { $in: studentsInBatch.map(s => s._id) }
            });
            
            // Create assignments
            const assignments = await AssignedTask.insertMany(
                studentsInBatch.map(student => ({
                    taskId: task._id,
                    studentId: student._id,
                    labId: lab._id,
                    assignedBy: admin._id,
                    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                }))
            );
            
            console.log(`   ✅ Created ${assignments.length} assignments for batch "${firstBatch}"`);
            
            // Verify each student can see the task
            console.log(`   📋 Verifying students see the task...`);
            let visibleCount = 0;
            for (let i = 0; i < Math.min(3, studentsInBatch.length); i++) {
                const student = studentsInBatch[i];
                const studentTasks = await AssignedTask.find({ studentId: student._id });
                if (studentTasks.some(t => t.taskId.toString() === task._id.toString())) {
                    console.log(`      ✅ ${student.username} can see the task`);
                    visibleCount++;
                } else {
                    console.log(`      ❌ ${student.username} cannot see the task`);
                }
            }
            console.log(`   ${visibleCount}/${Math.min(3, studentsInBatch.length)} sample students verified`);
        }

        // Step 5: Test assign to all
        console.log('\n🌍 Step 5: Testing assign to ALL students...');
        const newTask = await Task.findOne({ _id: { $ne: task._id } }) || task;
        const allStudents = await User.find({ role: 'student', status: 'active' });
        
        console.log(`   Preparing to assign to ${allStudents.length} students...`);
        
        // Delete existing assignments
        await AssignedTask.deleteMany({
            taskId: newTask._id
        });
        
        // Create assignments
        const allAssignments = await AssignedTask.insertMany(
            allStudents.map(student => ({
                taskId: newTask._id,
                studentId: student._id,
                labId: lab._id,
                assignedBy: admin._id,
                deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }))
        );
        
        console.log(`   ✅ Created ${allAssignments.length} assignments for all students`);
        
        // Verify
        console.log(`   📋 Verifying random students see the task...`);
        let randomVerified = 0;
        for (let i = 0; i < Math.min(3, allStudents.length); i++) {
            const randomIdx = Math.floor(Math.random() * allStudents.length);
            const student = allStudents[randomIdx];
            const studentTasks = await AssignedTask.find({ studentId: student._id });
            if (studentTasks.some(t => t.taskId.toString() === newTask._id.toString())) {
                console.log(`      ✅ ${student.username} can see the task`);
                randomVerified++;
            }
        }
        console.log(`   ${randomVerified}/3 random students verified`);

        // Final stats
        console.log('\n📊 FINAL STATISTICS');
        const totalAssignments = await AssignedTask.countDocuments();
        const uniqueStudents = (await AssignedTask.distinct('studentId')).length;
        const uniqueTasks = (await AssignedTask.distinct('taskId')).length;
        
        console.log(`   Total Assignments: ${totalAssignments}`);
        console.log(`   Unique Students: ${uniqueStudents}`);
        console.log(`   Unique Tasks: ${uniqueTasks}`);
        console.log(`   Avg assignments per student: ${(totalAssignments / uniqueStudents).toFixed(2)}`);

        console.log('\n✅ BATCH ASSIGNMENT TEST COMPLETED\n');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed\n');
    }
}

// Run the test
connectDB().then(testBatchAssignment);
