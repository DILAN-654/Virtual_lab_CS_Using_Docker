const si = require('systeminformation');
const { docker, testDockerConnection } = require('../config/dockerClient');
const Container = require('../models/Container');
const Lab = require('../models/Lab');
const LabTemplate = require('../models/LabTemplate');
const User = require('../models/User');
const { getRecentActivity } = require('./activityLogger');

const HISTORY_LIMIT = 12;

const history = {
    labels: [],
    activeContainers: [],
    cpuUsage: [],
    memoryUsage: [],
    storageUsage: []
};

let lastHistoryRecordedAt = 0;

function roundToSingleDecimal(value) {
    return Math.round(Number(value || 0) * 10) / 10;
}

function normalizeContainerStatus(statusValue) {
    const value = String(statusValue || '').toLowerCase();

    if (value.includes('up') || value === 'running') return 'running';
    if (value.includes('paused') || value === 'paused') return 'paused';
    if (
        value.includes('exited') ||
        value.includes('stopped') ||
        value.includes('dead') ||
        value === 'created'
    ) {
        return 'stopped';
    }

    return value || 'unknown';
}

function toStringId(value) {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (value._id) return String(value._id);
    if (value.id) return String(value.id);
    return String(value);
}

function getStudentDisplayName(user) {
    if (user?.profile?.firstName && user?.profile?.lastName) {
        return `${user.profile.firstName} ${user.profile.lastName}`;
    }

    return user?.username || 'Unknown Student';
}

function getDockerLabel(container, keys = []) {
    const labels = container?.Labels || {};
    for (const key of keys) {
        if (labels[key]) {
            return labels[key];
        }
    }
    return '';
}

