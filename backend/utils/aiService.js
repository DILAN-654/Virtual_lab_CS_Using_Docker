// Project/backend/utils/aiService.js
// AI Service - OpenAI-first with optional Gemini fallback

const OpenAI = require('openai');
const geminiService = require('./GeminiService');

class AIService {
  constructor() {
    this.enabled = String(process.env.AI_ENABLED || '').toLowerCase() !== 'false';
    this.provider = (process.env.AI_PROVIDER || 'openai').toLowerCase();

    if (this.provider === 'gemini') {
      this.service = geminiService;
      return;
    }

    this.provider = 'openai';
    this.model = process.env.OPENAI_MODEL || 'gpt-5.3-codex';
    this.fallbackModel = process.env.OPENAI_FALLBACK_MODEL || 'gpt-5-mini';
    this.lastModelUsed = this.model;
    this.hasApiKey = !!process.env.OPENAI_API_KEY;
    this.client = this.hasApiKey
      ? new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
          timeout: 20000,
        })
      : null;
  }

  async askAI(prompt, extraContext = {}) {
    try {
      if (!this.enabled) {
        return { success: false, message: 'AI is disabled on this server.' };
      }

      if (this.provider === 'gemini') {
        return await this.service.askAI(prompt, extraContext);
      }

      if (!this.hasApiKey) {
        return { success: false, message: 'AI is not configured (missing OPENAI_API_KEY).' };
      }

      const modelsToTry = [this.model];
      if (this.fallbackModel && this.fallbackModel !== this.model) {
        modelsToTry.push(this.fallbackModel);
      }

      let lastError = null;
      for (let index = 0; index < modelsToTry.length; index += 1) {
        const candidateModel = modelsToTry[index];

        try {
          const response = await this.client.responses.create({
            model: candidateModel,
            store: false,
            instructions: this.buildSystemInstructions(extraContext),
            input: this.buildPrompt(prompt, extraContext),
            max_output_tokens: 900,
          });

          const answer = String(
            response.output_text || this.extractResponseText(response.output || [])
          ).trim();

          if (!answer) {
            return { success: false, message: 'AI returned an empty response.' };
          }

          this.lastModelUsed = candidateModel;
          return { success: true, response: answer };
        } catch (error) {
          lastError = error;
          console.error(
            'OPENAI ERROR:',
            candidateModel,
            error?.status || error?.code || '',
            error?.message || error
          );

          const hasAnotherModel = index < modelsToTry.length - 1;
          if (!hasAnotherModel || !this.shouldTryFallback(error)) {
            break;
          }
        }
      }

      return { success: false, message: this.getOpenAIErrorMessage(lastError) };
    } catch (error) {
      console.error('OPENAI ERROR:', error?.status || error?.code || '', error?.message || error);
      return { success: false, message: this.getOpenAIErrorMessage(error) };
    }
  }

  shouldTryFallback(error) {
    const status = Number(error?.status || error?.response?.status || 0);
    const code = String(error?.code || '').toUpperCase();
    const message = String(error?.message || '').toLowerCase();

    if ([400, 404, 408, 409, 429].includes(status) || status >= 500) {
      return true;
    }

    if (['ECONNABORTED', 'ECONNRESET', 'ETIMEDOUT'].includes(code)) {
      return true;
    }

    return message.includes('model') || message.includes('timeout');
  }

  buildSystemInstructions(context) {
    const language = context?.language ? `Primary language: ${context.language}. ` : '';

    return (
      'You are an AI tutor for computer science students using a virtual lab. ' +
      'Be concise, beginner-friendly, and practical. ' +
      'When debugging, explain the issue first, then provide the fix. ' +
      'Prefer short sections and code blocks only when they help. ' +
      language
    ).trim();
  }

  buildPrompt(prompt, context) {
    const lower = String(prompt || '').toLowerCase();
    const sections = [];

    if (context.task) sections.push(`Task: ${context.task}`);
    if (context.type) sections.push(`Workspace: ${context.type}`);
    if (context.language) sections.push(`Language: ${context.language}`);
    if (context.code) {
      sections.push(
        `Current code:\n\`\`\`${context.language || ''}\n${context.code}\n\`\`\``
      );
    }

    if (lower.includes('explain the code') || lower.includes('explain this code')) {
      sections.push('Explain the code step-by-step in simple language.');
      return sections.join('\n\n');
    }

    if (lower.includes('give code') || lower.includes('write code') || lower.includes('generate code')) {
      sections.push(`Write clean, commented code for this request:\n${prompt}`);
      sections.push('After the code, explain how it works in simple terms.');
      return sections.join('\n\n');
    }

    if (lower.includes('debug') || lower.includes('find the error') || lower.includes('fix this')) {
      sections.push(`Debug this request:\n${prompt}`);
      sections.push('Identify the mistake, explain it clearly, and then provide fixed code.');
      return sections.join('\n\n');
    }

    sections.push(`Student question:\n${prompt}`);
    sections.push('Explain clearly and provide examples if needed.');
    return sections.join('\n\n');
  }

  extractResponseText(outputItems) {
    const parts = [];

    for (const item of outputItems) {
      if (!item || item.type !== 'message' || !Array.isArray(item.content)) continue;

      for (const contentItem of item.content) {
        if (contentItem?.type === 'output_text' && contentItem.text) {
          parts.push(contentItem.text);
        }
      }
    }

    return parts.join('\n\n');
  }

  getOpenAIErrorMessage(error) {
    const status = Number(error?.status || error?.response?.status || 0);

    if (status === 401) {
      return 'OpenAI rejected the API key. Please verify OPENAI_API_KEY.';
    }

    if (status === 429) {
      return 'OpenAI rate limit reached. Please wait a moment and try again.';
    }

    if (status >= 500) {
      return 'OpenAI is temporarily unavailable. Please try again shortly.';
    }

    return error?.message || 'AI request failed. Please try again.';
  }

  // Controller wrappers
  async sendMessage(message, context = {}) {
    const result = await this.askAI(message, context);
    if (result.success) return result.response;
    throw new Error(result.message || 'AI request failed');
  }

  async debugCode(code, language = 'python') {
    const result = await this.askAI('debug', { code, language });
    if (result.success) return result.response;
    throw new Error(result.message || 'Debug failed');
  }

  async getDockerHelp(command) {
    const prompt = `Explain how to use this Docker command and provide examples: ${command}`;
    const result = await this.askAI(prompt);
    if (result.success) return result.response;
    throw new Error(result.message || 'Docker help unavailable');
  }

  async explainInstructions(instructions) {
    const result = await this.askAI('explain the code', { code: instructions });
    if (result.success) return result.response;
    throw new Error(result.message || 'Explanation failed');
  }

  get apiKey() {
    if (this.provider === 'gemini') return this.service.apiKey;
    return this.hasApiKey ? 'present' : 'missing';
  }

  get currentProvider() {
    return this.provider;
  }

  get primaryModel() {
    return this.model;
  }

  get backupModel() {
    return this.fallbackModel;
  }

  get activeModel() {
    return this.lastModelUsed || this.model;
  }
}

module.exports = new AIService();
