// Free Editor JavaScript - Unrestricted Programming Lab

let currentLanguage = 'python';
let autoSaveTimer = null;
let stopRequested = false;
let editorStorageScope = null;
let saveRequestInFlight = false;

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
    return buildScopedStorageKey('free-editor', 'code');
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
        console.debug('[FREE EDITOR] language validation skipped:', error.message);
    }

    return { valid: true };
}

function getInputStorageKey() {
    return buildScopedStorageKey('free-editor', 'stdin');
}

function getRunHistoryStorageKey() {
    return buildScopedStorageKey('free-editor', 'run-history');
}

function setWorkspaceLanguageLabel(language = currentLanguage) {
    const languageLabel = document.getElementById('workspaceLanguageText');
    if (languageLabel) {
        languageLabel.textContent = getLanguageDisplayName(language || 'python').toUpperCase();
    }
}

function syncRuntimeInputCardState() {
    const runtimeCard = document.getElementById('runtimeInputCard');
    const stdinEl = document.getElementById('standardInput');
    if (!runtimeCard || !stdinEl) return;

    runtimeCard.classList.toggle('has-value', Boolean(String(stdinEl.value || '').trim()));
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

function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = String(reader.result || '');
            const base64 = result.includes(',') ? result.split(',')[1] : result;
            resolve(base64);
        };
        reader.onerror = () => reject(reader.error || new Error('Failed to read file.'));
        reader.readAsDataURL(file);
    });
}

