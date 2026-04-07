# Google Gemini AI - Quick Reference

## 🚀 Get Started in 3 Minutes

### 1. Get API Key (1 minute)
```
https://aistudio.google.com/app/apikey → Copy key
```

### 2. Update `.env` (1 minute)
```env
GEMINI_API_KEY=abc123def456...
AI_PROVIDER=gemini
```

### 3. Run (1 minute)
```bash
cd backend
npm install
npm start
```

---

## 📡 API Endpoints

```bash
# Chat
curl -X POST http://localhost:5000/api/ai/chat \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message": "Explain Python"}'

# Debug Code
curl -X POST http://localhost:5000/api/ai/debug \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"code": "x = 5\nprint(x", "language": "python"}'

# Explain Code
curl -X POST http://localhost:5000/api/ai/explain \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"instructions": "def hello(): print(\"hi\")"}'

# Docker Help
curl -X POST http://localhost:5000/api/ai/docker-help \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"command": "docker run"}'

# Check Status
curl http://localhost:5000/api/ai/status \
  -H "Authorization: Bearer $TOKEN"
```

---

## 💻 Frontend Usage

```javascript
const ai = new AIHelper(jwtToken);

// Chat
const response = await ai.chat("What is a loop?");

// Explain
const explanation = await ai.explainCode(code);

// Debug
const fix = await ai.debugCode(buggyCode, 'python');

// Docker
const help = await ai.getDockerHelp('docker run');

// Status
const status = await ai.getStatus();
console.log(status.provider); // "gemini" or "openai"
```

---

## 🔧 Switch Providers

```env
# Gemini (FREE)
AI_PROVIDER=gemini
GEMINI_API_KEY=...

# OR OpenAI (PAID)
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

---

## 📊 Models Available

**Gemini:**
- `gemini-1.5-flash` ⭐ (fast, cheap, recommended)
- `gemini-1.5-pro` (powerful, slower)
- `gemini-pro` (older)

**OpenAI:**
- `gpt-5.3-codex` ⭐ (primary coding model)
- `gpt-5-mini` (backup model)

---

## 💰 Free Tier Limits

| Metric | Limit |
|--------|-------|
| Requests/minute | 60 |
| Requests/day | 2,000 |
| Cost | FREE |

---

## 🧪 Test It

```bash
# Run test suite
node backend/test-gemini.js

# Expected: ✅ All 6 tests pass
```

---

## 📁 Files Changed

| File | Change |
|------|--------|
| `backend/utils/GeminiService.js` | NEW - Gemini SDK |
| `backend/utils/aiService.js` | UPDATED - Both providers |
| `backend/.env` | ADDED - Gemini config |
| `backend/package.json` | ADDED - Google AI SDK |
| `Scripts/ai-helper.js` | NEW - Frontend helper |

---

## 🆘 Common Errors

```
❌ "GEMINI_API_KEY missing"
→ Get key from https://aistudio.google.com/app/apikey

❌ "429 Too Many Requests"
→ Hit rate limit (60 req/min). Wait or upgrade tier.

❌ "AI is disabled"
→ Set AI_ENABLED=true in .env

❌ "Wrong provider"
→ Check AI_PROVIDER setting
```

---

## 📚 Docs

- Full guide: `backend/GEMINI_SETUP.md`
- Summary: `GEMINI_INTEGRATION_SUMMARY.md`
- Frontend code: `Scripts/ai-helper.js`
- Test file: `backend/test-gemini.js`

---

## 🎯 Architecture

```
Frontend (ai-helper.js)
        ↓
    API Routes (/api/ai/*)
        ↓
    AIController
        ↓
    AIService (chooses provider)
        ↓
    GeminiService ← Gemini API
    OR OpenAI calls
```

---

**That's it! You're ready to use FREE AI tutoring!** 🎉
