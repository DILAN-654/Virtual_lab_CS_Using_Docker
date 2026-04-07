// Code Editor JavaScript

let currentAssignedTaskId = null;
let restrictedLanguage = null;   // will be set from backend task
let currentLanguage = 'python';  // default, overridden if task has language
let executionAttempts = 0;
let hasRunError = false;
let lastRunHadError = false;
let hasRunOnce = false;
let lastRunFingerprint = null;
let submissionLocked = false;
let waitingForInput = false;
let pendingRunPayload = null;
let stopRequested = false;
let editorStorageScope = null;

function getEditorStorageScope() {
    if (editorStorageScope) return editorStorageScope;

    const role = sessionStorage.getItem('userType') || 'user';
    const userId = sessionStorage.getItem('userId');
    const username = sessionStorage.getItem('username');
    const token = sessionStorage.getItem('token') || localStorage.getItem('token') || '';
    const fallback = token ? token.slice(-12) : 'anonymous';

    editorStorageScope = ['vlab', role, userId || username || fallback].join(':');
    return editorStorageScope;
}

function buildScopedStorageKey(...parts) {
    return [getEditorStorageScope(), ...parts].join(':');
}

function getCodeStorageKey() {
    return buildScopedStorageKey('assigned-task', currentAssignedTaskId || 'unknown-task', 'code');
}

function normalizeLanguageKey(language) {
    const raw = String(language || '').trim().toLowerCase();
    const compact = raw.replace(/\s+/g, '');

    if (!compact) return '';
    if (compact === 'python' || compact === 'py') return 'python';
    if (compact === 'javascript' || compact === 'js' || compact === 'node' || compact === 'node.js' || compact === 'nodejs' || compact === 'ecmascript') return 'javascript';
    if (compact === 'java') return 'java';
    if (compact === 'c') return 'c';
    if (compact === 'cpp' || compact === 'c++' || compact === 'cplusplus' || compact === 'g++') return 'cpp';
    return raw;
}

function getLanguageDisplayName(language) {
    const normalized = normalizeLanguageKey(language);
    const labels = {
        python: 'Python',
        javascript: 'JavaScript',
        java: 'Java',
        c: 'C',
        cpp: 'C++'
    };
    return labels[normalized] || String(language || 'Not set');
}

function getLanguageFileExtension(language) {
    const normalized = normalizeLanguageKey(language);
    const extensions = {
        python: 'py',
        javascript: 'js',
        java: 'java',
        c: 'c',
        cpp: 'cpp'
    };
    return extensions[normalized] || 'txt';
}

function ensureFileNameMatchesLanguage(fileName, language) {
    const trimmed = String(fileName || '').trim();
    const extension = getLanguageFileExtension(language);
    if (!trimmed) {
        return `solution.${extension}`;
    }

    const dotIndex = trimmed.lastIndexOf('.');
    const baseName = dotIndex > 0 ? trimmed.slice(0, dotIndex) : trimmed;
    return `${baseName || 'solution'}.${extension}`;
}

function slugifyFileStem(value) {
    return String(value || 'solution')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'solution';
}

async function validateEditorCodeForSelectedLanguage(actionLabel = 'run') {
    const code = document.getElementById('codeEditor')?.value || '';
    const selectedLanguage = normalizeLanguageKey(currentLanguage);

    if (!code.trim() || !selectedLanguage || !window.api || typeof window.api.detectLanguage !== 'function') {
        return { valid: true };
    }

    try {
        const response = await window.api.detectLanguage('snippet.txt', code);
        if (!response || !response.success || !response.data) {
            return { valid: true };
        }

        const detectedLanguage = normalizeLanguageKey(response.data.language);
        const confidence = Number(response.data.confidence || 0);

        if (!detectedLanguage || detectedLanguage === 'unknown' || confidence < 25) {
            return { valid: true };
        }

        if (detectedLanguage !== selectedLanguage) {
            return {
                valid: false,
                detectedLanguage,
                selectedLanguage,
                message: `The dropdown is set to ${getLanguageDisplayName(selectedLanguage)}, but the code looks like ${getLanguageDisplayName(detectedLanguage)}. Switch the dropdown or replace the code before you ${actionLabel}.`
            };
        }
    } catch (error) {
        console.debug('[CODE EDITOR] language validation skipped:', error.message);
    }

    return { valid: true };
}

function inferLanguageFromTask(taskInfo = {}) {
    const text = `${taskInfo.title || ''} ${taskInfo.description || ''}`.toLowerCase();
    if (!text.trim()) return '';
    if (/c\+\+|cplusplus|\bcpp\b/.test(text)) return 'cpp';
    if (/javascript|node\.?js|ecmascript/.test(text)) return 'javascript';
    if (/\bpython\b/.test(text)) return 'python';
    if (/\bjava\b/.test(text) && !/javascript/.test(text)) return 'java';
    if (/\bc program\b|ansi c|language c\b/.test(text)) return 'c';
    return '';
}

function normalizeStatus(status) {
    const raw = String(status || 'pending').trim().toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-');
    return raw === 'inprogress' ? 'in-progress' : raw;
}

function formatStatusLabel(status) {
    const normalized = normalizeStatus(status);
    return normalized
        .split('-')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ') || 'Pending';
}

function formatDifficultyLabel(difficulty) {
    const normalized = String(difficulty || 'medium').trim().toLowerCase();
    return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : 'Medium';
}

