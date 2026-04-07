// Seed script to create sample labs and tasks
require('dotenv').config();
const mongoose = require('mongoose');
const Lab = require('../models/Lab');
const Task = require('../models/Task');

async function seedLabsAndTasks() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/virtual-lab-workbench', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('Connected to MongoDB');

        // Get admin user
        const User = require('../models/User');
        const admin = await User.findOne({ role: 'admin' });
        if (!admin) {
            console.error('Admin user not found. Please run seedUsers.js first.');
            process.exit(1);
        }

        // Clear existing labs and tasks
        await Lab.deleteMany({});
        await Task.deleteMany({});
        console.log('Cleared existing labs and tasks');

        // Create sample labs
        const labs = await Lab.create([
            {
                name: 'Python Basics',
                description: 'Learn Python fundamentals',
                category: 'programming',
                difficulty: 'easy',
                template: {
                    dockerImage: 'virtual-lab/python-dev:latest',
                    environment: {
                        'PYTHONUNBUFFERED': '1'
                    },
                    resources: {
                        cpu: 1,
                        memory: '512MB',
                        storage: '5GB'
                    },
                    ports: [{ container: 8000, host: 8001 }]
                },
                assignedTo: [{ batch: '2024', assignToAll: false }],
                isActive: true,
                createdBy: admin._id
            },
            {
                name: 'Node.js Web Development',
                description: 'Build web applications with Node.js and Express',
                category: 'web-development',
                difficulty: 'medium',
                template: {
                    dockerImage: 'virtual-lab/node-dev:latest',
                    environment: {
                        'NODE_ENV': 'development'
                    },
                    resources: {
                        cpu: 2,
                        memory: '1GB',
                        storage: '10GB'
                    },
                    ports: [{ container: 3000, host: 3000 }]
                },
                assignedTo: [{ batch: '2024', assignToAll: false }],
                isActive: true,
                createdBy: admin._id
            },
            {
                name: 'Network Fundamentals',
                description: 'Network tools and configuration labs',
                category: 'networking',
                difficulty: 'medium',
                template: {
                    dockerImage: 'virtual-lab/network-minimal:latest',
                    environment: {},
                    resources: {
                        cpu: 1,
                        memory: '512MB',
                        storage: '2GB'
                    },
                    ports: []
                },
                assignedTo: [{ batch: '2024', assignToAll: false }],
                isActive: true,
                createdBy: admin._id
            }
        ]);;

        console.log(`Created ${labs.length} labs`);

        // Create sample tasks assigned to all students in batch 2024
        const tasks = await Task.create([
            {
                title: 'Python Hello World',
                description: 'Write a simple Python program that prints "Hello, Virtual Lab!"',
                labId: labs[0]._id,
                difficulty: 'easy',
                deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                assignedTo: [
                    {
                        batch: '2024',
                        assignToAll: false
                    }
                ],
                createdBy: admin._id,
                status: 'active',
                isImportant: false
            },
            {
                title: 'Create a REST API',
                description: 'Build a simple REST API with Express.js that handles CRUD operations',
                labId: labs[1]._id,
                difficulty: 'medium',
                deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
                assignedTo: [
                    {
                        batch: '2024',
                        assignToAll: false
                    }
                ],
                createdBy: admin._id,
                status: 'active',
                isImportant: true
            },
            {
                title: 'Neural Network Classification',
                description: 'Build and train a neural network for image classification',
                labId: labs[2]._id,
                difficulty: 'hard',
                deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
                assignedTo: [
                    {
                        batch: '2024',
                        assignToAll: false
                    }
                ],
                createdBy: admin._id,
                status: 'active',
                isImportant: false
            }
        ]);

        console.log(`Created ${tasks.length} tasks`);
        console.log('\nSeeding complete!');
        console.log('\nSample data:');
        console.log('- 3 Labs (Python, Node.js, TensorFlow)');
        console.log('- 3 Tasks assigned to batch 2024');
        console.log('- All students in batch 2024 (student1, student2) can see these tasks');
        
        process.exit(0);
    } catch (error) {
        console.error('Error seeding labs and tasks:', error);
        process.exit(1);
    }
}

seedLabsAndTasks();
