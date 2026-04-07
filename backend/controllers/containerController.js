const dockerService = require('../utils/dockerService');
const Container = require('../models/Container');
const Lab = require('../models/Lab');
const { getMonitoringSnapshot } = require('../utils/monitoringService');

function sendAdminContainerError(res, error) {
    if (error?.statusCode === 404 || /no such container/i.test(String(error?.message || ''))) {
        return res.status(404).json({
            success: false,
            message: 'Container not found'
        });
    }

    return res.status(500).json({
        success: false,
        message: error.message
    });
}

// @desc    Start a container
// @route   POST /api/containers/start
// @access  Private
exports.startContainer = async (req, res) => {
    try {
        const { labId } = req.body;
        const userId = req.user.id;

        // Get lab template
        const lab = await Lab.findById(labId);
        if (!lab) {
            return res.status(404).json({
                success: false,
                message: 'Lab not found'
            });
        }

        // Check if user already has a running container for this lab
        const existingContainer = await Container.findOne({
            userId,
            labId,
            status: { $in: ['running', 'paused'] }
        });

        if (existingContainer) {
            return res.status(400).json({
                success: false,
                message: 'You already have an active container for this lab',
                container: existingContainer
            });
        }

        // Start container
        const result = await dockerService.startContainer(
            userId,
            labId,
            lab.template
        );

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// @desc    Admin: Stop any container
// @route   POST /api/containers/:id/admin/stop
// @access  Private/Admin
exports.adminStopContainer = async (req, res) => {
    try {
        await dockerService.stopContainer(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Container stopped successfully'
        });
    } catch (error) {
        sendAdminContainerError(res, error);
    }
};

// @desc    Admin: Start any stopped container
// @route   POST /api/containers/:id/admin/start
// @access  Private/Admin
exports.adminStartContainer = async (req, res) => {
    try {
        await dockerService.startExistingContainer(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Container started successfully'
        });
    } catch (error) {
        sendAdminContainerError(res, error);
    }
};

// @desc    Admin: Restart any container
// @route   POST /api/containers/:id/admin/restart
// @access  Private/Admin
exports.adminRestartContainer = async (req, res) => {
    try {
        await dockerService.restartContainer(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Container restarted successfully'
        });
    } catch (error) {
        sendAdminContainerError(res, error);
    }
};

// @desc    Admin: Remove any container
// @route   DELETE /api/containers/:id/admin
// @access  Private/Admin
exports.adminRemoveContainer = async (req, res) => {
    try {
        await dockerService.removeContainer(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Container removed successfully'
        });
    } catch (error) {
        sendAdminContainerError(res, error);
    }
};

// @desc    Admin: Get logs for any container
// @route   GET /api/containers/:id/admin/logs
// @access  Private/Admin
exports.adminGetContainerLogs = async (req, res) => {
    try {
        const tail = req.query.tail ? parseInt(req.query.tail, 10) : 200;
        const logs = await dockerService.getContainerLogs(req.params.id, tail);

        res.status(200).json({ success: true, data: logs });
    } catch (error) {
        sendAdminContainerError(res, error);
    }
};

// @desc    Stop a container
// @route   POST /api/containers/:id/stop
// @access  Private
exports.stopContainer = async (req, res) => {
    try {
        const container = await Container.findOne({
            containerId: req.params.id,
            userId: req.user.id
        });

        if (!container) {
            return res.status(404).json({
                success: false,
                message: 'Container not found'
            });
        }

        await dockerService.stopContainer(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Container stopped successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Pause a container
// @route   POST /api/containers/:id/pause
// @access  Private
exports.pauseContainer = async (req, res) => {
    try {
        const container = await Container.findOne({
            containerId: req.params.id,
            userId: req.user.id
        });

        if (!container) {
            return res.status(404).json({
                success: false,
                message: 'Container not found'
            });
        }

        await dockerService.pauseContainer(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Container paused successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Resume a container
// @route   POST /api/containers/:id/resume
// @access  Private
exports.resumeContainer = async (req, res) => {
    try {
        const container = await Container.findOne({
            containerId: req.params.id,
            userId: req.user.id
        });

        if (!container) {
            return res.status(404).json({
                success: false,
                message: 'Container not found'
            });
        }

        await dockerService.resumeContainer(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Container resumed successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Remove a container
// @route   DELETE /api/containers/:id
// @access  Private
exports.removeContainer = async (req, res) => {
    try {
        const container = await Container.findOne({
            containerId: req.params.id,
            userId: req.user.id
        });

        if (!container) {
            return res.status(404).json({
                success: false,
                message: 'Container not found'
            });
        }

        await dockerService.removeContainer(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Container removed successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get container status
// @route   GET /api/containers/:id/status
// @access  Private
exports.getContainerStatus = async (req, res) => {
    try {
        const status = await dockerService.getContainerStatus(req.params.id);
        res.status(200).json({
            success: true,
            data: status
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get container logs
// @route   GET /api/containers/:id/logs
// @access  Private
exports.getContainerLogs = async (req, res) => {
    try {
        const logs = await dockerService.getContainerLogs(req.params.id);
        res.status(200).json({
            success: true,
            data: logs
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get user containers
// @route   GET /api/containers
// @access  Private
exports.getUserContainers = async (req, res) => {
    try {
        const containers = await dockerService.getUserContainers(req.user.id);
        res.status(200).json({
            success: true,
            count: containers.length,
            data: containers
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Create snapshot
// @route   POST /api/containers/:id/snapshot
// @access  Private
exports.createSnapshot = async (req, res) => {
    try {
        const { snapshotData } = req.body;
        await dockerService.createSnapshot(req.params.id, snapshotData);
        
        res.status(200).json({
            success: true,
            message: 'Snapshot created successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get all containers (Admin only)
// @route   GET /api/containers/all
// @access  Private/Admin
exports.getAllContainers = async (req, res) => {
    try {
        const snapshot = await getMonitoringSnapshot();
        const containers = snapshot.containers || [];
        
        res.status(200).json({
            success: true,
            count: containers.length,
            data: containers
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