function formatDeadlineLabel(deadline) {
    if (!deadline) return 'No deadline';
    const date = new Date(deadline);
    if (Number.isNaN(date.getTime())) return 'No deadline';
    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function setTextContent(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

function updateTaskStatusDisplays(status) {
    const normalized = normalizeStatus(status);
    const statusBadge = document.getElementById('taskStatus');

    if (statusBadge) {
        statusBadge.textContent = formatStatusLabel(normalized).toUpperCase();
        statusBadge.className = `status-badge ${normalized}`;
    }

    setTextContent('heroStatusText', formatStatusLabel(normalized));
    setTextContent('summaryStatusText', formatStatusLabel(normalized));

    if (window.taskDetails) {
        window.taskDetails.status = normalized;
    }
}

function updateTaskSummary(details = window.taskDetails) {
    if (!details) return;

    setTextContent('summaryTaskTitle', details.title || 'Assigned task');
    setTextContent(
        'summaryTaskDescription',
        details.description
            ? String(details.description)
            : 'Use the workspace to code, run, inspect console output, and submit when ready.'
    );
    setTextContent('summaryDifficultyText', formatDifficultyLabel(details.difficulty));
    setTextContent('summaryDeadlineText', formatDeadlineLabel(details.deadline));
    setTextContent('summaryLanguageText', getLanguageDisplayName(currentLanguage || details.language || 'python'));
    updateTaskStatusDisplays(details.status || 'pending');
}

function setInputVisibility(visible) {
    const runtimeCard = document.getElementById('runtimeInputCard');
    const requirementText = document.getElementById('inputRequirementText');
    const hintText = document.getElementById('inputHintText');

    if (runtimeCard) runtimeCard.classList.toggle('input-required', Boolean(visible));
    syncRuntimeInputCardState();
    if (requirementText) {
        requirementText.textContent = visible
            ? 'Input detected in your code. Add each value on a new line, then click Run again.'
            : 'Enter input if your program requires it. One line equals one input value.';
    }
    if (hintText) {
        hintText.textContent = visible
            ? 'Example input: 5 then 10 on separate lines.'
            : 'Programs that use stdin will read directly from this box.';
    }
}

function detectRequiresInput(code, language) {
    const c = String(code || '');
    const lang = String(language || '').toLowerCase();
    if (lang === 'python') return /\binput\s*\(|sys\.stdin|sys\.stdin\.read/.test(c);
    if (lang === 'java') return /\bScanner\b|System\.in|BufferedReader/.test(c);
    if (lang === 'cpp' || lang === 'c\+\+' || lang === 'c') return /\bcin\b|\bscanf\b|getchar\s*\(|fgets\s*\(/.test(c);
    if (lang === 'javascript' || lang === 'js') return /prompt\s*\(|process\.stdin|readline|readFileSync\s*\(\s*0/.test(c);
    return false;
}

function getInputStorageKey() {
    return buildScopedStorageKey('assigned-task', currentAssignedTaskId || 'unknown-task', 'stdin');
}

function getRunHistoryStorageKey() {
    return buildScopedStorageKey('assigned-task', currentAssignedTaskId || 'unknown-task', 'run-history');
}

function setWorkspaceLanguageLabel(language = currentLanguage) {
    const displayName = getLanguageDisplayName(language || 'python');
    setTextContent('workspaceLanguageText', displayName.toUpperCase());
    setTextContent('summaryLanguageText', displayName);
}

function syncRuntimeInputCardState() {
    const runtimeCard = document.getElementById('runtimeInputCard');
    const stdinEl = document.getElementById('standardInput');
    if (!runtimeCard || !stdinEl) return;

    runtimeCard.classList.toggle('has-value', Boolean(String(stdinEl.value || '').trim()));
}

function setConsoleMeta(message) {
    const el = document.getElementById('consoleMeta');
    if (el) el.textContent = message || 'Run your code to see the full terminal transcript here.';
}

function setErrorsLabel() {
    // Separate error labels were removed in favor of a single terminal transcript.
}

function setExecutionState(state, detail = '') {
    const statusEl = document.getElementById('executionStatus');
    const spinner = document.getElementById('consoleSpinner');
    const runBtn = document.getElementById('runBtn');

    const normalizedState = String(state || 'idle').toLowerCase();
    const labelMap = {
        idle: 'Ready',
        running: 'Running',
        success: 'Success',
        error: 'Error',
        input: 'Input Needed'
    };

    if (statusEl) {
        statusEl.className = `execution-status ${normalizedState}`;
        statusEl.textContent = labelMap[normalizedState] || 'Ready';
    }

    if (spinner) {
        spinner.hidden = normalizedState !== 'running';
    }

    if (runBtn) {
        if (!runBtn.dataset.defaultHtml) {
            runBtn.dataset.defaultHtml = runBtn.innerHTML;
        }
        runBtn.disabled = normalizedState === 'running';
        runBtn.innerHTML = normalizedState === 'running'
            ? '<i class="bx bx-loader-alt bx-spin"></i> Running'
            : runBtn.dataset.defaultHtml;
    }

    if (detail) {
        setConsoleMeta(detail);
    }
}

function writeConsoleText(elementId, text) {
    const element = document.getElementById(elementId);
    if (!element) return;
    element.textContent = text;
    element.scrollTop = element.scrollHeight;
}

function setConsoleErrorState(hasError) {
    const content = document.getElementById('outputContent');
    if (content) {
        content.classList.toggle('has-error', Boolean(hasError));
    }
}

function buildTerminalTranscript({ notice = '', stdin = '', stdout = '', stderr = '' } = {}) {
    const sections = [];
    const cleanedNotice = String(notice || '').trim();
    const cleanedInput = String(stdin || '').replace(/\r\n/g, '\n').trimEnd();
    const cleanedOutput = String(stdout || '').replace(/\r\n/g, '\n').trimEnd();
    const cleanedError = String(stderr || '').replace(/\r\n/g, '\n').trimEnd();

    if (cleanedNotice) {
        sections.push(cleanedNotice);
    }
    if (cleanedInput) {
        sections.push(`=== INPUT ===\n${cleanedInput}`);
    }
    if (cleanedOutput) {
        sections.push(`=== OUTPUT ===\n${cleanedOutput}`);
    } else if (!cleanedNotice && !cleanedError) {
        sections.push('=== OUTPUT ===\n(Program completed with no output)');
    }
    if (cleanedError) {
        sections.push(`=== ERRORS ===\n${cleanedError}`);
    }

    return sections.join('\n\n') || 'Run your code to see the terminal output here.';
}

function renderTerminalTranscript(payload = {}) {
    const stderr = String(payload.stderr || '').trim();
    setConsoleErrorState(Boolean(stderr));
    writeConsoleText('outputContent', buildTerminalTranscript(payload));
}

function updateErrorsDisplay(text, metaMessage = 'Compile-time, runtime, and timeout messages appear here.') {
    setConsoleErrorState(Boolean(String(text || '').trim()));
    setConsoleMeta(metaMessage);
}

function classifyExecutionError(stderr, language) {
    const errorText = String(stderr || '').toLowerCase();
    if (!errorText) return 'Error';
    if (errorText.includes('timeout')) return 'Execution Timeout';
    if (String(language || '').toLowerCase() === 'java' && errorText.includes('javac')) return 'Compilation Error';
    if ((String(language || '').toLowerCase() === 'cpp' || String(language || '').toLowerCase() === 'c') && errorText.includes('error:')) return 'Compilation Error';
    if (String(language || '').toLowerCase() === 'python' && errorText.includes('syntaxerror')) return 'Compilation Error';
    return 'Runtime Error';
}

function readRunHistory() {
    try {
        return JSON.parse(localStorage.getItem(getRunHistoryStorageKey()) || '[]');
    } catch (_) {
        return [];
    }
}

function renderRunHistory(entries) {
    const container = document.getElementById('runHistoryContainer');
    if (!container) return;

    if (!entries.length) {
        container.innerHTML = '<div class="run-history-empty">Your latest executions will appear here.</div>';
        return;
    }

    container.innerHTML = entries.map((entry) => `
        <div class="run-history-item">
            <div>
                <strong>${escapeHtml(entry.title || 'Run')}</strong>
                <p>${escapeHtml(entry.detail || '')}</p>
                <small>${entry.at ? new Date(entry.at).toLocaleString() : ''} | ${escapeHtml(getLanguageDisplayName(entry.language || currentLanguage))}</small>
            </div>
            <span class="run-history-status ${escapeHtml(normalizeStatus(entry.status || 'success'))}">${escapeHtml(formatStatusLabel(entry.status || 'success'))}</span>
        </div>
    `).join('');
}

function appendRunHistory(entry) {
    const items = readRunHistory();
    items.unshift({
        status: normalizeStatus(entry.status || 'success'),
        title: entry.title || 'Run complete',
        detail: entry.detail || '',
        language: normalizeLanguageKey(entry.language || currentLanguage),
        at: new Date().toISOString()
    });
    const trimmed = items.slice(0, 8);
    localStorage.setItem(getRunHistoryStorageKey(), JSON.stringify(trimmed));
    renderRunHistory(trimmed);
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function initializeRuntimePanel() {
    const stdinEl = document.getElementById('standardInput');
    const clearButton = document.getElementById('clearInputBtn');

    if (stdinEl) {
        stdinEl.value = localStorage.getItem(getInputStorageKey()) || '';
        stdinEl.addEventListener('input', () => {
            localStorage.setItem(getInputStorageKey(), stdinEl.value || '');
            syncRuntimeInputCardState();
        });
    }

    if (clearButton && !clearButton.dataset.bound) {
        clearButton.dataset.bound = 'true';
        clearButton.addEventListener('click', () => {
            if (stdinEl) stdinEl.value = '';
            localStorage.removeItem(getInputStorageKey());
            setInputVisibility(false);
            syncRuntimeInputCardState();
        });
    }

    setInputVisibility(false);
    syncRuntimeInputCardState();
    setExecutionState('idle', 'Run your code to see the full terminal transcript here.');
    renderTerminalTranscript({ notice: 'Run your code to see the terminal output here.' });
    renderRunHistory(readRunHistory());
}

async function executeRunWithStdin(stdinText) {
    renderTerminalTranscript({
        notice: `Executing ${getLanguageDisplayName((pendingRunPayload && pendingRunPayload.language) || currentLanguage)} code...`
    });
    setExecutionState('running', 'Code is running inside the virtual lab container...');
    updateErrorsDisplay('', 'Waiting for the latest execution result.');

    let payload = {
        ...pendingRunPayload,
        stdin: stdinText || ''
    };

    localStorage.setItem(getInputStorageKey(), stdinText || '');

    pendingRunPayload = null;
    waitingForInput = false;

    // For Python we may need to send a CSV as multipart/form-data
    if (String(payload.language || '').toLowerCase() === 'python') {
        const csvFileInput = document.getElementById('csvFile');
        if (csvFileInput && csvFileInput.files && csvFileInput.files.length > 0) {
            const formData = new FormData();
            formData.append('code', payload.code || '');
            formData.append('language', payload.language || 'python');
            formData.append('stdin', payload.stdin || '');
            formData.append('csvFile', csvFileInput.files[0]);
            payload = formData;
        }
    }

    const codeSnapshot = payload instanceof FormData ? String(payload.get('code') || '') : String(payload.code || '');
    const languageSnapshot = payload instanceof FormData ? String(payload.get('language') || currentLanguage) : String(payload.language || currentLanguage);

    const response = await window.api.runAssignedTask(currentAssignedTaskId, payload);
    if (response && response.success) {
        const data = response.data;
        const stdout = data.stdout || '';
        const stderr = data.stderr || '';
        const executionMs = Number(data.executionTime || 0);
        setInputVisibility(false);

        if (stderr) {
            const errorLabel = classifyExecutionError(stderr, languageSnapshot);
            renderTerminalTranscript({ stdin: stdinText || '', stdout, stderr });
            setExecutionState('error', `${errorLabel}. Review the terminal console for details.`);
            switchToOutputTab('console');
            appendRunHistory({
                status: 'error',
                title: errorLabel,
                detail: stderr.split('\n')[0] || 'Execution failed',
                language: languageSnapshot
            });
            lastRunHadError = true;
        } else {
            renderTerminalTranscript({ stdin: stdinText || '', stdout, stderr: '' });
            setExecutionState('success', executionMs > 0 ? `Run completed in ${executionMs} ms.` : 'Run completed successfully.');
            switchToOutputTab('console');
            appendRunHistory({
                status: 'success',
                title: 'Execution complete',
                detail: stdout ? stdout.split('\n')[0] : 'Program completed with no output',
                language: languageSnapshot
            });
            lastRunHadError = false;
        }

        // Submission gate: allow submit only after at least one execution of the current code.
        hasRunOnce = true;
        lastRunFingerprint = computeFingerprint(codeSnapshot, languageSnapshot || currentLanguage);
        syncSubmitButtonState();
        return { success: true, data };
    }

    const errorMsg = response?.message || 'No output from runner';
    setInputVisibility(false);
    renderTerminalTranscript({ stdin: stdinText || '', stderr: errorMsg });
    setExecutionState('error', 'Execution failed before a result was returned.');
    switchToOutputTab('console');
    appendRunHistory({
        status: 'error',
        title: 'Execution Error',
        detail: errorMsg,
        language: languageSnapshot
    });

    hasRunOnce = true;
    lastRunHadError = true;
    lastRunFingerprint = computeFingerprint(codeSnapshot, languageSnapshot || currentLanguage);
    syncSubmitButtonState();
    return { success: false, message: errorMsg };
}

function hashStringFNV1a(input) {
    const str = String(input || '');
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16);
}

function computeFingerprint(code, language) {
    return `${String(language || '').toLowerCase()}:${hashStringFNV1a(code)}`;
}

function getCurrentFingerprint() {
    const codeEditor = document.getElementById('codeEditor');
    return computeFingerprint(codeEditor ? codeEditor.value : '', currentLanguage);
}

function syncSubmitButtonState() {
    const submitBtn = document.getElementById('submitBtn');
    if (!submitBtn) return;

    const codeEditor = document.getElementById('codeEditor');
    const code = codeEditor ? String(codeEditor.value || '') : '';

    if (submissionLocked) {
        submitBtn.disabled = true;
        submitBtn.title = 'Lab already submitted';
        return;
    }

    if (!code.trim()) {
        submitBtn.disabled = true;
        submitBtn.title = 'Write some code to submit';
        return;
    }

    if (!hasRunOnce || !lastRunFingerprint) {
        submitBtn.disabled = true;
        submitBtn.title = 'Run your code to enable submission';
        return;
    }

    const fp = getCurrentFingerprint();
    if (fp !== lastRunFingerprint) {
        submitBtn.disabled = true;
        submitBtn.title = 'Run your code again after changes to enable submission';
        return;
    }

    submitBtn.disabled = false;
    submitBtn.title = '';
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Get task ID from URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        currentAssignedTaskId = urlParams.get('taskId');

        if (!currentAssignedTaskId) {
            alert('No task specified');
            window.location.href = 'student-dashboard.html';
            return;
        }

        // Load task details
        await loadTaskDetails();

        // Setup tab switching
        setupTabs();

        // Setup CSV upload visibility
        setupCSVUpload();

        initializeRuntimePanel();

        // Load code editor
        loadCodeEditor();

        // Highlight syntax on input
        document.getElementById('codeEditor').addEventListener('input', () => {
            updateHighlight();
        });

        // Add keyboard shortcut: Ctrl+Enter to run code
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                runCode();
            }

            // Ctrl+S to save
            if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
                e.preventDefault();
                try {
                    const codeEditor = document.getElementById('codeEditor');
                    if (codeEditor) {
                        localStorage.setItem(getCodeStorageKey(), codeEditor.value);
                    }
                } catch (err) {
                    console.error('[CODE EDITOR] Ctrl+S save failed:', err);
                }
            }

            // Esc to stop (best-effort client-side)
            if (e.key === 'Escape') {
                stopRequested = true;
                renderTerminalTranscript({ stderr: 'Execution stopped.' });
                setExecutionState('error', 'Execution stopped.');
                switchToOutputTab('console');
            }
        });

        // AI input: Enter to send
        const aiInput = document.getElementById('aiHelpInput');
        if (aiInput) {
            aiInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    sendAIHelp();
                }
            });
        }

        // Standard Input: allow multiline values, run with Ctrl+Enter when desired
        const stdinEl = document.getElementById('standardInput');
        if (stdinEl) {
            stdinEl.addEventListener('keydown', async (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    await runCode();
                }
            });
        }

    } catch (error) {
        console.error('Error initializing editor:', error);
        alert('Error loading task: ' + error.message);
    }
});