function getDockerContainerName(container) {
    const names = Array.isArray(container?.Names) ? container.Names : [];
    const firstName = names[0] || '';
    return firstName.replace(/^\//, '') || container?.Image || 'Docker Container';
}

function buildContainerRecord(containerDoc, dockerContainer) {
    const containerId = dockerContainer?.Id || containerDoc?.containerId || '';
    const status = normalizeContainerStatus(
        dockerContainer?.State ||
        dockerContainer?.Status ||
        containerDoc?.status
    );
    const dockerImage = dockerContainer?.Image || containerDoc?.labId?.template?.dockerImage || '';
    const studentName = containerDoc?.userId
        ? getStudentDisplayName(containerDoc.userId)
        : getDockerLabel(dockerContainer, ['virtual-lab.studentName', 'studentName', 'owner']) || 'Unknown Student';
    const labName = containerDoc?.labId?.name ||
        getDockerLabel(dockerContainer, ['virtual-lab.labName', 'labName', 'taskName']) ||
        getDockerContainerName(dockerContainer);
    const createdAt = containerDoc?.createdAt || (dockerContainer?.Created ? new Date(dockerContainer.Created * 1000) : null);
    const startedAt = containerDoc?.startedAt || createdAt;
    const lastActivity = containerDoc?.lastAccessed || containerDoc?.updatedAt || startedAt || createdAt || null;

    return {
        id: containerDoc?._id || containerId,
        documentId: containerDoc?._id || null,
        containerId,
        dockerName: getDockerContainerName(dockerContainer),
        dockerImage,
        status,
        liveStatusText: dockerContainer?.Status || status,
        studentName,
        student: containerDoc?.userId || null,
        userId: containerDoc?.userId || null,
        labName,
        lab: containerDoc?.labId || null,
        labId: containerDoc?.labId || null,
        source: containerDoc ? 'tracked' : 'docker',
        lastActivity,
        startedAt,
        createdAt,
        updatedAt: containerDoc?.updatedAt || null,
        ports: containerDoc?.ports || dockerContainer?.Ports || []
    };
}

async function getSystemMetrics() {
    try {
        const [load, memory, fileSystems] = await Promise.all([
            si.currentLoad(),
            si.mem(),
            si.fsSize()
        ]);

        const diskTotals = (fileSystems || []).reduce(
            (accumulator, current) => {
                const size = Number(current.size || 0);
                const used = Number(current.used || 0);
                return {
                    size: accumulator.size + size,
                    used: accumulator.used + used
                };
            },
            { size: 0, used: 0 }
        );

        const cpuUsage = roundToSingleDecimal(load.currentLoad);
        const memoryUsage = memory.total
            ? roundToSingleDecimal((Number(memory.used || 0) / Number(memory.total)) * 100)
            : 0;
        const storageUsage = diskTotals.size
            ? roundToSingleDecimal((diskTotals.used / diskTotals.size) * 100)
            : 0;

        return {
            cpuUsage,
            memoryUsage,
            storageUsage,
            totalMemoryBytes: Number(memory.total || 0),
            usedMemoryBytes: Number(memory.used || 0),
            totalDiskBytes: diskTotals.size,
            usedDiskBytes: diskTotals.used
        };
    } catch (error) {
        return {
            cpuUsage: 0,
            memoryUsage: 0,
            storageUsage: 0,
            totalMemoryBytes: 0,
            usedMemoryBytes: 0,
            totalDiskBytes: 0,
            usedDiskBytes: 0,
            error: error.message
        };
    }
}

async function getDockerContainers() {
    try {
        return await docker.listContainers({ all: true });
    } catch (error) {
        return [];
    }
}

async function getEnrichedContainers() {
    const [containers, dockerContainers] = await Promise.all([
        Container.find()
            .populate('userId', 'username email profile.firstName profile.lastName')
            .populate('labId', 'name template category')
            .sort({ updatedAt: -1 })
            .lean(),
        getDockerContainers()
    ]);

    const dockerById = new Map(
        (dockerContainers || []).map((item) => [item.Id, item])
    );
    const trackedById = new Map(
        (containers || []).map((item) => [item.containerId, item])
    );
    const enriched = [];

    for (const dockerContainer of dockerContainers) {
        const trackedContainer = trackedById.get(dockerContainer.Id);
        enriched.push(buildContainerRecord(trackedContainer, dockerContainer));
    }

    for (const trackedContainer of containers) {
        if (dockerById.has(trackedContainer.containerId)) {
            continue;
        }

        enriched.push(buildContainerRecord(trackedContainer, null));
    }

    return enriched.sort((left, right) => {
        const leftTime = new Date(left.lastActivity || left.startedAt || left.createdAt || 0).getTime();
        const rightTime = new Date(right.lastActivity || right.startedAt || right.createdAt || 0).getTime();
        return rightTime - leftTime;
    });
}

function buildAlerts({ containers, summary }) {
    const alerts = [];
    const overloadThreshold = parseInt(process.env.MONITORING_CONTAINER_OVERLOAD_THRESHOLD || '10', 10);
    const idleMinutes = parseInt(process.env.MONITORING_IDLE_MINUTES || '20', 10);
    const idleCutoff = Date.now() - idleMinutes * 60 * 1000;

    if (summary.cpuUsage > 80) {
        alerts.push({
            level: 'danger',
            title: 'High CPU Usage',
            message: `CPU usage is ${summary.cpuUsage}%`
        });
    }

    if (summary.activeContainers > overloadThreshold) {
        alerts.push({
            level: 'warning',
            title: 'System Overload',
            message: `${summary.activeContainers} active containers are above the safe threshold`
        });
    }

    const idleContainers = containers.filter((container) => {
        if (container.status !== 'running') return false;
        const lastActivity = new Date(container.lastActivity || container.startedAt || 0).getTime();
        return lastActivity > 0 && lastActivity < idleCutoff;
    });

    if (idleContainers.length > 0) {
        alerts.push({
            level: 'info',
            title: 'Inactive sessions detected',
            message: `${idleContainers.length} running container(s) have been idle for more than ${idleMinutes} minutes`
        });
    }

    if (!summary.dockerConnected) {
        alerts.push({
            level: 'secondary',
            title: 'Docker Unavailable',
            message: 'Docker daemon is not reachable, so live container state may be stale'
        });
    }

    return alerts;
}

function updateHistory(summary) {
    const now = Date.now();
    if (now - lastHistoryRecordedAt < 2500) return;

    const label = new Date(now).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    history.labels.push(label);
    history.activeContainers.push(summary.activeContainers);
    history.cpuUsage.push(summary.cpuUsage);
    history.memoryUsage.push(summary.memoryUsage);
    history.storageUsage.push(summary.storageUsage);

    while (history.labels.length > HISTORY_LIMIT) history.labels.shift();
    while (history.activeContainers.length > HISTORY_LIMIT) history.activeContainers.shift();
    while (history.cpuUsage.length > HISTORY_LIMIT) history.cpuUsage.shift();
    while (history.memoryUsage.length > HISTORY_LIMIT) history.memoryUsage.shift();
    while (history.storageUsage.length > HISTORY_LIMIT) history.storageUsage.shift();

    lastHistoryRecordedAt = now;
}

function buildLabEnvironmentData(templates, labs, containers) {
    const labList = Array.isArray(labs) ? labs : [];
    const templateList = Array.isArray(templates) ? templates : [];
    const items = templateList.map((template) => ({
        id: template._id,
        name: template.name,
        description: template.description,
        dockerImage: template.dockerImage,
        category: template.category || 'other',
        isActive: Boolean(template.isActive),
        resources: template.resources || {}
    }));

    return items.map((item) => {
        const relatedLabs = labList.filter((lab) => {
            return String(lab.template?.dockerImage || '') === String(item.dockerImage || '');
        });
        const relatedLabIds = relatedLabs.map((lab) => toStringId(lab._id));
        const templateContainers = containers.filter((container) => {
            const containerLabId = toStringId(container.labId);
            return (
                (item.dockerImage && String(container.dockerImage || '') === String(item.dockerImage)) ||
                (containerLabId && relatedLabIds.includes(containerLabId))
            );
        });

        return {
            id: item.id,
            name: item.name,
            description: item.description,
            dockerImage: item.dockerImage || 'Not configured',
            cpu: Number(item.resources?.cpu || 1),
            memory: item.resources?.memory || '512MB',
            storage: item.resources?.storage || '5GB',
            category: item.category || 'other',
            isActive: Boolean(item.isActive),
            activeContainers: templateContainers.filter((container) => container.status === 'running').length,
            totalContainers: templateContainers.length,
            relatedLabIds,
            filterValue: item.dockerImage || toStringId(item.id)
        };
    });
}

function buildChartData() {
    return {
        containerUsage: {
            labels: [...history.labels],
            values: [...history.activeContainers]
        },
        resourceUtilization: {
            labels: [...history.labels],
            cpuUsage: [...history.cpuUsage],
            memoryUsage: [...history.memoryUsage],
            storageUsage: [...history.storageUsage]
        }
    };
}

function formatActivityAction(action) {
    const value = String(action || '').replace(/_/g, ' ').trim();
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Activity';
}

async function getMonitoringSnapshot() {
    const [usersCount, dockerConnected, metrics, containers, recentActivity, templates, labs] = await Promise.all([
        User.countDocuments(),
        testDockerConnection(),
        getSystemMetrics(),
        getEnrichedContainers(),
        getRecentActivity(10),
        LabTemplate.find().sort({ name: 1 }).lean(),
        Lab.find().sort({ name: 1 }).lean()
    ]);

    const activeContainers = containers.filter((container) => container.status === 'running').length;

    const summary = {
        activeContainers,
        totalUsers: usersCount,
        cpuUsage: metrics.cpuUsage,
        memoryUsage: metrics.memoryUsage,
        storageUsage: metrics.storageUsage,
        totalMemoryBytes: metrics.totalMemoryBytes,
        usedMemoryBytes: metrics.usedMemoryBytes,
        totalDiskBytes: metrics.totalDiskBytes,
        usedDiskBytes: metrics.usedDiskBytes,
        dockerConnected,
        lastUpdated: new Date().toISOString()
    };

    updateHistory(summary);

    return {
        summary,
        containers,
        alerts: buildAlerts({ containers, summary }),
        recentActivity: recentActivity.map((item) => ({
            id: item._id,
            studentName: item.userId?.profile?.firstName && item.userId?.profile?.lastName
                ? `${item.userId.profile.firstName} ${item.userId.profile.lastName}`
                : item.userId?.username || 'Unknown Student',
            labName: item.labId?.name || 'General Workspace',
            action: formatActivityAction(item.action),
            time: item.createdAt
        })),
        charts: buildChartData(),
        labEnvironments: buildLabEnvironmentData(templates, labs, containers)
    };
}

module.exports = {
    getMonitoringSnapshot
};
