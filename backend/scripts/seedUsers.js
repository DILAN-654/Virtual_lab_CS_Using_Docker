// Seed script to create test users
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function seedUsers() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/virtual-lab-workbench', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('Connected to MongoDB');

        // Delete existing users
        await User.deleteMany({});
        console.log('Cleared existing users');

        // Create test users
        const testUsers = [
            {
                username: 'admin',
                email: 'admin@example.com',
                password: 'admin123',
                role: 'admin',
                batch: '2024',
                section: 'A'
            },
            {
                username: 'student1',
                email: 'student1@example.com',
                password: 'student123',
                role: 'student',
                batch: '2024',
                section: 'A'
            },
            {
                username: 'student2',
                email: 'student2@example.com',
                password: 'student123',
                role: 'student',
                batch: '2024',
                section: 'B'
            }
        ];

        for (const userData of testUsers) {
            const user = await User.create({
                username: userData.username,
                email: userData.email,
                password: userData.password,  // User.pre('save') will hash this
                role: userData.role,
                batch: userData.batch,
                section: userData.section
            });
            console.log(`Created user: ${user.username} (${user.role})`);
        }

        console.log('Seeding complete!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding users:', error);
        process.exit(1);
    }
}

seedUsers();
