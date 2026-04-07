const { docker } = require('../config/dockerClient');
const Container = require('../models/Container');

class DockerService {
    buildVolumeName(userId, labId) {
        return `lab-${String(userId)}-${String(labId)}`.replace(/[^a-zA-Z0-9_.-]/g, '-');
    }

    async ensureVolume(volumeName) {
        try {
            const volume = docker.getVolume(volumeName);
            await volume.inspect();
            return volumeName;
        } catch (inspectError) {
            if (inspectError?.statusCode && inspectError.statusCode !== 404) {
                throw inspectError;
            }
        }

        await new Promise((resolve, reject) => {
            docker.createVolume({ Name: volumeName }, (err) => {
                if (err && !(err.message && err.message.includes('already exists'))) {
                    return reject(err);
                }

                return resolve();
            });
        });

        return volumeName;
    }

    async getTrackedContainer(userId, labId) {
        return await Container.findOne({ userId, labId }).sort({ updatedAt: -1 });
    }

    // Start a container for a lab
    async startContainer(userId, labId, labTemplate) {
        try {
            const existingContainerDoc = await this.getTrackedContainer(userId, labId);

            if (existingContainerDoc) {
                try {
                    const existingContainer = docker.getContainer(existingContainerDoc.containerId);
                    const existingInfo = await existingContainer.inspect();
                    const existingStatus = String(existingInfo?.State?.Status || existingContainerDoc.status || '').toLowerCase();

                    if (existingStatus === 'running') {
                        existingContainerDoc.status = existingStatus;
                        existingContainerDoc.lastAccessed = new Date();
                        await existingContainerDoc.save();

                        return {
                            success: true,
                            reused: true,
                            container: existingContainerDoc,
                            containerId: existingContainerDoc.containerId
                        };
                    }

                    if (existingStatus === 'paused') {
                        await existingContainer.unpause();
                        existingContainerDoc.status = 'running';
                        existingContainerDoc.lastAccessed = new Date();
                        await existingContainerDoc.save();

                        return {
                            success: true,
                            reused: true,
                            container: existingContainerDoc,
                            containerId: existingContainerDoc.containerId
                        };
                    }

                    await existingContainer.start();

                    existingContainerDoc.status = 'running';
                    existingContainerDoc.startedAt = new Date();
                    existingContainerDoc.lastAccessed = new Date();
                    await existingContainerDoc.save();

                    return {
                        success: true,
                        reused: true,
                        container: existingContainerDoc,
                        containerId: existingContainerDoc.containerId
                    };
                } catch (existingError) {
                    if (existingError?.statusCode !== 404) {
                        throw existingError;
                    }

                    await Container.findOneAndDelete({ _id: existingContainerDoc._id });
                }
            }

            const volumeName = await this.ensureVolume(
                (existingContainerDoc && existingContainerDoc.volumeName) || this.buildVolumeName(userId, labId)
            );
            
            // Pull image if not exists
            await this.pullImage(labTemplate.dockerImage);

            // Create container
            const container = await docker.createContainer({
                Image: labTemplate.dockerImage,
                name: `lab-${String(userId).slice(-8)}-${String(labId).slice(-8)}-${Date.now()}`,
                Env: Object.entries(labTemplate.environment || {}).map(([k, v]) => `${k}=${v}`),
                Labels: {
                    'virtual-lab.userId': String(userId),
                    'virtual-lab.labId': String(labId),
                    'virtual-lab.volume': volumeName
                },
                HostConfig: {
                    Memory: this.parseMemory(labTemplate.resources.memory),
                    CpuShares: labTemplate.resources.cpu * 1024,
                    Binds: [`${volumeName}:/workspace`],
                    PortBindings: this.createPortBindings(labTemplate.ports || [])
                },
                WorkingDir: '/workspace',
                AttachStdout: true,
                AttachStderr: true
            });

            // Start container
            await container.start();

            // Save container info to database
            const containerDoc = await Container.findOneAndUpdate(
                { userId, labId },
                {
                    containerId: container.id,
                    userId,
                    labId,
                    status: 'running',
                    volumeName,
                    ports: labTemplate.ports || [],
                    startedAt: new Date(),
                    lastAccessed: new Date()
                },
                {
                    upsert: true,
                    new: true,
                    setDefaultsOnInsert: true
                }
            );

            return {
                success: true,
                container: containerDoc,
                containerId: container.id
            };
        } catch (error) {
            console.error('Error starting container:', error);
            throw error;
        }
    }

    // Stop a container
    async stopContainer(containerId) {
        try {
            const container = docker.getContainer(containerId);
            try {
                const info = await container.inspect();
                if (info?.State?.Running || info?.State?.Paused) {
                    await container.stop();
                }
            } catch (inspectError) {
                if (inspectError.statusCode !== 404) {
                    throw inspectError;
                }
            }
            
            await Container.findOneAndUpdate(
                { containerId },
                { status: 'stopped', lastAccessed: new Date() }
            );

            return { success: true };
        } catch (error) {
            throw error;
        }
    }

