/**
 * Code Runner - executes code in isolated Docker containers.
 * Supported languages: Python, JavaScript, Java, C, C++
 *
 * Why Docker-only:
 * - avoids running untrusted code on the host machine
 * - works when the backend itself runs inside Docker (no host bind mounts needed)
 */

const crypto = require('crypto');
const stream = require('stream');
const tar = require('tar-stream');
const { docker } = require('../config/dockerClient');

const EXECUTION_TIMEOUT_MS = 30000;
const imageReadyCache = new Map();

async function pullImageBestEffort(image) {
  try {
    await new Promise((resolve, reject) => {
      docker.pull(image, (err, pullStream) => {
        if (err) return reject(err);
        docker.modem.followProgress(pullStream, (err2) => (err2 ? reject(err2) : resolve()));
      });
    });
  } catch {
    // Ignore pull errors. If the image is missing, createContainer will fail with a clear message.
  }
}

async function ensureImageAvailable(image) {
  if (!image) return;

  try {
    await docker.getImage(image).inspect();
    return;
  } catch {
    // Image is not available locally yet.
  }

  if (!imageReadyCache.has(image)) {
    const readinessPromise = (async () => {
      await pullImageBestEffort(image);
      try {
        await docker.getImage(image).inspect();
      } catch (error) {
        imageReadyCache.delete(image);
        throw error;
      }
    })();

    imageReadyCache.set(image, readinessPromise);
  }

  await imageReadyCache.get(image);
}

async function hasLocalImage(image) {
  if (!image) return false;
  try {
    await docker.getImage(image).inspect();
    return true;
  } catch {
    return false;
  }
}

async function resolveRunnerImage({ envImage, localImage, defaultImage }) {
  if (envImage) {
    await ensureImageAvailable(envImage);
    return envImage;
  }

  if (localImage && await hasLocalImage(localImage)) {
    return localImage;
  }

  await ensureImageAvailable(defaultImage);
  return defaultImage;
}

function createTarStream(files) {
  const pack = tar.pack();
  for (const f of files) {
    const content = Buffer.isBuffer(f.content) ? f.content : Buffer.from(String(f.content ?? ''), 'utf8');
    pack.entry({ name: f.name, mode: f.mode ?? 0o644 }, content);
  }
  pack.finalize();
  return pack;
}

async function putFiles(container, destPath, files) {
  const tarStream = createTarStream(files);
  await new Promise((resolve, reject) => {
    tarStream.on('error', reject);
    container.putArchive(tarStream, { path: destPath }, (err) => (err ? reject(err) : resolve()));
  });
}

async function demuxDockerLogs(logSource) {
  let stdout = '';
  let stderr = '';

  const stdoutStream = new stream.PassThrough();
  const stderrStream = new stream.PassThrough();

  stdoutStream.on('data', (chunk) => {
    stdout += chunk.toString();
  });
  stderrStream.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  const sourceStream = Buffer.isBuffer(logSource)
    ? (() => {
        const passThrough = new stream.PassThrough();
        passThrough.end(logSource);
        return passThrough;
      })()
    : logSource;

  await new Promise((resolve, reject) => {
    sourceStream.on('error', reject);
    stdoutStream.on('error', reject);
    stderrStream.on('error', reject);
    sourceStream.on('end', resolve);
    docker.modem.demuxStream(sourceStream, stdoutStream, stderrStream);
  });

  return { stdout, stderr };
}

async function readContainerLogs(container) {
  const logSource = await container.logs({
    stdout: true,
    stderr: true,
    follow: false,
  });

  return await demuxDockerLogs(logSource);
}

async function runInDocker({
  image,
  cmd,
  files,
  memoryMB = 256,
  nanoCpus = 500000000, // 0.5 CPU
}) {
  const execId = crypto.randomBytes(8).toString('hex');

  await ensureImageAvailable(image);

  const container = await docker.createContainer({
    Image: image,
    name: `vlw-run-${execId}`,
    // Use /tmp as a writable workspace across common images (python/node/gcc/temurin).
    // Important: Avoid ReadonlyRootfs+Tmpfs+copy-before-start, which can break on some Docker engines.
    WorkingDir: '/tmp',
    Cmd: cmd,
    AttachStdout: true,
    AttachStderr: true,
    Tty: false,
    NetworkDisabled: true,
    HostConfig: {
      AutoRemove: false,
      Memory: memoryMB * 1024 * 1024,
      PidsLimit: 128,
      NanoCpus: nanoCpus,
      SecurityOpt: ['no-new-privileges:true'],
      CapDrop: ['ALL'],
    },
  });

  try {
    await putFiles(container, '/tmp', files);
    await container.start();

    let timedOut = false;
    const timeoutId = setTimeout(async () => {
      timedOut = true;
      try {
        await container.kill();
      } catch {
        // ignore
      }
    }, EXECUTION_TIMEOUT_MS);

    let waitRes = null;
    try {
      waitRes = await container.wait();
    } catch {
      // ignore (container may be removed/killed quickly)
    } finally {
      clearTimeout(timeoutId);
    }

    const { stdout, stderr } = await readContainerLogs(container);

    const exitCode =
      waitRes && typeof waitRes.StatusCode === 'number'
        ? waitRes.StatusCode
        : timedOut
          ? 1
          : 0;

    const out = String(stdout || '').trim();
    const err = String(stderr || '').trim() || (timedOut ? `Execution timeout (${EXECUTION_TIMEOUT_MS / 1000} seconds)` : '');

    return { stdout: out, stderr: err, exitCode };
  } finally {
    try {
      await container.remove({ force: true });
    } catch {
      // ignore
    }
  }
}

