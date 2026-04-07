// backend/config/dockerClient.js
const Docker = require('dockerode');

// Initialize Docker connection based on environment
// Supports both Unix socket and TCP connections
function createDockerClient() {
    const dockerHost = process.env.DOCKER_HOST;
    
    // If DOCKER_HOST is set and is a TCP URL (tcp:// or http://)
    if (dockerHost && (dockerHost.startsWith('tcp://') || dockerHost.startsWith('http://'))) {
        const url = new URL(dockerHost);
        const proto = url.protocol.replace(':', '');
        return new Docker({
            host: url.hostname,
            port: url.port || 2375,
            // dockerode expects http/https; DOCKER_HOST commonly uses tcp:// for insecure HTTP.
            protocol: proto === 'tcp' ? 'http' : proto
        });
    }
    
    // If DOCKER_HOST is a socket path (starts with /)
    if (dockerHost && dockerHost.startsWith('/')) {
        return new Docker({
            socketPath: dockerHost
        });
    }
    
    // Default: use default Docker socket (works on Linux/Mac)
    // On Windows, Docker Desktop provides a socket at //./pipe/docker_engine
    if (process.platform === 'win32') {
        return new Docker({
            socketPath: '//./pipe/docker_engine'
        });
    }
    
    // Linux/Mac default
    return new Docker({
        socketPath: '/var/run/docker.sock'
    });
}

const docker = createDockerClient();

async function testDockerConnection() {
  try {
    await docker.ping();
    console.log('✅ Docker engine connected successfully');
    return true;
  } catch (err) {
    console.error('❌ Docker connection failed:', err.message);
    console.error('   Make sure Docker is running and accessible');
    return false;
  }
}

module.exports = { docker, testDockerConnection };
