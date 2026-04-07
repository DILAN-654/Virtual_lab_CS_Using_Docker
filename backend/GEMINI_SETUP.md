# Google AI Studio (Gemini) Setup Guide

## 🚀 Quick Setup

### Step 1: Get your FREE API Key from Google AI Studio

1. **Visit**: [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. **Click** "Create API Key" button
3. **Select** a Google project (or create new one)
4. **Copy** the generated API key

### Step 2: Add API Key to `.env`

Update your `backend/.env` file:

```env
# Choose provider: 'openai' or 'gemini'
AI_PROVIDER=gemini
AI_ENABLED=true

# Google Gemini Configuration
GEMINI_API_KEY=your_api_key_here_xxxxxxxxxxxxxxx
GEMINI_MODEL=gemini-1.5-flash
```

### Step 3: Install Dependencies

```bash
cd backend
npm install
```

### Step 4: Run Your Server

```bash
npm start
```

---

## 📊 Gemini vs OpenAI Comparison

| Feature | Gemini (Free) | OpenAI (Paid) |
|---------|---------------|---------------|
| **Cost** | FREE | $0.10-$0.30 per 1M tokens |
| **Rate Limit** | 60 requests/min | Varies by plan |
| **Daily Limit** | 2,000 requests/day | No daily limit |
| **Model** | gemini-1.5-flash | gpt-5.3-codex |
| **Speed** | Fast | Fast |
| **Quality** | Excellent | Excellent |

---

## 🔧 How to Switch Providers

**In `backend/.env`, change only ONE line:**

```env
# Use Gemini (FREE)
AI_PROVIDER=gemini

# OR

# Use OpenAI (PAID)
AI_PROVIDER=openai
```

---

## 📝 Available Models

### Gemini Models
- **`gemini-1.5-flash`** (Recommended) - Fast, low-cost
- **`gemini-1.5-pro`** - More powerful
- **`gemini-pro`** - Older model

### OpenAI Models
- **`gpt-5.3-codex`** (Primary) - Main coding model
- **`gpt-5-mini`** (Backup) - Fallback model if the primary model fails

---

## 🧪 Testing the Integration

### Using cURL

```bash
# Test chat endpoint
curl -X POST http://localhost:5000/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"message": "Explain what Python is"}'

# Test debug endpoint
curl -X POST http://localhost:5000/api/ai/debug \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "code": "x = 5\nprint(x",
    "language": "python"
  }'

# Test explain endpoint
curl -X POST http://localhost:5000/api/ai/explain \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"instructions": "def hello():\n    print(\"hello\")"}'
```

### Using Frontend JS

```javascript
// auth.js - Get JWT token first
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({
    email: 'student@example.com',
    password: '123456'
  })
});
const { token } = await loginResponse.json();

// Test AI Chat
const aiResponse = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: 'How do I write a for loop in Python?'
  })
});
const { data } = await aiResponse.json();
console.log(data);  // AI response
```

---

## 🎯 Available AI Endpoints

### 1. **Chat** - General questions
```
POST /api/ai/chat
Body: { message: string, context?: object }
Response: { success: true, data: string }
```

### 2. **Debug** - Debug code
```
POST /api/ai/debug
Body: { code: string, language?: string }
Response: { success: true, data: { response: string } }
```

### 3. **Explain** - Explain code
```
POST /api/ai/explain
Body: { instructions: string }
Response: { success: true, data: string }
```

### 4. **Docker Help** - Get Docker help
```
POST /api/ai/docker-help
Body: { command: string }
Response: { success: true, data: { response: string } }
```

### 5. **Status** - Check AI status
```
GET /api/ai/status
Response: { success: true, data: { provider: string, apiKey: string, enabled: boolean } }
```

---

## 📋 Backend Code Architecture

### Files Created/Modified:

1. **`backend/utils/GeminiService.js`** (NEW)
   - Handles all Gemini API calls
   - Similar interface to OpenAI service
   - Auto-detects code explanations, debugging, etc.

2. **`backend/utils/aiService.js`** (UPDATED)
   - Now routes to correct provider (Gemini or OpenAI)
   - Uses `AI_PROVIDER` env variable
   - Maintains backward compatibility

3. **`backend/.env`** (UPDATED)
   - Added Gemini API key config
   - Can switch providers with one line

4. **`backend/package.json`** (UPDATED)
   - Added `@google/generative-ai` package

---

## ✅ Features Included

- ✅ Chat with AI tutor
- ✅ Debug code errors
- ✅ Explain code  
- ✅ Get Docker help
- ✅ Teacher dashboard integration
- ✅ Student dashboard integration
- ✅ Support for Python, JavaScript, Java, etc.
- ✅ Rate limiting protection (built-in to Gemini free tier)

---

## 🆘 Troubleshooting

### "AI is not configured (missing GEMINI_API_KEY)"
→ Check that `.env` has `GEMINI_API_KEY=your_key_here`

### "Gemini request failed"
→ Check API key is correct and not expired
→ Check rate limits (2,000 requests/day for free tier)

### 429 Too Many Requests
→ Free tier limited to 60 requests/minute
→ Upgrade Google AI Studio to increase limits

### Switch to OpenAI temporarily
→ Change `.env`: `AI_PROVIDER=openai`
→ Make sure `OPENAI_API_KEY` is set

---

## 📚 Useful Links

- **Google AI Studio**: https://aistudio.google.com
- **Gemini API Docs**: https://ai.google.dev/docs
- **Prompt Engineering Guide**: https://ai.google.dev/docs/prompt_engineering
- **OpenAI API Docs**: https://platform.openai.com/docs

---

## 🎓 Learning Path

1. **Get Free API Key** → https://aistudio.google.com/app/apikey
2. **Update `.env`** with GEMINI_API_KEY
3. **Run**: `npm install && npm start`
4. **Test**: Use cURL or frontend to hit `/api/ai/chat`
5. **Integrate**: Use in student dashboard

---

## 💡 Tips

- Use `gemini-1.5-flash` for speed and cost
- Use `gemini-1.5-pro` for complex tasks
- Free tier is perfect for educational use
- Monitor usage at: https://console.cloud.google.com

---

## 🔑 API Key Security

- ✅ Never commit `.env` to git (already in `.gitignore`)
- ✅ Never share API keys publicly
- ✅ Rotate keys regularly
- ✅ Use environment variables only
- ✅ Regenerate if accidentally exposed

---

**That's it! You're ready to use Gemini AI in your Virtual Lab Workbench!** 🎉
