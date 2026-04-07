const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getMonitoringSnapshot } = require('./monitoringService');

let ioInstance = null;

function buildCorsOrigins(fallbackOrigins = []) {
    const envOrigins = String(process.env.CORS_ORIGIN || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

    return envOrigins.length > 0 ? envOrigins : fallbackOrigins;
}

function initializeSocket(server, fallbackOrigins = []) {
    if (ioInstance) return ioInstance;

    ioInstance = new Server(server, {
        cors: {
            origin: buildCorsOrigins(fallbackOrigins),
            credentials: true
        }
    });

    ioInstance.use(async (socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) return next();

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = await User.findById(decoded.id).select('role username');
            next();
        } catch (error) {
            next();
        }
    });

    ioInstance.on('connection', (socket) => {
        if (socket.user?.role === 'admin') {
            socket.join('admin-monitoring');
        }

        socket.on('monitoring:subscribe', async () => {
            if (socket.user?.role === 'admin') {
                socket.join('admin-monitoring');
                try {
                    const snapshot = await getMonitoringSnapshot();
                    socket.emit('monitoring:update', snapshot);
                } catch (error) {
                    console.error('[Socket] Failed to send initial monitoring snapshot:', error.message);
                }
            }
        });
    });

    return ioInstance;
}

function getIO() {
    return ioInstance;
}

function emitMonitoringUpdate(payload) {
    if (!ioInstance) return;
    ioInstance.to('admin-monitoring').emit('monitoring:update', payload);
}

module.exports = {
    emitMonitoringUpdate,
    getIO,
    initializeSocket
};
