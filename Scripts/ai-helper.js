// Frontend Implementation Example: Using Gemini AI with Virtual Lab Workbench
// Location: Scripts/ai-helper.js

/**
 * AI Helper Module - Frontend utilities for AI Tutor
 * Works with both Gemini and OpenAI backends
 */

class AIHelper {
    constructor(jwtToken) {
        this.token = jwtToken;
        this.apiBase = 'http://localhost:5000/api/ai';
        this.isLoading = false;
    }

    /**
     * Send a message to AI Tutor
     * @param {string} message - User message
     * @param {object} context - Optional context (code, etc.)
     * @returns {Promise<string>} - AI response
     */
    async chat(message, context = {}) {
        try {
            this.isLoading = true;
            const response = await fetch(`${this.apiBase}/chat`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message, context })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const { success, data } = await response.json();
            if (!success) throw new Error('AI request failed');
            return data;
        } catch (error) {
            console.error('AI Chat Error:', error);
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Debug code with AI help
     * @param {string} code - Code to debug
     * @param {string} language - Programming language
     * @returns {Promise<string>} - Debug response
     */
    async debugCode(code, language = 'python') {
        try {
            this.isLoading = true;
            const response = await fetch(`${this.apiBase}/debug`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code, language })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const { success, data } = await response.json();
            if (!success) throw new Error('Debug request failed');
            return data.response;
        } catch (error) {
            console.error('AI Debug Error:', error);
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Explain code with AI help
     * @param {string} code - Code to explain
     * @returns {Promise<string>} - Explanation
     */
    async explainCode(code) {
        try {
            this.isLoading = true;
            const response = await fetch(`${this.apiBase}/explain`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ instructions: code })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const { success, data } = await response.json();
            if (!success) throw new Error('Explain request failed');
            return data;
        } catch (error) {
            console.error('AI Explain Error:', error);
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Get Docker command help
     * @param {string} command - Docker command
     * @returns {Promise<string>} - Help response
     */
    async getDockerHelp(command) {
        try {
            this.isLoading = true;
            const response = await fetch(`${this.apiBase}/docker-help`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ command })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const { success, data } = await response.json();
            if (!success) throw new Error('Docker help request failed');
            return data.response;
        } catch (error) {
            console.error('AI Docker Help Error:', error);
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Check AI status (which provider is active)
     * @returns {Promise<object>} - { provider: string, enabled: boolean, apiKey: string }
     */
    async getStatus() {
        try {
            const response = await fetch(`${this.apiBase}/status`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const { success, data } = await response.json();
            if (!success) throw new Error('Status check failed');
            return data;
        } catch (error) {
            console.error('AI Status Error:', error);
            throw error;
        }
    }
}

// ========== USAGE EXAMPLES ==========

/**
 * Example 1: Initialize AIHelper in your page
 */
function initializeAI() {
    const jwtToken = localStorage.getItem('token');  // Get token from login
    const ai = new AIHelper(jwtToken);

    // Check which AI provider is active
    ai.getStatus().then(status => {
        console.log(`Using ${status.provider} AI`)
    });

    return ai;
}

/**
 * Example 2: Add "Ask AI" button to code editor
 */
function addAIButton() {
    const btn = document.createElement('button');
    btn.innerText = '🤖 Ask AI';
    btn.onclick = async () => {
        const ai = initializeAI();
        const selectedCode = window.getSelection().toString();
        
        if (!selectedCode) {
            alert('Please select code first');
            return;
        }

        const explanation = await ai.explainCode(selectedCode);
        showModal('Code Explanation', explanation);
    };

    document.getElementById('editor-tools').appendChild(btn);
}

/**
 * Example 3: Debug button that shows errors and fixes
 */
function addDebugButton() {
    const btn = document.createElement('button');
    btn.innerText = '🐞 Debug My Code';
    btn.onclick = async () => {
        const ai = initializeAI();
        const code = document.getElementById('code-editor').value;
        const lang = document.getElementById('language').value || 'python';

        btn.disabled = true;
        btn.innerText = '⏳ Debugging...';

        try {
            const fix = await ai.debugCode(code, lang);
            showModal('Debug Results', fix);
        } finally {
            btn.disabled = false;
            btn.innerText = '🐞 Debug My Code';
        }
    };

    document.getElementById('editor-tools').appendChild(btn);
}

/**
 * Example 4: AI Tutor chat box in sidebar
 */
function createAIChatBox() {
    const ai = initializeAI();

    const chatBox = document.createElement('div');
    chatBox.id = 'ai-chat';
    chatBox.innerHTML = `
        <div class="ai-chat-header">
            <h3>🤖 AI Tutor</h3>
            <span class="ai-status">${ai.provider || 'Loading...'}</span>
        </div>
        <div id="ai-messages" class="ai-messages"></div>
        <input type="text" id="ai-input" placeholder="Ask me anything..." />
        <button onclick="sendAIMessage()">Send</button>
    `;

    document.body.appendChild(chatBox);

    // Add CSS
    const style = document.createElement('style');
    style.textContent = `
        #ai-chat {
            position: fixed;
            right: 20px;
            bottom: 20px;
            width: 350px;
            max-height: 500px;
            border: 1px solid #ddd;
            border-radius: 8px;
            background: white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            flex-direction: column;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .ai-chat-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px;
            border-radius: 8px 8px 0 0;
        }
        .ai-messages {
            flex: 1;
            overflow-y: auto;
            padding: 15px;
            max-height: 350px;
        }
        .ai-message {
            margin-bottom: 10px;
            padding: 8px 12px;
            border-radius: 6px;
            word-wrap: break-word;
            font-size: 14px;
        }
        .ai-message.user {
            background: #e3f2fd;
            text-align: right;
            margin-left: 30px;
        }
        .ai-message.assistant {
            background: #f5f5f5;
            margin-right: 30px;
        }
        #ai-input {
            padding: 10px;
            border: none;
            border-top: 1px solid #eee;
            font-size: 14px;
        }
        #ai-chat button {
            padding: 10px;
            background: #667eea;
            color: white;
            border: none;
            cursor: pointer;
            font-weight: bold;
        }
        #ai-chat button:hover {
            background: #764ba2;
        }
    `;
    document.head.appendChild(style);
}

async function sendAIMessage() {
    const ai = initializeAI();
    const input = document.getElementById('ai-input');
    const message = input.value.trim();

    if (!message) return;

    const messagesDiv = document.getElementById('ai-messages');

    // Add user message
    const userMsg = document.createElement('div');
    userMsg.className = 'ai-message user';
    userMsg.textContent = message;
    messagesDiv.appendChild(userMsg);

    input.value = '';
    input.disabled = true;

    try {
        // Get AI response
        const response = await ai.chat(message);

        // Add AI message
        const aiMsg = document.createElement('div');
        aiMsg.className = 'ai-message assistant';
        aiMsg.textContent = response;
        messagesDiv.appendChild(aiMsg);

        // Auto-scroll to bottom
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    } catch (error) {
        const errMsg = document.createElement('div');
        errMsg.className = 'ai-message assistant';
        errMsg.textContent = '❌ Error: ' + error.message;
        messagesDiv.appendChild(errMsg);
    } finally {
        input.disabled = false;
        input.focus();
    }
}

// ========== UTILITIES ==========

function showModal(title, content) {
    const modal = document.createElement('div');
    modal.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <h2>${title}</h2>
                <pre>${escapeHtml(content)}</pre>
                <button onclick="this.closest('.modal-overlay').remove()">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Add styles if not already present
    if (!document.getElementById('modal-styles')) {
        const style = document.createElement('style');
        style.id = 'modal-styles';
        style.textContent = `
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            }
            .modal-content {
                background: white;
                padding: 30px;
                border-radius: 8px;
                max-width: 600px;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            }
            .modal-content pre {
                background: #f5f5f5;
                padding: 15px;
                border-radius: 4px;
                overflow-x: auto;
            }
        `;
        document.head.appendChild(style);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== EXPORTS ==========
// If using modules:
// export { AIHelper, initializeAI, createAIChatBox };
