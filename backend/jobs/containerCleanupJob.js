const cron = require('node-cron');
const Container = require('../models/Container');
const dockerService = require('../utils/dockerService');
const { logActivity } = require('../utils/activityLogger');
const { getMonitoringSnapshot } = require('../utils/monitoringService');
const { emitMonitoringUpdate, getIO } = require('../utils/socketManager');

let cleanupTask = null;
let broadcastInterval = null;

async function cleanupInactiveContainers() {
    const idleMinutes = parseInt(process.env.AUTO_CLEANUP_IDLE_MINUTES || '30', 10);
    const cutoff = new Date(Date.now() - idleMinutes * 60 * 1000);

    const inactiveContainers = await Container.find({
        lastAccessed: { $lt: cutoff },
        status: { $in: ['running', 'paused', 'stopped', 'exited'] }
    }).populate('labId', 'name');

    if (inactiveContainers.length === 0) return;

    for (const container of inactiveContainers) {
        try {
            await dockerService.removeContainer(container.containerId);

            if (container.userId) {
                await logActivity({
                    userId: container.userId,
                    labId: container.labId?._id || container.labId || null,
                    action: 'auto_cleanup',
                    metadata: {
                        containerId: container.containerId,
                        idleMinutes
                    }
                });
            }
        } catch (error) {
            console.error(`[Cleanup] Failed to remove inactive container ${container.containerId}:`, error.message);
        }
    }
}

function startCleanupJob() {
    if (cleanupTask) return cleanupTask;

    cleanupTask = cron.schedule('*/5 * * * *', async () => {
        try {
            await cleanupInactiveContainers();
            const snapshot = await getMonitoringSnapshot();
            emitMonitoringUpdate(snapshot);
        } catch (error) {
            console.error('[Cleanup] Scheduled cleanup failed:', error.message);
        }
    });

    return cleanupTask;
}

function startMonitoringBroadcast() {
    if (broadcastInterval) return broadcastInterval;

    const intervalMs = parseInt(process.env.MONITORING_POLL_INTERVAL_MS || '4000', 10);

    broadcastInterval = setInterval(async () => {
        try {
            const io = getIO();
            const adminRoom = io?.sockets?.adapter?.rooms?.get('admin-monitoring');

            if (!adminRoom || adminRoom.size === 0) {
                return;
            }

            const snapshot = await getMonitoringSnapshot();
            emitMonitoringUpdate(snapshot);
        } catch (error) {
            console.error('[Monitoring Broadcast] Failed to emit update:', error.message);
        }
    }, intervalMs);

    return broadcastInterval;
}

module.exports = {
    startCleanupJob,
    startMonitoringBroadcast
};