async function buildExecutionPayload(code, language, stdin = '') {
    let processedCode = String(code || '');
    const normalizedLanguage = String(language || currentLanguage).toLowerCase();

    if (normalizedLanguage === 'javascript') {
        processedCode = `(function() {\n${processedCode}\n})();`;
    }

    if (normalizedLanguage === 'python') {
        const csvFileInput = document.getElementById('csvFile');
        if (csvFileInput && csvFileInput.files && csvFileInput.files.length > 0) {
            const csvBase64 = await readFileAsBase64(csvFileInput.files[0]);
            const prelude = `import base64\n_csv_b64 = "${csvBase64}"\nwith open('uploaded_file.csv','wb') as _f:\n    _f.write(base64.b64decode(_csv_b64))\n`;
            processedCode = `${prelude}\n${processedCode}`;
        }
    }

    return {
        code: processedCode,
        language: normalizedLanguage,
        stdin: stdin || ''
    };
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

    if (spinner) spinner.hidden = normalizedState !== 'running';

    if (runBtn) {
        if (!runBtn.dataset.defaultHtml) runBtn.dataset.defaultHtml = runBtn.innerHTML;
        runBtn.disabled = normalizedState === 'running';
        runBtn.innerHTML = normalizedState === 'running'
            ? '<i class="bx bx-loader-alt bx-spin"></i> Running'
            : runBtn.dataset.defaultHtml;
    }

    if (detail) setConsoleMeta(detail);
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

function appendRunHistory(entry) {
    const items = readRunHistory();
    items.unshift({
        status: entry.status || 'success',
        title: entry.title || 'Run complete',
        detail: entry.detail || '',
        language: entry.language || currentLanguage,
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

function renderRunHistory(entries) {
    const container = document.getElementById('runHistoryContainer');
    if (!container) return;

    if (!entries.length) {
        container.innerHTML = '<div class="run-history-empty">Your latest executions will appear here.</div>';
        return;
    }

    container.innerHTML = entries.map((entry) => {
        const timestamp = entry.at ? new Date(entry.at).toLocaleString() : '';
        const languageLabel = escapeHtml(getLanguageDisplayName(entry.language || currentLanguage));
        const statusKey = escapeHtml(String(entry.status || 'success').toLowerCase());
        const statusLabel = escapeHtml(String(entry.status || 'success').replace(/-/g, ' '));

        return `
            <div class="run-history-item">
                <div>
                    <strong>${escapeHtml(entry.title)}</strong>
                    <p>${escapeHtml(entry.detail || '')}</p>
                    <small>${timestamp} | ${languageLabel}</small>
                </div>
                <span class="run-history-status ${statusKey}">${statusLabel}</span>
            </div>
        `;
    }).join('');
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

async function executeRun(payload) {
    renderTerminalTranscript({
        notice: `Executing ${getLanguageDisplayName(payload.language || currentLanguage)} code...`
    });
    setExecutionState('running', 'Code is running inside the virtual lab container...');
    updateErrorsDisplay('', 'Waiting for the latest execution result.');

    const codeSnapshot = String(payload.code || '');
    const languageSnapshot = String(payload.language || currentLanguage);
    const stdinSnapshot = String(payload.stdin || '');

    const response = await window.api.request('/code/execute', {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    if (response && response.success) {
        const data = response.data;
        const stdout = data.stdout || '';
        const stderr = data.stderr || '';
        const executionMs = Number(data.executionTime || 0);

        if (stderr) {
            const errorLabel = classifyExecutionError(stderr, languageSnapshot);
            renderTerminalTranscript({ stdin: stdinSnapshot, stdout, stderr });
            setExecutionState('error', `${errorLabel}. Review the terminal console for details.`);
            switchToTab('console');
            appendRunHistory({
                status: 'error',
                title: errorLabel,
                detail: stderr.split('\n')[0] || 'Execution failed',
                language: languageSnapshot
            });
        } else {
            renderTerminalTranscript({ stdin: stdinSnapshot, stdout, stderr: '' });
            setExecutionState('success', executionMs > 0 ? `Run completed in ${executionMs} ms.` : 'Run completed successfully.');
            switchToTab('console');
            appendRunHistory({
                status: 'success',
                title: 'Execution complete',
                detail: stdout ? stdout.split('\n')[0] : 'Program completed with no output',
                language: languageSnapshot
            });
        }
        return { success: true, data };
    }

    const errorMsg = response?.message || 'No output from runner';
    renderTerminalTranscript({ stdin: stdinSnapshot, stderr: errorMsg });
    setExecutionState('error', 'Execution failed before a result was returned.');
    switchToTab('console');
    appendRunHistory({
        status: 'error',
        title: 'Execution Error',
        detail: errorMsg,
        language: languageSnapshot
    });
    return { success: false, message: errorMsg };
}

// Requirement: do not preload template/default code. Start empty unless the user previously saved code.

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Check authentication
        const token = sessionStorage.getItem('token');
        if (!token) {
            alert('Please login first');
            window.location.href = 'login.html';
            return;
        }

        // Setup editor
        loadCodeEditor();
        setupTabs();
        setupCSVUpload();
        setupAutoSave();
        initializeRuntimePanel();
        setWorkspaceLanguageLabel(currentLanguage);

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
                    const saveIndicator = document.getElementById('saveIndicator');
                    if (saveIndicator) {
                        saveIndicator.textContent = 'Saved';
                        saveIndicator.classList.add('saved');
                        setTimeout(() => {
                            saveIndicator.classList.remove('saved');
                            saveIndicator.textContent = 'Auto-saving...';
                        }, 1200);
                    }
                } catch (err) {
                    console.error('[FREE EDITOR] Ctrl+S save failed:', err);
                }
            }

            // Esc to stop (best-effort client-side)
            if (e.key === 'Escape') {
                stopRequested = true;
                renderTerminalTranscript({ stderr: 'Execution stopped.' });
                setExecutionState('error', 'Execution stopped.');
                switchToTab('console');
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
        alert('Error loading editor: ' + error.message);
    }
});

function setupCSVUpload() {
    const csvSection = document.getElementById('csvUploadSection');
    const csvInput = document.getElementById('csvFile');
    const csvFileName = document.getElementById('csvFileName');

    if (!csvSection || !csvInput || !csvFileName) return;

    // Show only for Python
    csvSection.style.display = currentLanguage === 'python' ? 'block' : 'none';

    csvInput.addEventListener('change', async (e) => {
        try {
            if (!e.target.files || e.target.files.length === 0) {
                csvFileName.textContent = 'No file selected';
                return;
            }

            const file = e.target.files[0];
            csvFileName.textContent = file.name;
        } catch (err) {
            console.error('CSV upload read error:', err);
            alert('Failed to read CSV file: ' + err.message);
        }
    });
}

function setupTabs() {
    const tabs = document.querySelectorAll('.workspace-tab');
    if (!tabs.length) return;

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            switchToTab(tab.dataset.workspaceTab);
        });
    });
}

function changeLanguage(lang) {
    currentLanguage = normalizeLanguageKey(lang) || 'python';
    updateHighlight();
    setWorkspaceLanguageLabel(currentLanguage);

    const highlightContent = document.getElementById('codeHighlightContent');
    if (highlightContent) {
        highlightContent.className = `language-${currentLanguage}`;
    }

    // Toggle CSV upload visibility
    const csvSection = document.getElementById('csvUploadSection');
    if (csvSection) {
        csvSection.style.display = currentLanguage === 'python' ? 'block' : 'none';
    }
}

function updateHighlight() {
    const codeEditor = document.getElementById('codeEditor');
    const highlightContent = document.getElementById('codeHighlightContent');

    highlightContent.textContent = codeEditor.value;

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
        codeEditor.value = '';
    }

    if (highlightContent) {
        highlightContent.className = `language-${currentLanguage}`;
    }

    updateHighlight();

    // Initialize line numbers
    updateLineNumbers();
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

