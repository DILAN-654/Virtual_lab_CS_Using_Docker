const ActivityLog = require('../models/ActivityLog');
const Container = require('../models/Container');

async function touchContainerActivity(userId, labId) {
    if (!userId || !labId) return;

    await Container.findOneAndUpdate(
        {
            userId,
            labId,
            status: { $in: ['running', 'paused', 'stopped', 'exited'] }
        },
        { lastAccessed: new Date() },
        { sort: { updatedAt: -1 } }
    );
}

async function logActivity({
    userId,
    labId = null,
    taskId = null,
    assignedTaskId = null,
    action,
    metadata = {}
}) {
    if (!userId || !action) return null;

    const entry = await ActivityLog.create({
        userId,
        labId: labId || undefined,
        taskId: taskId || undefined,
        assignedTaskId: assignedTaskId || undefined,
        action,
        metadata
    });

    if (labId) {
        await touchContainerActivity(userId, labId);
    }

    return entry;
}

async function getRecentActivity(limit = 10) {
    return ActivityLog.find()
        .populate('userId', 'username email profile.firstName profile.lastName')
        .populate('labId', 'name')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
}

module.exports = {
    getRecentActivity,
    logActivity,
    touchContainerActivity
};