async function loadTaskDetails() {
    try {
        const response = await window.api.getAssignedTask(currentAssignedTaskId);

        if (!response.success) {
            throw new Error(response.message || 'Failed to load task');
        }

        const task = response.data;
        const taskInfo = task.taskId || task.task || { title: 'Untitled Task', description: '', difficulty: 'medium' };
        const normalizedTaskLanguage = normalizeLanguageKey(taskInfo.language);
        const inferredLanguage = normalizedTaskLanguage ? '' : inferLanguageFromTask(taskInfo);
        const normalizedStatus = normalizeStatus(task.status);
        restrictedLanguage = normalizedTaskLanguage || null;

        // Set title and status
        document.getElementById('taskTitle').textContent = taskInfo.title || 'Untitled Task';
        updateTaskStatusDisplays(normalizedStatus);

        // Lock submission if already submitted/graded (one submission per task rule).
        submissionLocked = (normalizedStatus === 'submitted' || normalizedStatus === 'graded' || !!task.submittedAt);

        if (normalizedTaskLanguage) {
            currentLanguage = normalizedTaskLanguage;
        } else if (inferredLanguage) {
            currentLanguage = inferredLanguage;
        } else {
            currentLanguage = normalizeLanguageKey(currentLanguage) || 'python';
        }

        // Store task description for modal
        window.taskDetails = {
            taskId: (taskInfo && (taskInfo._id || taskInfo.id)) ? (taskInfo._id || taskInfo.id) : null,
            labId: (task.labId && (task.labId._id || task.labId.id)) ? (task.labId._id || task.labId.id) : (task.labId || null),
            title: taskInfo.title || 'Untitled Task',
            description: taskInfo.description || '',
            difficulty: taskInfo.difficulty || 'medium',
            deadline: task.deadline || null,
            status: normalizedStatus,
            language: normalizedTaskLanguage || inferredLanguage || currentLanguage || null,
            topic: taskInfo.topic || null
        };

        // Set language restriction if task specifies a language
        if (restrictedLanguage) {
            restrictLanguageSelector();
        }

        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect && currentLanguage) {
            languageSelect.value = currentLanguage;
        }

        setWorkspaceLanguageLabel(currentLanguage);
        updateTaskSummary(window.taskDetails);

        const contextTitle = document.getElementById('workspaceContextTitle');
        if (contextTitle) {
            contextTitle.textContent = taskInfo.title || 'Assigned Coding Workspace';
        }

        const contextDescription = document.getElementById('workspaceContextDescription');
        if (contextDescription) {
            contextDescription.textContent = taskInfo.description
                ? String(taskInfo.description)
                : 'Use the workspace tabs to switch between coding, console output, and AI help while working on this task.';
        }

        // Mark task as started
        if (normalizedStatus === 'pending') {
            await window.api.startAssignedTask(currentAssignedTaskId);
            window.taskDetails.status = 'in-progress';
            updateTaskSummary(window.taskDetails);

            // Gamification: starting an assigned lab/task
            try {
                await window.api.awardPoints('lab_started', { assignedTaskId: currentAssignedTaskId, labId: task.labId?._id || task.labId });
            } catch (e) {
                console.debug('[GAMIFICATION] start award failed:', e.message);
            }
        }

        // Ensure Submit button state reflects lock + run gate.
        syncSubmitButtonState();

    } catch (error) {
        console.error('Error loading task details:', error);
        throw error;
    }
}