function setupAutoSave() {
    const codeEditor = document.getElementById('codeEditor');
    const saveIndicator = document.getElementById('saveIndicator');

    codeEditor.addEventListener('input', () => {
        updateLineNumbers();
        clearTimeout(autoSaveTimer);
        saveIndicator.textContent = 'Auto-saving...';
        saveIndicator.classList.remove('saved');

        autoSaveTimer = setTimeout(() => {
            localStorage.setItem(getCodeStorageKey(), codeEditor.value);
            saveIndicator.textContent = 'Saved';
            saveIndicator.classList.add('saved');

            setTimeout(() => {
                saveIndicator.classList.remove('saved');
                saveIndicator.textContent = 'Auto-saving...';
            }, 2000);
        }, 1000);
    });

    codeEditor.addEventListener('scroll', syncLineNumbersScroll);
}

async function runCode() {
    try {
        stopRequested = false;
        const code = document.getElementById('codeEditor').value;
        const stdinEl = document.getElementById('standardInput');
        const inputText = stdinEl ? stdinEl.value || '' : '';

        const runStartedAt = Date.now();
        const markRunEnd = async (result) => {
            const durationSec = Math.max(0, Math.floor((Date.now() - runStartedAt) / 1000));
            try {
                await window.api.trackAnalytics({
                    action: 'execution',
                    status: 'in-progress',
                    timeSpent: durationSec,
                    executionDelta: 1
                });
            } catch (e) {
                console.debug('[FREE EDITOR] analytics track failed:', e.message);
            }

            // Points: reward successful practice runs without inflating lab completion stats.
            if (!result || !result.stderr) {
                try {
                    await window.api.awardPoints('practice_run', { meta: { source: 'free-editor', durationSec } });
                } catch (e) {
                    console.debug('[FREE EDITOR] award points failed:', e.message);
                }
            }

            // Error event
            if (result && result.stderr) {
                try {
                    await window.api.awardPoints('error', { meta: { source: 'free-editor' } });
                    await window.api.trackAnalytics({
                        action: 'error',
                        errorType: String(result.stderr).slice(0, 180),
                        status: 'in-progress'
                    });
                } catch (e) {
                    console.debug('[FREE EDITOR] error track failed:', e.message);
                }
            }
        };

        switchToTab('console');
        renderTerminalTranscript({
            notice: `Preparing ${getLanguageDisplayName(currentLanguage)} code for execution...`
        });
        setExecutionState('running', 'Preparing your code for execution...');
        updateErrorsDisplay('', 'Waiting for the latest execution result.');

        if (!code || code.trim().length === 0) {
            renderTerminalTranscript({ stderr: 'Write some code before running.' });
            setExecutionState('error', 'Write some code before running.');
            switchToTab('console');
            return;
        }

        console.log('[FREE EDITOR] Running code. Language:', currentLanguage);

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
            switchToTab('console');
            return;
        }

        const requiresInput = detectRequiresInput(code, currentLanguage);
        if (requiresInput) {
            setInputVisibility(true);
            if (!inputText.trim()) {
                renderTerminalTranscript({
                    notice: 'Program input detected.\n\nEnter your values in the Standard Input box below, then click Run again.'
                });
                setExecutionState('input', 'Input detected. Add your stdin values and run again.');
                switchToTab('console');
                if (stdinEl) stdinEl.focus();
                appendRunHistory({
                    status: 'input',
                    title: 'Input required',
                    detail: 'The program requested stdin before it could continue.',
                    language: currentLanguage
                });
                return;
            }
        } else {
            setInputVisibility(false);
        }

        localStorage.setItem(getInputStorageKey(), requiresInput ? inputText : '');

        const payload = await buildExecutionPayload(code, currentLanguage, requiresInput ? inputText : '');
        const result = await executeRun(payload);
        setInputVisibility(false);
        if (stopRequested) {
            setExecutionState('error', 'Execution stopped.');
            return;
        }
        if (result && result.success) {
            const stdout = result.data.stdout || '';
            const stderr = result.data.stderr || '';
            await markRunEnd({ stdout, stderr });
        } else {
            await markRunEnd({ stdout: '', stderr: result.message || 'Execution failed' });
        }

    } catch (error) {
        console.error('[FREE EDITOR] Exception:', error);
        const message = 'Error: ' + error.message;
        renderTerminalTranscript({ stderr: message });
        setExecutionState('error', 'Execution failed unexpectedly.');
        appendRunHistory({
            status: 'error',
            title: 'Execution Error',
            detail: error.message,
            language: currentLanguage
        });

        try {
            await window.api.awardPoints('error', { meta: { source: 'free-editor' } });
        } catch (e) {
            console.debug('[FREE EDITOR] award error failed:', e.message);
        }
        
        switchToTab('console');
    }
}

