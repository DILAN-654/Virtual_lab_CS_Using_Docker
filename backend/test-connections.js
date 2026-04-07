// Test script to verify all connections
require('dotenv').config();
const mongoose = require('mongoose');
const { docker, testDockerConnection } = require('./config/dockerClient');

async function testConnections() {
    console.log('🔍 Testing Connections...\n');
    
    // Test MongoDB
    console.log('1. Testing MongoDB connection...');
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/virtual-lab-workbench', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 3000
        });
        console.log('   ✅ MongoDB Connected:', mongoose.connection.host);
        await mongoose.disconnect();
    } catch (error) {
        console.log('   ❌ MongoDB Error:', error.message);
    }
    
    // Test Docker
    console.log('\n2. Testing Docker connection...');
    const dockerOk = await testDockerConnection();
    if (dockerOk) {
        console.log('   ✅ Docker connection successful');
    } else {
        console.log('   ❌ Docker connection failed');
    }
    
    // Test Environment Variables
    console.log('\n3. Checking Environment Variables...');
    const required = ['PORT', 'MONGODB_URI', 'JWT_SECRET'];
    required.forEach(key => {
        if (process.env[key]) {
            console.log(`   ✅ ${key}: Set`);
        } else {
            console.log(`   ❌ ${key}: Missing`);
        }
    });
    
    console.log('\n✅ Connection tests completed!');
    process.exit(0);
}

testConnections().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});

