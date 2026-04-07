const mongoose = require('mongoose');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const connectDB = async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/virtual-lab-workbench';
    const maxRetries = parseInt(process.env.MONGODB_CONNECT_RETRIES || '10', 10);
    const delayMs = parseInt(process.env.MONGODB_CONNECT_RETRY_DELAY_MS || '2000', 10);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const conn = await mongoose.connect(uri);
            console.log(`MongoDB Connected: ${conn.connection.host}`);
            return conn;
        } catch (error) {
            console.error(`MongoDB connection failed (attempt ${attempt}/${maxRetries}): ${error.message}`);
            if (attempt === maxRetries) {
                process.exit(1);
            }
            await sleep(delayMs);
        }
    }
};

module.exports = connectDB;