function setupTabs() {
    const tabs = document.querySelectorAll('.workspace-tab');
    if (!tabs.length) return;

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            switchWorkspaceTab(tab.dataset.workspaceTab);
        });
    });
}

function switchWorkspaceTab(tabName) {
    const nextTab = String(tabName || 'editor').toLowerCase();
    const tabs = document.querySelectorAll('.workspace-tab');
    const panels = document.querySelectorAll('.workspace-panel');
    const codeEditor = document.getElementById('codeEditor');

    tabs.forEach((tab) => {
        tab.classList.toggle('active', tab.dataset.workspaceTab === nextTab);
    });

    panels.forEach((panel) => {
        panel.classList.toggle('active', panel.id === `${nextTab}-workspace-panel`);
    });

    if (nextTab === 'editor' && codeEditor) {
        codeEditor.focus();
    }
}

function setupCSVUpload() {
    const csvSection = document.getElementById('csvUploadSection');
    const csvInput = document.getElementById('csvFile');
    const csvFileName = document.getElementById('csvFileName');
    if (!csvSection || !csvInput || !csvFileName) return;

    // Show CSV section only for Python
    if (currentLanguage === 'python') {
        csvSection.style.display = 'block';
    } else {
        csvSection.style.display = 'none';
    }

    csvInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            csvFileName.textContent = e.target.files[0].name;
        } else {
            csvFileName.textContent = 'No file selected';
        }
    });
}
function restrictLanguageSelector() {
    const languageSelect = document.getElementById('languageSelect');
    if (!languageSelect || !restrictedLanguage) return;

    // Disable other languages
    Array.from(languageSelect.options).forEach(option => {
        option.disabled = option.value !== normalizeLanguageKey(restrictedLanguage);
    });

    // Force assigned language
    languageSelect.value = normalizeLanguageKey(restrictedLanguage);

    // Do not disable the whole select; keep the assigned language visible.
    // languageSelect.disabled = true;

    // Show warning only once
    const toolbar = document.querySelector('.editor-toolbar');
    if (toolbar && !document.querySelector('.language-restriction-warning')) {
        const warning = document.createElement('div');
        warning.className = 'language-restriction-warning';
        warning.style.cssText = `
            background: #fff3cd;
            border: 1px solid #ffc107;
            color: #856404;
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 10px;
            font-size: 12px;
        `;
        warning.innerHTML = `
            <i class='bx bx-info-circle'></i>
            This task requires <strong>${getLanguageDisplayName(restrictedLanguage)}</strong> programming language only.
        `;

        toolbar.parentNode.insertBefore(warning, toolbar);
    }
}


