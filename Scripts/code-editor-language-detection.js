/**
 * Example: Language Detection in Code Editor
 * This shows how to integrate language detection into your code-editor.html
 * 
 * Add this to Scripts/code-editor.js or modify existing code
 */

// ===== LANGUAGE DETECTION INTEGRATION =====

/**
 * Detect language when student loads or pastes code
 */
async function detectAndSetLanguage(filename, codeContent = '') {
    try {
        console.log('🔍 Detecting language for:', filename);
        
        const response = await window.api.detectLanguage(filename, codeContent);
        
        if (!response.success) {
            console.error('Detection failed:', response.message);
            return null;
        }
        
        const detected = response.data;
        console.log(`✅ Detected: ${detected.language} (${detected.confidence}% confidence)`);
        
        // Update UI with detected language
        updateLanguageIndicator(detected.language, detected.confidence);
        
        // Set editor syntax highlighting if needed
        setEditorLanguage(detected.language);
        
        return detected.language;
        
    } catch (error) {
        console.error('Language detection error:', error);
        return null;
    }
}

/**
 * Update the UI to show detected language
 */
function updateLanguageIndicator(language, confidence) {
    const indicator = document.getElementById('languageIndicator');
    
    if (!indicator) {
        console.warn('Language indicator element not found');
        return;
    }
    
    const languageEmoji = {
        python: '🐍',
        java: '☕',
        cpp: '⚙️',
        javascript: '🟨',
        unknown: '❓'
    };
    
    const emoji = languageEmoji[language] || '❓';
    const confColor = confidence >= 80 ? '#4CAF50' : confidence >= 50 ? '#FFC107' : '#f44336';
    
    indicator.innerHTML = `
        <span style="color: ${confColor}; font-weight: bold;">
            ${emoji} ${language.toUpperCase()} (${confidence}%)
        </span>
    `;
}

/**
 * Configure editor for detected language
 * Example with Highlight.js or Monaco Editor
 */
function setEditorLanguage(language) {
    // If using Highlight.js
    if (window.hljs) {
        const editor = document.getElementById('codeEditor');
        if (editor) {
            // Set the language for syntax highlighting
            editor.setAttribute('class', `language-${language}`);
            hljs.highlightElement(editor);
        }
    }
    
    // If using Monaco Editor
    if (window.monaco && window.editor) {
        // Map our language names to Monaco language names
        const monacoLangMap = {
            python: 'python',
            java: 'java',
            cpp: 'cpp',
            javascript: 'javascript'
        };
        
        const monacoLanguage = monacoLangMap[language] || 'text';
        const model = window.editor.getModel();
        if (model) {
            window.monaco.editor.setModelLanguage(model, monacoLanguage);
        }
    }
}

/**
 * Validate code before submission
 * Ensures the detected language matches expected language
 */
async function validateCodeLanguageBeforeSubmit(filename, code, expectedLanguage = null) {
    const detected = await detectAndSetLanguage(filename, code);
    
    if (detected === 'unknown') {
        return {
            valid: false,
            error: '⚠️ Could not detect programming language. Check your file extension.',
            language: null
        };
    }
    
    // If an expected language is provided, check if it matches
    if (expectedLanguage && detected !== expectedLanguage) {
        return {
            valid: false,
            error: `⚠️ Expected ${expectedLanguage} but code looks like ${detected}`,
            language: detected
        };
    }
    
    return {
        valid: true,
        language: detected,
        message: `✅ Code validated as ${detected}`
    };
}

/**
 * Example: Hook into the Run button
 */
async function runCode() {
    const filename = document.getElementById('filename')?.value || 'untitled.py';
    const code = document.getElementById('codeEditor')?.value || '';
    
    // Detect language first
    const detected = await detectAndSetLanguage(filename, code);
    
    if (detected === 'unknown') {
        alert('⚠️ Cannot determine programming language. Check the filename extension.');
        return;
    }
    
    // Now proceed with running the code
    console.log(`🚀 Running ${detected} code...`);
    
    // Call your existing run function with detected language
    // e.g., runCodeOnBackend(code, detected);
}

/**
 * Example: Hook into the Submit button
 */
async function submitCode() {
    const filename = document.getElementById('filename')?.value || 'untitled.py';
    const code = document.getElementById('codeEditor')?.value || '';
    const assignedTaskId = document.getElementById('taskId')?.value;
    
    // Validate language
    const validation = await validateCodeLanguageBeforeSubmit(filename, code);
    
    if (!validation.valid) {
        alert(validation.error);
        return;
    }
    
    console.log(`✅ Code validated as ${validation.language}`);
    
    // Proceed with submission
    // e.g., submitAssignedTask(assignedTaskId, code, validation.language);
}

/**
 * Example: Get supported languages for UI display
 */
async function showSupportedLanguages() {
    try {
        const response = await window.api.getSupportedLanguages();
        
        if (response.success) {
            console.log('Supported languages:');
            response.data.forEach(lang => {
                console.log(`  - ${lang.name}: ${lang.extensions.join(', ')}`);
            });
            
            // Update UI dropdown or info panel
            updateLanguageSelect(response.data);
        }
    } catch (error) {
        console.error('Failed to fetch supported languages:', error);
    }
}

/**
 * Update a language selection dropdown
 */
function updateLanguageSelect(languages) {
    const select = document.getElementById('languageSelect');
    
    if (!select) return;
    
    select.innerHTML = '<option value="">Auto-detect</option>';
    
    languages.forEach(lang => {
        const option = document.createElement('option');
        option.value = lang.name;
        option.textContent = `${lang.name} (${lang.extensions.join(', ')})`;
        select.appendChild(option);
    });
}

// ===== INITIALIZATION =====

document.addEventListener('DOMContentLoaded', () => {
    // Load supported languages when page loads
    showSupportedLanguages();
    
    // Detect language when user selects or pastes code
    const codeEditor = document.getElementById('codeEditor');
    const filenameInput = document.getElementById('filename');
    
    if (codeEditor) {
        codeEditor.addEventListener('change', () => {
            const filename = filenameInput?.value || 'code.py';
            const code = codeEditor.value;
            detectAndSetLanguage(filename, code);
        });
    }
    
    if (filenameInput) {
        filenameInput.addEventListener('change', () => {
            const code = codeEditor?.value || '';
            detectAndSetLanguage(filenameInput.value, code);
        });
    }
    
    // Hook submit and run buttons
    const submitBtn = document.getElementById('submitBtn');
    const runBtn = document.getElementById('runBtn');
    
    if (submitBtn) {
        submitBtn.addEventListener('click', submitCode);
    }
    
    if (runBtn) {
        runBtn.addEventListener('click', runCode);
    }
});

// ===== REQUIRED HTML STRUCTURE =====
/*
Add these elements to your code-editor.html:

<div class="editor-container">
    <div class="editor-header">
        <input type="text" id="filename" placeholder="filename.py" />
        <div id="languageIndicator">
            Language: Auto-detect
        </div>
        <button id="runBtn">▶ Run</button>
        <button id="submitBtn">📤 Submit</button>
    </div>
    
    <textarea id="codeEditor" placeholder="Write your code here..."></textarea>
</div>
*/