function extractCsvBytesFromPrelude(code) {
  try {
    const m = String(code || '').match(/_csv_b64\s*=\s*"([A-Za-z0-9+/=]+)"/);
    if (m && m[1]) return Buffer.from(m[1], 'base64');
  } catch {
    // ignore
  }
  return null;
}

async function runPython(code, stdin) {
  const image = await resolveRunnerImage({
    envImage: process.env.PY_RUNNER_IMAGE,
    localImage: 'vlw-runner-python:latest',
    defaultImage: 'python:3.11-slim',
  });
  const files = [
    { name: 'main.py', content: code },
    { name: 'stdin.txt', content: stdin || '' },
  ];

  const csvBytes = extractCsvBytesFromPrelude(code);
  if (csvBytes) {
    files.push({ name: 'uploaded_file.csv', content: csvBytes });
  }

  return await runInDocker({
    image,
    cmd: ['sh', '-lc', 'python main.py < stdin.txt'],
    files,
    memoryMB: 256,
    nanoCpus: 500000000,
  });
}

async function runJavaScript(code, stdin) {
  const image = process.env.JS_RUNNER_IMAGE || 'node:20-alpine';
  return await runInDocker({
    image,
    cmd: ['sh', '-lc', 'node main.js < stdin.txt'],
    files: [
      { name: 'main.js', content: code },
      { name: 'stdin.txt', content: stdin || '' },
    ],
    memoryMB: 256,
    nanoCpus: 500000000,
  });
}

async function runJava(code, stdin) {
  const image = process.env.JAVA_RUNNER_IMAGE || 'eclipse-temurin:21-jdk';

  const classNameMatch = String(code || '').match(/\b(?:public\s+)?class\s+(\w+)/);
  const className = classNameMatch ? classNameMatch[1] : 'Main';
  const javaFile = `${className}.java`;

  const cmd = ['sh', '-lc', `javac ${javaFile} && java ${className} < stdin.txt`];

  return await runInDocker({
    image,
    cmd,
    files: [
      { name: javaFile, content: code },
      { name: 'stdin.txt', content: stdin || '' },
    ],
    memoryMB: 512,
    nanoCpus: 1000000000, // 1 CPU
  });
}

async function runC(code, stdin) {
  const image = process.env.C_RUNNER_IMAGE || 'gcc:13';
  const cmd = ['sh', '-lc', `gcc main.c -O2 -std=c17 -o a.out && ./a.out < stdin.txt`];

  return await runInDocker({
    image,
    cmd,
    files: [
      { name: 'main.c', content: code },
      { name: 'stdin.txt', content: stdin || '' },
    ],
    memoryMB: 512,
    nanoCpus: 1000000000,
  });
}

async function runCpp(code, stdin) {
  const image = process.env.CPP_RUNNER_IMAGE || 'gcc:13';
  const cmd = ['sh', '-lc', `g++ main.cpp -O2 -std=c++17 -o a.out && ./a.out < stdin.txt`];

  return await runInDocker({
    image,
    cmd,
    files: [
      { name: 'main.cpp', content: code },
      { name: 'stdin.txt', content: stdin || '' },
    ],
    memoryMB: 512,
    nanoCpus: 1000000000,
  });
}

async function runCode(code, language, stdin = '') {
  const startTime = Date.now();
  try {
    if (!code || !language) {
      return {
        stdout: '',
        stderr: 'code and language are required',
        exitCode: 1,
        executionTime: Date.now() - startTime,
      };
    }

    let result;
    switch (String(language).toLowerCase()) {
      case 'python':
        result = await runPython(code, stdin);
        break;
      case 'javascript':
      case 'js':
        result = await runJavaScript(code, stdin);
        break;
      case 'java':
        result = await runJava(code, stdin);
        break;
      case 'cpp':
      case 'c++':
        result = await runCpp(code, stdin);
        break;
      case 'c':
        result = await runC(code, stdin);
        break;
      default:
        result = { stdout: '', stderr: `Unsupported language: ${language}`, exitCode: 1 };
    }

    return { ...result, executionTime: Date.now() - startTime };
  } catch (error) {
    return {
      stdout: '',
      stderr: error.message || 'Execution error',
      exitCode: 1,
      executionTime: Date.now() - startTime,
    };
  }
}

module.exports = { runCode };