    // Start an existing stopped container
    async startExistingContainer(containerId) {
        try {
            const container = docker.getContainer(containerId);
            const info = await container.inspect();

            if (info?.State?.Paused) {
                await container.unpause();
            } else if (!info?.State?.Running) {
                await container.start();
            }

            await Container.findOneAndUpdate(
                { containerId },
                { status: 'running', lastAccessed: new Date() }
            );

            return { success: true };
        } catch (error) {
            throw error;
        }
    }

    // Pause a container
    async pauseContainer(containerId) {
        try {
            const container = docker.getContainer(containerId);
            await container.pause();
            
            await Container.findOneAndUpdate(
                { containerId },
                { status: 'paused', lastAccessed: new Date() }
            );

            return { success: true };
        } catch (error) {
            throw error;
        }
    }

    // Resume a paused container
    async resumeContainer(containerId) {
        try {
            const container = docker.getContainer(containerId);
            await container.unpause();
            
            await Container.findOneAndUpdate(
                { containerId },
                { status: 'running', lastAccessed: new Date() }
            );

            return { success: true };
        } catch (error) {
            throw error;
        }
    }

    // Restart a container
    async restartContainer(containerId) {
        try {
            const container = docker.getContainer(containerId);
            await container.restart();

            await Container.findOneAndUpdate(
                { containerId },
                { status: 'running', lastAccessed: new Date() }
            );

            return { success: true };
        } catch (error) {
            throw error;
        }
    }

    // Remove a container
    async removeContainer(containerId) {
        try {
            const containerDoc = await Container.findOne({ containerId });
            const container = docker.getContainer(containerId);

            try {
                const info = await container.inspect();
                if (info?.State?.Running || info?.State?.Paused) {
                    await container.stop();
                }
                await container.remove({ force: true });
            } catch (dockerError) {
                if (dockerError.statusCode !== 404) {
                    throw dockerError;
                }
            }

            if (containerDoc?.volumeName) {
                try {
                    const volume = docker.getVolume(containerDoc.volumeName);
                    await volume.remove();
                } catch (volumeError) {
                    console.warn(`Unable to remove volume ${containerDoc.volumeName}:`, volumeError.message);
                }
            }

            await Container.findOneAndDelete({ containerId });

            return { success: true };
        } catch (error) {
            throw error;
        }
    }

    // Get container status
    async getContainerStatus(containerId) {
        try {
            const container = docker.getContainer(containerId);
            const info = await container.inspect();
            
            return {
                id: info.Id,
                status: info.State.Status,
                startedAt: info.State.StartedAt,
                ports: info.NetworkSettings?.Ports || {}
            };
        } catch (error) {
            throw error;
        }
    }

    // Get container logs
    async getContainerLogs(containerId, tail = 100) {
        try {
            const container = docker.getContainer(containerId);
            const logs = await container.logs({
                stdout: true,
                stderr: true,
                tail
            });

            return logs.toString('utf8');
        } catch (error) {
            throw error;
        }
    }

    // Create snapshot of container state
    async createSnapshot(containerId, snapshotData) {
        try {
            await Container.findOneAndUpdate(
                { containerId },
                {
                    snapshot: {
                        data: snapshotData,
                        createdAt: new Date()
                    }
                }
            );

            return { success: true };
        } catch (error) {
            throw error;
        }
    }

    // Helper: Pull Docker image
    async pullImage(imageName) {
        return new Promise((resolve, reject) => {
            docker.pull(imageName, (err, stream) => {
                if (err) return reject(err);
                
                docker.modem.followProgress(stream, (err, output) => {
                    if (err) return reject(err);
                    resolve(output);
                });
            });
        });
    }

    // Helper: Parse memory string to bytes
    parseMemory(memory) {
        const units = { 'GB': 1024 * 1024 * 1024, 'MB': 1024 * 1024, 'KB': 1024 };
        const match = memory.match(/^(\d+)(GB|MB|KB)$/);
        if (match) {
            return parseInt(match[1]) * units[match[2]];
        }
        return 2 * 1024 * 1024 * 1024; // Default 2GB
    }

    // Helper: Create port bindings
    createPortBindings(ports) {
        const bindings = {};
        ports.forEach(port => {
            bindings[`${port.container}/tcp`] = [{ HostPort: port.host.toString() }];
        });
        return bindings;
    }

    // List all containers for a user
    async getUserContainers(userId) {
        try {
            const containers = await Container.find({ userId }).populate('labId');
            return containers;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new DockerService();