// Helper function to switch tabs programmatically
function switchToTab(tabName) {
    let nextTab = String(tabName || 'console').toLowerCase();
    if (nextTab === 'output' || nextTab === 'errors') {
        nextTab = 'console';
    }
    if (!['editor', 'console', 'ai-help'].includes(nextTab)) {
        nextTab = 'console';
    }

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

function closeSaveModal() {
    document.getElementById('saveModal').style.display = 'none';
}

async function saveToMyLabs() {
    document.getElementById('saveModal').style.display = 'flex';
    
    // Pre-fill filename based on current language
    const language = document.getElementById('languageSelect').value;
    const timestamp = new Date().toISOString().split('T')[0];
    const defaultFileName = `free_lab_${timestamp}.${getExtensionForLanguage(language)}`;
    document.getElementById('fileName').value = defaultFileName;
}

async function confirmSaveToMyLabs() {
    if (saveRequestInFlight) return;

    try {
        const code = document.getElementById('codeEditor').value;
        const fileNameInput = document.getElementById('fileName');
        const fileName = fileNameInput ? fileNameInput.value : '';
        const description = document.getElementById('fileDescription').value;
        const topic = document.getElementById('fileTopic').value;
        const language = normalizeLanguageKey(document.getElementById('languageSelect').value);
        const saveModalPrimaryBtn = document.querySelector('#saveModal .btn-primary');
        
        if (!fileName) {
            alert('Please enter a file name');
            return;
        }
        
        if (!code || code.trim().length === 0) {
            alert('Please write some code before saving');
            return;
        }

        const languageValidation = await validateEditorCodeForSelectedLanguage('save');
        if (!languageValidation.valid) {
            alert(languageValidation.message);
            return;
        }

        const normalizedFileName = ensureFileNameMatchesLanguage(fileName, language);
        if (fileNameInput) {
            fileNameInput.value = normalizedFileName;
        }

        saveRequestInFlight = true;
        if (saveModalPrimaryBtn) {
            saveModalPrimaryBtn.disabled = true;
            saveModalPrimaryBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Saving...';
        }
        
        const fileData = {
            fileName: normalizedFileName,
            description,
            topic,
            code,
            language,
            type: 'free-lab'
        };
        
        const response = await window.api.createMyLabFile(fileData);
        
        if (response.success) {
            alert(response.message || 'Code saved successfully to My Lab Files!');
            closeSaveModal();
            
            // Update save indicator
            const saveIndicator = document.getElementById('saveIndicator');
            saveIndicator.textContent = 'Saved';
            saveIndicator.classList.add('saved');
            
            setTimeout(() => {
                saveIndicator.classList.remove('saved');
                saveIndicator.textContent = 'Auto-saving...';
            }, 2000);
        } else {
            throw new Error(response.message || 'Failed to save file');
        }
    } catch (error) {
        console.error('Error saving to My Lab Files:', error);
        alert('Error saving file: ' + error.message);
    } finally {
        saveRequestInFlight = false;
        const saveModalPrimaryBtn = document.querySelector('#saveModal .btn-primary');
        if (saveModalPrimaryBtn) {
            saveModalPrimaryBtn.disabled = false;
            saveModalPrimaryBtn.innerHTML = '<i class="bx bx-save"></i> Save File';
        }
    }
}

function getExtensionForLanguage(language) {
    return getLanguageFileExtension(language);
}

function showEditorInfo() {
    document.getElementById('infoModal').style.display = 'flex';
}

function closeInfoModal() {
    document.getElementById('infoModal').style.display = 'none';
}

function resetCode() {
    if (confirm('Clear code? Unsaved changes will be lost.')) {
        const codeEditor = document.getElementById('codeEditor');
        if (codeEditor) codeEditor.value = '';
        try {
            localStorage.removeItem(getCodeStorageKey());
        } catch (_) {}
        updateHighlight();
        updateLineNumbers();
    }
}

function downloadCode() {
    const code = document.getElementById('codeEditor').value;
    const ext = {
        python: 'py',
        java: 'java',
        javascript: 'js',
        c: 'c',
        cpp: 'cpp'
    }[currentLanguage] || 'txt';

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
            type: 'free-lab'
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
    const saveModal = document.getElementById('saveModal');
    const infoModal = document.getElementById('infoModal');
    
    if (e.target === saveModal) {
        closeSaveModal();
    }
    if (e.target === infoModal) {
        closeInfoModal();
    }
});
