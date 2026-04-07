const Lab = require('../models/Lab');
const Container = require('../models/Container');
const dockerService = require('../utils/dockerService');

// @desc    Get all labs (for students, returns assigned labs; for admins, returns all)
// @route   GET /api/labs
// @access  Private
exports.getLabs = async (req, res) => {
    try {
        const { category, difficulty, isActive } = req.query;
        let query = { isActive: isActive !== 'false' }; // active by default

        if (category) query.category = category;
        if (difficulty) query.difficulty = difficulty;

        // If student, filter by assignedTo batch/section
        if (req.user && req.user.role === 'student') {
            query.$or = [
  { 'assignedTo.assignToAll': true },
  {
    assignedTo: {
      $elemMatch: {
        batch: req.user.batch,
        section: req.user.section
      }
    }
  }
];

        }

        const labs = await Lab.find(query).populate('createdBy', 'username email');

        res.status(200).json({
            success: true,
            count: labs.length,
            data: labs
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get single lab
// @route   GET /api/labs/:id
// @access  Private
exports.getLab = async (req, res) => {
    try {
        const lab = await Lab.findById(req.params.id).populate('createdBy', 'username email');

        if (!lab) {
            return res.status(404).json({
                success: false,
                message: 'Lab not found'
            });
        }

        res.status(200).json({
            success: true,
            data: lab
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Create lab
// @route   POST /api/labs
// @access  Private/Admin
exports.createLab = async (req, res) => {
    try {
        req.body.createdBy = req.user.id;
        const lab = await Lab.create(req.body);

        res.status(201).json({
            success: true,
            data: lab
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Update lab
// @route   PUT /api/labs/:id
// @access  Private/Admin
exports.updateLab = async (req, res) => {
    try {
        const lab = await Lab.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        if (!lab) {
            return res.status(404).json({
                success: false,
                message: 'Lab not found'
            });
        }

        res.status(200).json({
            success: true,
            data: lab
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Delete lab
// @route   DELETE /api/labs/:id
// @access  Private/Admin
exports.deleteLab = async (req, res) => {
    try {
        const lab = await Lab.findByIdAndDelete(req.params.id);

        if (!lab) {
            return res.status(404).json({
                success: false,
                message: 'Lab not found'
            });
        }

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Start a lab (launch container)
// @route   POST /api/labs/:id/start
// @access  Private
exports.startLab = async (req, res) => {
    try {
        const lab = await Lab.findById(req.params.id);

        if (!lab) {
            return res.status(404).json({
                success: false,
                message: 'Lab not found'
            });
        }

        // Check if lab has docker template configured
        if (!lab.template || !lab.template.dockerImage) {
            return res.status(400).json({
                success: false,
                message: 'Lab is not configured for Docker deployment'
            });
        }

        try {
            // Start Docker container using dockerService
            const result = await dockerService.startContainer(
                req.user.id,
                lab._id,
                lab.template
            );

            res.status(200).json({
                success: true,
                message: 'Lab started successfully',
                data: {
                    labId: lab._id,
                    labName: lab.name,
                    containerId: result.containerId,
                    containerInfo: result.container,
                    startedAt: new Date(),
                    status: 'running'
                }
            });
        } catch (dockerError) {
            console.error('Docker error:', dockerError);
            
            // If Docker fails, provide helpful error message
            let errorMessage = 'Failed to start lab container';
            
            if (dockerError.message.includes('Cannot connect')) {
                errorMessage = 'Docker daemon is not running. Please ensure Docker is installed and running.';
            } else if (dockerError.message.includes('image not found')) {
                errorMessage = `Docker image '${lab.template.dockerImage}' not found. Please pull the image first.`;
            } else if (dockerError.message.includes('permission denied')) {
                errorMessage = 'Permission denied to access Docker. Please check your Docker permissions.';
            }
            
            res.status(500).json({
                success: false,
                message: errorMessage,
                error: process.env.NODE_ENV === 'development' ? dockerError.message : undefined
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Stop a lab container
// @route   POST /api/labs/:containerId/stop
// @access  Private
exports.stopContainer = async (req, res) => {
    try {
        const containerId = req.params.containerId;
        const isAdmin = req.user?.role === 'admin';

        const containerDoc = await Container.findOne(
            isAdmin ? { containerId } : { containerId, userId: req.user.id }
        );

        if (!containerDoc) {
            return res.status(404).json({
                success: false,
                message: 'Container not found'
            });
        }

        const result = await dockerService.stopContainer(containerId);
        
        res.status(200).json({
            success: true,
            message: 'Container stopped successfully',
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to stop container: ' + error.message
        });
    }
};

// @desc    Pause a lab container
// @route   POST /api/labs/:containerId/pause
// @access  Private
exports.pauseContainer = async (req, res) => {
    try {
        const containerId = req.params.containerId;
        const isAdmin = req.user?.role === 'admin';

        const containerDoc = await Container.findOne(
            isAdmin ? { containerId } : { containerId, userId: req.user.id }
        );

        if (!containerDoc) {
            return res.status(404).json({
                success: false,
                message: 'Container not found'
            });
        }

        const result = await dockerService.pauseContainer(containerId);
        
        res.status(200).json({
            success: true,
            message: 'Container paused successfully',
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to pause container: ' + error.message
        });
    }
};

// @desc    Resume a paused lab container
// @route   POST /api/labs/:containerId/resume
// @access  Private
exports.resumeContainer = async (req, res) => {
    try {
        const containerId = req.params.containerId;
        const isAdmin = req.user?.role === 'admin';

        const containerDoc = await Container.findOne(
            isAdmin ? { containerId } : { containerId, userId: req.user.id }
        );

        if (!containerDoc) {
            return res.status(404).json({
                success: false,
                message: 'Container not found'
            });
        }

        const result = await dockerService.resumeContainer(containerId);
        
        res.status(200).json({
            success: true,
            message: 'Container resumed successfully',
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to resume container: ' + error.message
        });
    }
};

// @desc    Get container logs
// @route   GET /api/labs/:containerId/logs
// @access  Private
exports.getContainerLogs = async (req, res) => {
    try {
        const { tail = 100 } = req.query;
        const containerId = req.params.containerId;
        const isAdmin = req.user?.role === 'admin';

        const containerDoc = await Container.findOne(
            isAdmin ? { containerId } : { containerId, userId: req.user.id }
        );

        if (!containerDoc) {
            return res.status(404).json({
                success: false,
                message: 'Container not found'
            });
        }

        const logs = await dockerService.getContainerLogs(containerId, parseInt(tail, 10));
        
        res.status(200).json({
            success: true,
            data: {
                logs: logs
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get container logs: ' + error.message
        });
    }
};

// @desc    Get container status
// @route   GET /api/labs/:containerId/status
// @access  Private
exports.getContainerStatus = async (req, res) => {
    try {
        const containerId = req.params.containerId;
        const isAdmin = req.user?.role === 'admin';

        const containerDoc = await Container.findOne(
            isAdmin ? { containerId } : { containerId, userId: req.user.id }
        );

        if (!containerDoc) {
            return res.status(404).json({
                success: false,
                message: 'Container not found'
            });
        }

        const status = await dockerService.getContainerStatus(containerId);
        
        res.status(200).json({
            success: true,
            data: status
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get container status: ' + error.message
        });
    }
};