function changeLanguage(lang) {
    const normalizedLanguage = normalizeLanguageKey(lang);

    // Prevent language change if restricted
    if (restrictedLanguage && normalizedLanguage !== normalizeLanguageKey(restrictedLanguage)) {
        alert(`This task requires ${getLanguageDisplayName(restrictedLanguage)} programming language only.`);
        document.getElementById('languageSelect').value = normalizeLanguageKey(restrictedLanguage);
        return;
    }

    currentLanguage = normalizedLanguage || 'python';

    // Update syntax highlighting
    updateHighlight();

    // Update language class in highlighter
    const highlightContent = document.getElementById('codeHighlightContent');
    if (highlightContent) {
        highlightContent.className = `language-${currentLanguage}`;
    }

    // Toggle CSV section visibility
    const csvSection = document.getElementById('csvUploadSection');
    if (csvSection && currentLanguage === 'python') {
        csvSection.style.display = 'block';
    } else if (csvSection) {
        csvSection.style.display = 'none';
    }

    setWorkspaceLanguageLabel(currentLanguage);
    updateTaskSummary(window.taskDetails);

    // Language changes require re-run before submit (submission must reflect executed code).
    syncSubmitButtonState();
}

function updateHighlight() {
    const codeEditor = document.getElementById('codeEditor');
    const highlightContent = document.getElementById('codeHighlightContent');

    // Update highlight text
    highlightContent.textContent = codeEditor.value;

    // Trigger highlight.js
    try {
        hljs.highlightElement(highlightContent);
    } catch (e) {
        console.debug('Syntax highlight error:', e);
    }
}

function loadCodeEditor() {
    const codeEditor = document.getElementById('codeEditor');
    const highlightContent = document.getElementById('codeHighlightContent');
    const storedCode = localStorage.getItem(getCodeStorageKey());

    if (storedCode) {
        codeEditor.value = storedCode;
    } else {
        // Requirement: no default/template code. Start empty for new tasks.
        codeEditor.value = '';
    }

    if (highlightContent) {
        highlightContent.className = `language-${currentLanguage}`;
    }

    updateHighlight();

    // Initialize line numbers
    updateLineNumbers();

    // Auto-save on input
    codeEditor.addEventListener('change', () => {
        localStorage.setItem(getCodeStorageKey(), codeEditor.value);
    });

    codeEditor.addEventListener('input', updateLineNumbers);
    codeEditor.addEventListener('input', syncSubmitButtonState);
    codeEditor.addEventListener('scroll', syncLineNumbersScroll);

    // Initial state: submission disabled until first run (or locked if already submitted).
    syncSubmitButtonState();
}

function updateLineNumbers() {
    const codeEditor = document.getElementById('codeEditor');
    const lineNumbers = document.getElementById('lineNumbers');
    if (!codeEditor || !lineNumbers) return;

    const lines = (codeEditor.value || '').split('\n').length || 1;
    let out = '';
    for (let i = 1; i <= lines; i++) {
        out += i + '\n';
    }
    lineNumbers.textContent = out;
    lineNumbers.scrollTop = codeEditor.scrollTop;
}

