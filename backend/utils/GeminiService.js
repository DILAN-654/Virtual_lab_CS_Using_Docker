// project/backend/utils/GeminiService.js
// AI Service to communicate with Google Gemini API
// Supports: Explain code, Generate code, Debug code, Fix errors, General help

const { GoogleGenerativeAI } = require("@google/generative-ai");

class GeminiService {

    constructor() {
        this.enabled = String(process.env.AI_ENABLED || '').toLowerCase() !== 'false';
        this.hasApiKey = !!process.env.GEMINI_API_KEY;
        
        if (this.hasApiKey) {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            this.model = genAI.getGenerativeModel({ 
                model: process.env.GEMINI_MODEL || "gemini-1.5-flash" 
            });
        }
    }

    /**
     * Main function - sends prompt to Gemini
     * @param {string} prompt - User message
     * @param {object} extraContext - Code or additional info
     */
    async askAI(prompt, extraContext = {}) {
        try {
            if (!this.enabled) {
                return {
                    success: false,
                    message: "AI is disabled on this server."
                };
            }

            if (!this.hasApiKey) {
                return {
                    success: false,
                    message: "AI is not configured (missing GEMINI_API_KEY)."
                };
            }

            const composedPrompt = this.buildPrompt(prompt, extraContext);

            const response = await this.model.generateContent(composedPrompt);
            const answer = response.response.text();

            return {
                success: true,
                response: answer
            };

        } catch (error) {
            console.error("GEMINI ERROR:", error.message);
            return {
                success: false,
                message: "Gemini request failed. Please try again."
            };
        }
    }

    /**
     * Detect user's intention:
     * - Explain code
     * - Generate code
     * - Debug code
     * - Fix errors
     * - General help
     */
    buildPrompt(prompt, context) {
        const lower = prompt.toLowerCase();
        let finalPrompt = "";

        // 🧠 1. EXPLAIN CODE
        if (lower.includes("explain the code") || lower.includes("explain this code")) {
            finalPrompt = `
Explain the following code step-by-step in simple language:

${context.code || "NO CODE PROVIDED"}

Keep the explanation clear and beginner-friendly.
            `;
        }

        // 💻 2. GENERATE CODE
        else if (
            lower.includes("give code") ||
            lower.includes("write code") ||
            lower.includes("generate code")
        ) {
            finalPrompt = `
Write clean, well-commented code for the following topic:

"${prompt}"

After writing the code, explain how it works in simple terms.

Language: ${context.language || "Python"}
            `;
        }

        // 🐞 3. DEBUG CODE
        else if (
            lower.includes("debug") ||
            lower.includes("find the error") ||
            lower.includes("fix this")
        ) {
            finalPrompt = `
Debug the following code:

${context.code || "NO CODE PROVIDED"}

Language: ${context.language || "Python"}

Please:
1. Identify the mistake
2. Explain the issue clearly
3. Provide the fixed code
            `;
        }

        // 📚 4. DEFAULT → GENERAL QUESTION
        else {
            finalPrompt = `
${prompt}

Explain clearly and provide examples if needed. Be concise and helpful.
            `;
        }

        return finalPrompt;
    }

    // ====== WRAPPER METHODS FOR CONTROLLERS ======

    // Main chat message handler
    async sendMessage(message, context = {}) {
        const result = await this.askAI(message, context);
        if (result.success) {
            return result.response; // Return just the text
        }
        throw new Error(result.message || 'Gemini request failed');
    }

    // Debug code specifically
    async debugCode(code, language = 'python') {
        const result = await this.askAI('debug', { code, language });
        if (result.success) {
            return result.response;
        }
        throw new Error(result.message || 'Debug failed');
    }

    // Get Docker help
    async getDockerHelp(command) {
        const prompt = `Explain how to use this Docker command and provide practical examples: ${command}`;
        const result = await this.askAI(prompt);
        if (result.success) {
            return result.response;
        }
        throw new Error(result.message || 'Docker help unavailable');
    }

    // Explain instructions
    async explainInstructions(instructions) {
        const result = await this.askAI(`explain the code`, { code: instructions });
        if (result.success) {
            return result.response;
        }
        throw new Error(result.message || 'Explanation failed');
    }

    // Add apiKey and provider properties for status checks
    get apiKey() {
        return this.hasApiKey ? 'present' : 'missing';
    }

    get provider() {
        return 'gemini';
    }
}

module.exports = new GeminiService();
