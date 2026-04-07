const express = require('express');
const http = require('http');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/database');
const {testDockerConnection }= require('./config/dockerClient');
const { initializeSocket } = require('./utils/socketManager');
const { startCleanupJob, startMonitoringBroadcast } = require('./jobs/containerCleanupJob');


// Load env vars
dotenv.config();

// Basic safety checks (avoid accidentally deploying with placeholder secrets)
if ((process.env.NODE_ENV || 'development') === 'production') {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'dev_secret_change_me') {
        console.error('JWT_SECRET is not configured (or is using the default placeholder). Refusing to start in production.');
        process.exit(1);
    }
}

// Connect to database
connectDB();

// Initialize express
const app = express();

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS - allow localhost and 127.0.0.1 (browsers treat them as different origins)
const defaultCorsOrigins = [
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
];
const envCorsOrigins = String(process.env.CORS_ORIGIN || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
const allowedCorsOrigins = envCorsOrigins.length ? envCorsOrigins : defaultCorsOrigins;

app.use(cors({
    origin: (origin, cb) => {
        // Allow non-browser requests (curl/postman) with no Origin header.
        if (!origin) return cb(null, true);
        return cb(null, allowedCorsOrigins.includes(origin));
    },
    credentials: true
}));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Root route
app.get('/', (req, res) => {
    res.send('API running');
});
// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/labs', require('./routes/labs'));
app.use('/api/containers', require('./routes/containers'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/assigned-tasks', require('./routes/assignedTasks'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/gamification', require('./routes/gamification'));
// Lab templates (catalog of available container templates)
app.use('/api/lab-templates', require('./routes/labTemplates'));

// Tools (language detection, etc.)
app.use('/api/tools', require('./routes/tools'));

// Admin monitoring
app.use('/api/monitoring', require('./routes/monitoring'));

// My Lab Files (student file storage)
app.use('/api/my-lab-files', require('./routes/myLabFiles'));

// Notifications
app.use('/api/notifications', require('./routes/notifications'));

// Code Execution (free editor and assigned tasks)
app.use('/api/code', require('./routes/codeExecution'));
app.use('/api/upload', require('./routes/upload'));

// Development-only debug routes (admin helpers)
if ((process.env.NODE_ENV || 'development') !== 'production') {
    app.use('/api/debug', require('./routes/debug'));
}

// Health check
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: err.message || 'Server Error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

initializeSocket(server, allowedCorsOrigins);
startCleanupJob();
startMonitoringBroadcast();

server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    // Test Docker connection asynchronously (non-blocking)
    testDockerConnection().catch(err => console.error('Docker test error:', err.message));
});


// Log unhandled promise rejections (do not exit - e.g. Docker unavailable should not kill server)
process.on('unhandledRejection', (err, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', err?.message || err);
});

module.exports = app;