function syncLineNumbersScroll() {
    const codeEditor = document.getElementById('codeEditor');
    const lineNumbers = document.getElementById('lineNumbers');
    if (!codeEditor || !lineNumbers) return;
    lineNumbers.scrollTop = codeEditor.scrollTop;
}

async function runCode() {
    try {
        stopRequested = false;
        const code = document.getElementById('codeEditor').value;
        const stdinEl = document.getElementById('standardInput');
        const inputText = stdinEl ? stdinEl.value || '' : '';
        const canCollectInput = Boolean(stdinEl);

        const runStartedAt = Date.now();
        executionAttempts += 1;
        switchWorkspaceTab('console');

        renderTerminalTranscript({
            notice: `Preparing ${getLanguageDisplayName(currentLanguage)} code for execution...`
        });
        setExecutionState('running', 'Preparing your code for execution...');
        updateErrorsDisplay('', 'Waiting for the latest execution result.');

        // Validate code
        if (!code || code.trim().length === 0) {
            renderTerminalTranscript({ stderr: 'Write some code before running.' });
            setExecutionState('error', 'Write some code before running.');
            switchToOutputTab('console');
            return { success: false, message: 'No code to run' };
        }

        // Validate current task ID
        if (!currentAssignedTaskId) {
            renderTerminalTranscript({ stderr: 'Task ID not found.' });
            setExecutionState('error', 'Task ID not found.');
            switchToOutputTab('console');
            return { success: false, message: 'Task ID not found' };
        }

        // Enforce language restriction
        if (restrictedLanguage && currentLanguage !== restrictedLanguage) {
            const requiredLanguageLabel = getLanguageDisplayName(restrictedLanguage);
            renderTerminalTranscript({
                stderr: `This task requires ${requiredLanguageLabel} only.`
            });
            setExecutionState('error', `This task only accepts ${requiredLanguageLabel}.`);
            switchToOutputTab('console');
            return { success: false, message: 'Language restricted' };
        }

        const languageValidation = await validateEditorCodeForSelectedLanguage('run');
        if (!languageValidation.valid) {
            renderTerminalTranscript({ stderr: languageValidation.message });
            setExecutionState('error', languageValidation.message);
            appendRunHistory({
                status: 'error',
                title: 'Language mismatch',
                detail: `${getLanguageDisplayName(languageValidation.selectedLanguage)} selected, ${getLanguageDisplayName(languageValidation.detectedLanguage)} detected.`,
                language: currentLanguage
            });
            switchToOutputTab('console');
            return { success: false, message: 'Language mismatch' };
        }

        // Log for debugging
        console.log('[RUN CODE] Task:', currentAssignedTaskId, 'Language:', currentLanguage);

        // Decide if input is required
        const requiresInput = canCollectInput && detectRequiresInput(code, currentLanguage);

        // Call backend run endpoint (prepared)
        pendingRunPayload = {
            code,
            language: currentLanguage
        };

        if (requiresInput) {
            setInputVisibility(true);
            if (!inputText.trim()) {
                waitingForInput = true;
                renderTerminalTranscript({
                    notice: 'Program input detected.\n\nEnter your values in the Standard Input box below, then click Run again.'
                });
                setExecutionState('input', 'Input detected. Add your stdin values and run again.');
                switchToOutputTab('console');
                if (stdinEl) stdinEl.focus();
                appendRunHistory({
                    status: 'input',
                    title: 'Input required',
                    detail: 'The program requested stdin before it could continue.',
                    language: currentLanguage
                });
                return { success: false, message: 'Input required' };
            }

            waitingForInput = false;
        } else {
            setInputVisibility(false);
        }

        const response = await executeRunWithStdin(requiresInput ? inputText : '');
        if (stopRequested) {
            setExecutionState('error', 'Execution stopped.');
            return { success: false, message: 'Execution stopped' };
        }
        
        console.log('[RUN CODE] Response:', response);

        if (response && response.success) {
            const stdout = response.data.stdout || '';
            const stderr = response.data.stderr || '';

            const durationSec = Math.max(0, Math.floor((Date.now() - runStartedAt) / 1000));
            try {
                await window.api.trackAnalytics({
                    taskId: window.taskDetails?.taskId || null,
                    labId: window.taskDetails?.labId || null,
                    action: stderr ? 'error' : 'execution',
                    errorType: stderr ? String(stderr).slice(0, 180) : undefined,
                    status: 'in-progress',
                    timeSpent: durationSec,
                    executionDelta: 1
                });
            } catch (e) {
                console.debug('[ANALYTICS] track failed:', e.message);
            }

            if (stderr) {
                hasRunError = true;
                try {
                    await window.api.awardPoints('error', { assignedTaskId: currentAssignedTaskId, labId: window.taskDetails?.labId || null });
                } catch (e) {
                    console.debug('[GAMIFICATION] error award failed:', e.message);
                }
            }
        }

        return response || { success: false, message: 'No response from runner' };
    } catch (error) {
        console.error('[RUN CODE] Exception:', error);
        const message = 'Error: ' + error.message;
        renderTerminalTranscript({ stderr: message });
        setExecutionState('error', 'Execution failed unexpectedly.');
        appendRunHistory({
            status: 'error',
            title: 'Execution Error',
            detail: error.message,
            language: currentLanguage
        });

        hasRunError = true;
        try {
            await window.api.awardPoints('error', { assignedTaskId: currentAssignedTaskId, labId: window.taskDetails?.labId || null });
        } catch (e) {
            console.debug('[GAMIFICATION] error award failed:', e.message);
        }
        
        switchToOutputTab('console');
        syncSubmitButtonState();
        return { success: false, message };
    }
}

// Helper function to switch output tabs programmatically
function switchToOutputTab(tabName) {
    if (tabName === 'ai-help') {
        switchWorkspaceTab('ai-help');
        return;
    }

    if (tabName === 'editor') {
        switchWorkspaceTab('editor');
        return;
    }

    switchWorkspaceTab('console');
}

async function submitCode() {
    try {
        // Enforce: one submission only, and only after code execution of current code.
        syncSubmitButtonState();
        if (submissionLocked) {
            alert('Lab already submitted.');
            return;
        }
        if (!hasRunOnce || !lastRunFingerprint || getCurrentFingerprint() !== lastRunFingerprint) {
            alert('Please run your code before submitting.');
            return;
        }
        if (lastRunHadError) {
            const confirmSubmit = confirm('Your last run had errors. Are you sure you want to submit?');
            if (!confirmSubmit) return;
        }

        const code = document.getElementById('codeEditor').value;
        const csvFileInput = document.getElementById('csvFile');
        
        if (!code || code.trim().length === 0) {
            alert('Please write some code before submitting!');
            return;
        }
        
        // Show loading state
        const submitBtn = document.getElementById('submitBtn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Submitting...';
        submitBtn.disabled = true;
        
        try {
            // Prepare form data for submission
            const formData = new FormData();
            formData.append('code', code);
            formData.append('language', currentLanguage);
            formData.append('output', document.getElementById('outputContent').textContent);
            
            // Add CSV file if provided
            if (csvFileInput && csvFileInput.files.length > 0) {
                formData.append('csvFile', csvFileInput.files[0]);
            }
            
            // Submit the task
            const response = await window.api.submitAssignedTaskForm(currentAssignedTaskId, formData);
            
            if (response.success) {
                // Gamification: completion + bonus if first attempt (no prior errors and only one execution)
                try {
                    await window.api.awardPoints('lab_completed', { assignedTaskId: currentAssignedTaskId, labId: window.taskDetails?.labId || null });
                    if (!hasRunError && executionAttempts <= 1) {
                        await window.api.awardPoints('completed_first_attempt', { assignedTaskId: currentAssignedTaskId, labId: window.taskDetails?.labId || null });
                    }
                } catch (e) {
                    console.debug('[GAMIFICATION] completion award failed:', e.message);
                }

                // Analytics: mark task/lab completed
                try {
                    await window.api.trackAnalytics({
                        taskId: window.taskDetails?.taskId || null,
                        labId: window.taskDetails?.labId || null,
                        action: 'task-complete',
                        status: 'completed',
                        endTime: new Date().toISOString()
                    });
                } catch (e) {
                    console.debug('[ANALYTICS] complete track failed:', e.message);
                }

                // Also save to My Lab Files
                await saveToMyLabFiles(code, 'assigned-task');
                
                // Update UI
                submissionLocked = true;
                if (window.taskDetails) {
                    window.taskDetails.status = 'submitted';
                    updateTaskSummary(window.taskDetails);
                } else {
                    updateTaskStatusDisplays('submitted');
                }
                syncSubmitButtonState();
                
                alert('Task submitted successfully and saved to My Lab Files!');
                
                // Redirect back to dashboard after a delay
                setTimeout(() => {
                    window.location.href = 'student-dashboard.html#assigned-labs';
                }, 2000);
            } else {
                throw new Error(response.message || 'Failed to submit task');
            }
        } finally {
            // Restore button state
            submitBtn.innerHTML = originalText;
            syncSubmitButtonState();
        }
    } catch (error) {
        console.error('Error submitting code:', error);
        alert('Error submitting task: ' + error.message);
        
        // Restore button state
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.innerHTML = '<i class="bx bx-send"></i> Submit';
        syncSubmitButtonState();
    }
}

async function saveToMyLabFiles(code, type = 'assigned-task') {
    try {
        const taskDetails = window.taskDetails || {};
        const fileStem = currentAssignedTaskId
            ? `${slugifyFileStem(taskDetails.title || 'assigned_task')}_${currentAssignedTaskId}`
            : slugifyFileStem(taskDetails.title || 'assigned_task');
        const fileName = ensureFileNameMatchesLanguage(fileStem, currentLanguage);
        const description = `Submitted solution for: ${taskDetails.title || 'Untitled Task'}`;
        const topic = taskDetails.topic || 'other';
        
        const fileData = {
            fileName,
            description,
            topic,
            code,
            language: normalizeLanguageKey(currentLanguage),
            type,
            assignedTaskId: currentAssignedTaskId
        };
        
        const response = await window.api.createMyLabFile(fileData);
        if (response.success) {
            console.log('Successfully saved to My Lab Files');
            return response.data;
        } else {
            throw new Error(response.message || 'Failed to save to My Lab Files');
        }
    } catch (error) {
        console.error('Error saving to My Lab Files:', error);
        // Don't throw error as this is secondary to the main submission
        alert('Note: Code was submitted but could not be saved to My Lab Files: ' + error.message);
    }
}

function getExtensionForLanguage(language) {
    return getLanguageFileExtension(language);
}

function showTaskDescription() {
    const modal = document.getElementById('taskModal');
    const content = document.getElementById('taskDescriptionContent');

    if (!window.taskDetails) return;

    const status = normalizeStatus(window.taskDetails.status);
    const difficulty = String(window.taskDetails.difficulty || 'medium').toLowerCase();
    const difficultyClass = difficulty.replace(/\s+/g, '-');
    content.innerHTML = `
        <h2>${escapeHtml(window.taskDetails.title)}</h2>
        <p><strong>Status:</strong> <span class="status-badge ${status}">${escapeHtml(formatStatusLabel(status).toUpperCase())}</span></p>
        <p><strong>Difficulty:</strong> <span class="difficulty-badge ${escapeHtml(difficultyClass)}">${escapeHtml(formatDifficultyLabel(difficulty).toUpperCase())}</span></p>
        <p><strong>Deadline:</strong> ${escapeHtml(formatDeadlineLabel(window.taskDetails.deadline))}</p>
        <h3>Description</h3>
        <p>${escapeHtml(window.taskDetails.description || 'No description provided.')}</p>
    `;

    modal.style.display = 'flex';
}

function closeTaskModal() {
    document.getElementById('taskModal').style.display = 'none';
}

function resetCode() {
    if (confirm('Clear code? Unsaved changes will be lost.')) {
        const codeEditor = document.getElementById('codeEditor');
        if (codeEditor) codeEditor.value = '';
        try {
            localStorage.removeItem(getCodeStorageKey());
        } catch (e) {
            console.debug('[CODE EDITOR] reset localStorage failed:', e);
        }
        hasRunOnce = false;
        lastRunFingerprint = null;
        lastRunHadError = false;
        updateHighlight();
        updateLineNumbers();
        syncSubmitButtonState();
    }
}

function downloadCode() {
    const code = document.getElementById('codeEditor').value;
    const ext = getExtensionForLanguage(currentLanguage);

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(code));
    element.setAttribute('download', `solution.${ext}`);
    element.style.display = 'none';

    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

function toggleLineNumbers() {
    const wrapper = document.querySelector('.editor-wrapper');
    if (!wrapper) return;
    wrapper.classList.toggle('has-line-numbers');
    updateLineNumbers();
}

async function sendAIHelp() {
    try {
        const message = document.getElementById('aiHelpInput').value.trim();

        if (!message) return;

        const code = document.getElementById('codeEditor').value;
        const context = {
            code,
            language: currentLanguage,
            task: window.taskDetails?.title || 'Code help'
        };

        // Add user message to chat
        const chatMessages = document.getElementById('aiHelpMessages');
        const userMessageDiv = document.createElement('div');
        userMessageDiv.className = 'user-message';
        userMessageDiv.innerHTML = `
            <div class="message-content">
                <p>${escapeHtml(message)}</p>
            </div>
        `;
        chatMessages.appendChild(userMessageDiv);

        // Add loading/processing indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'ai-message loading';
        loadingDiv.innerHTML = `
            <div class="message-avatar">
                <i class='bx bx-bot'></i>
            </div>
            <div class="message-content">
                <p><strong>Checking offline help...</strong> Searching the local response library.</p>
            </div>
        `;
        chatMessages.appendChild(loadingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Send to offline assistant
        document.getElementById('aiHelpInput').value = '';
        const response = window.staticChatbot && typeof window.staticChatbot.getBotResponse === 'function'
            ? window.staticChatbot.getBotResponse(message, context)
            : {
                text: 'Offline chatbot is not loaded. Please refresh the page.',
                suggestions: []
            };

        // Remove loading
        loadingDiv.remove();

        // Add AI response
        const aiMessageDiv = document.createElement('div');
        aiMessageDiv.className = 'ai-message';

        let formattedResponse = response && response.text ? response.text : 'No response';
        formattedResponse = formatAIResponse(formattedResponse);

        aiMessageDiv.innerHTML = `
            <div class="message-avatar">
                <i class='bx bx-bot'></i>
            </div>
            <div class="message-content">
                ${formattedResponse}
            </div>
        `;
        chatMessages.appendChild(aiMessageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (error) {
        console.error('Error sending AI message:', error);
        const chatMessages = document.getElementById('aiHelpMessages');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'ai-message';
        errorDiv.innerHTML = `
            <div class="message-avatar error-avatar">
                <i class='bx bx-error'></i>
            </div>
            <div class="message-content">
                <p><strong>Error:</strong> ${escapeHtml(error.message)}</p>
            </div>
        `;
        chatMessages.appendChild(errorDiv);
    }
}

// Format AI response with proper structure and indentation
function formatAIResponse(text) {
    // Convert markdown-like formatting to HTML
    let formatted = escapeHtml(String(text || ''));
    
    // Handle headers (### Header)
    formatted = formatted.replace(/^### (.*?)$/gm, '<h4>$1</h4>');
    formatted = formatted.replace(/^## (.*?)$/gm, '<h4>$1</h4>');
    formatted = formatted.replace(/^# (.*?)$/gm, '<h4>$1</h4>');
    
    // Handle bold (**text**)
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/__(.*?)__/g, '<strong>$1</strong>');
    
    // Handle italic (*text*)
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/_(.*?)_/g, '<em>$1</em>');
    
    // Handle code blocks (```code```) with copy button
    formatted = formatted.replace(/```([\s\S]*?)```/g, function(match, code) {
        const escapedCode = code.trim();
        const copyId = 'ai-code-' + Math.random().toString(36).substr(2, 9);
        return `
            <div class="ai-code-block" style="position: relative; background: #2d2d30; border-radius: 6px; margin: 10px 0;">
                <button class="copy-code-btn" onclick="copyAiCode('${copyId}', this)" type="button">
                    <i class='bx bx-copy'></i> Copy
                </button>
                <pre id="${copyId}" style="margin: 0; padding: 12px; padding-top: 38px;"><code>${escapedCode}</code></pre>
            </div>
        `;
    });
    
    // Handle inline code (`code`)
    formatted = formatted.replace(/`(.*?)`/g, '<code>$1</code>');
    
    // Handle numbered lists
    formatted = formatted.replace(/^\d+\.\s+(.*?)$/gm, '<li>$1</li>');
    formatted = formatted.replace(/(<li>.*?<\/li>)/s, '<ol>$1</ol>');
    
    // Handle bullet lists
    formatted = formatted.replace(/^[-*]\s+(.*?)$/gm, '<li>$1</li>');
    formatted = formatted.replace(/(<li>.*?<\/li>)/s, function(match) {
        if (!match.includes('<ol>')) {
            return '<ul>' + match + '</ul>';
        }
        return match;
    });
    
    // Handle line breaks
    formatted = formatted.replace(/\n\n/g, '</p><p>');
    formatted = '<p>' + formatted + '</p>';
    
    // Clean up multiple tags
    formatted = formatted.replace(/<p><\/p>/g, '');
    formatted = formatted.replace(/<p>(<h4>)/g, '$1');
    formatted = formatted.replace(/(<\/h4>)<\/p>/g, '$1');
    formatted = formatted.replace(/<p>(<ol>)/g, '$1');
    formatted = formatted.replace(/(<\/ol>)<\/p>/g, '$1');
    formatted = formatted.replace(/<p>(<ul>)/g, '$1');
    formatted = formatted.replace(/(<\/ul>)<\/p>/g, '$1');
    formatted = formatted.replace(/<p>(<pre>)/g, '$1');
    formatted = formatted.replace(/(<\/pre>)<\/p>/g, '$1');
    
    return formatted;
}

function copyAiCode(elementId, btnEl) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const text = element.textContent || '';
    navigator.clipboard.writeText(text).then(() => {
        if (!btnEl) return;
        const original = btnEl.innerHTML;
        btnEl.innerHTML = '<i class="bx bx-check"></i> Copied!';
        btnEl.classList.add('copied');
        setTimeout(() => {
            btnEl.innerHTML = original;
            btnEl.classList.remove('copied');
        }, 1500);
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Copy failed: ' + err.message);
    });
}

function goBackToDashboard() {
    if (confirm('Go back to dashboard? Unsaved changes will be lost.')) {
        window.location.href = 'student-dashboard.html';
    }
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    const modal = document.getElementById('taskModal');
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});
