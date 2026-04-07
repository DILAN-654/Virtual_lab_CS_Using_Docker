# Virtual Lab Workbench 🧪

A comprehensive **AI-Integrated Virtual Laboratory Platform** for computer science education. Students can write code, execute it in isolated Docker containers, get AI-powered tutoring, and track their learning progress.

**🆓 Free AI Tutoring** using Google Gemini API | **🔧 Code Execution** in Docker | **📊 Analytics** & Gamification | **📚 Lab Templates** for hands-on learning

For viva revision, see [VIVA_PREPARATION.md](VIVA_PREPARATION.md).

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 20.x (LTS) or higher
- **Docker** (for container execution)
- **MongoDB** (for data storage)
- **Google Gemini API Key** (free from https://aistudio.google.com/app/apikey)

### Installation (5 minutes)

```bash
# 1. Clone/navigate to project
cd d:/MCA_MAIN_PROJECT/Project

# 2. Backend setup
cd backend
npm install

# 3. Get Gemini API Key
# Visit: https://aistudio.google.com/app/apikey
# Copy your key

# 4. Configure .env
echo "GEMINI_API_KEY=your_key_here" >> .env
echo "AI_PROVIDER=gemini" >> .env

# 5. Start backend
npm start

# 6. Frontend (in another terminal)
cd ..
# Open index.html in browser or use a local server
python -m http.server 8000
```

**✅ Done!** Visit `http://localhost:8000`

---

## 📖 Table of Contents

1. [Project Overview](#project-overview)
2. [Features](#features)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Setup Guide](#setup-guide)
6. [API Documentation](#api-documentation)
7. [AI Integration](#ai-integration)
8. [Docker Integration](#docker-integration)
9. [Database Models](#database-models)
10. [Frontend Guide](#frontend-guide)
11. [Troubleshooting](#troubleshooting)
12. [Contributing](#contributing)

---

## 🎯 Project Overview

**Virtual Lab Workbench** is an educational platform that combines:

- **💻 Code Editor** - Write Python, JavaScript, Java, C, and C++ programs
- **🐳 Docker Integration** - Execute code in isolated containers
- **🤖 AI Tutoring** - Real-time help with code via Gemini/OpenAI
- **📚 Lab Templates** - Pre-configured environments (Python, Node.js, etc.)
- **🏆 Gamification** - Points, achievements, leaderboards
- **📊 Analytics** - Track student progress and performance
- **👥 Multi-Role Support** - Admin, Teachers, Students

### Use Cases

| Role | Use Case |
|------|----------|
| **Students** | Write code, submit labs, get instant AI help |
| **Teachers** | Create labs, assign tasks, grade submissions |
| **Admin** | Manage users, content, system resources |

---

## ✨ Features

### 🧠 AI-Powered Learning
- ✅ **Chat with AI Tutor** - Ask questions anytime
- ✅ **Code Explanation** - Understand how code works
- ✅ **Debug Assistance** - Find and fix errors
- ✅ **Code Generation** - Get code templates
- ✅ **Docker Command Help** - Learn Docker easily
- ✅ **Free Tier Support** - Gemini (60 req/min, 2000 req/day)

### 💻 Code Execution
- ✅ **Multi-Language Support** - Python, JavaScript, Java, C, and C++
- ✅ **Isolated Containers** - Safe code execution
- ✅ **Real-time Output** - Instant feedback
- ✅ **Error Detection** - Clear error messages
- ✅ **File Upload** - Process CSV, text files

### 📚 Lab Management
- ✅ **Lab Templates** - Pre-built environments
- ✅ **Task Assignment** - Create and assign tasks
- ✅ **Progress Tracking** - Monitor student work
- ✅ **File Management** - Upload/download submissions
- ✅ **Lab Scheduling** - Time-based access

### 🏆 Gamification & Analytics
- ✅ **Achievement System** - Earn badges
- ✅ **Points & Leaderboard** - Compete and celebrate
- ✅ **Progress Analytics** - Visual learning metrics
- ✅ **Performance Reports** - Detailed student stats

---

## 🏗️ Technology Stack

### Backend
| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js 20+ |
| **Framework** | Express.js 4.18 |
| **Database** | MongoDB 5.0 |
| **Authentication** | JWT (jsonwebtoken) |
| **Container** | Docker & Dockerode |
| **AI Providers** | Google Gemini, OpenAI |
| **File Upload** | Multer 2.0 |
| **API** | REST with Socket.io |

### Frontend
| Layer | Technology |
|-------|-----------|
| **Markup** | HTML5 |
| **Styling** | CSS3 (Responsive) |
| **JavaScript** | Vanilla JS + Fetch API |
| **Code Editor** | CodeMirror (embedded) |
| **Real-time** | Socket.io client |

### DevOps
| Tool | Purpose |
|------|---------|
| **Docker** | Container execution |
| **Docker Compose** | Multi-container orchestration |
| **MongoDB** | Data persistence |

---

## 📁 Project Structure

```
Project/
├── index.html                          # Landing page
├── login.html                          # Login/Signup
├── student-dashboard.html              # Student main interface
├── admin-dashboard.html                # Admin panel
├── code-editor.html                    # Code editor
├── free-editor.html                    # Simple editor
├── lab-templates/                      # Docker images
│   ├── python-dev/                    # Python environment
│   ├── node-dev/                      # Node.js environment
│   └── network-minimal/               # Base network setup
├── Scripts/                            # Frontend JavaScript
│   ├── login.js                       # Authentication
│   ├── student-dashboard.js           # Dashboard logic
│   ├── admin-dashboard.js             # Admin features
│   ├── code-editor.js                 # Editor functionality
│   ├── api.js                         # API client
│   ├── ai-helper.js                   # AI integration
│   └── diagnostic-code-execution.js   # Code runner
├── Style/                              # CSS files
│   ├── login.css
│   ├── student-dashboard.css
│   ├── admin-dashboard.css
│   ├── code-editor.css
│   └── responsive.css
├── uploads/                            # User uploaded files
├── backend/                            # Backend API
│   ├── server.js                      # Main server
│   ├── package.json                   # Dependencies
│   ├── .env                           # Configuration
│   ├── config/                        # Configuration files
│   │   ├── database.js               # MongoDB connection
│   │   └── dockerClient.js           # Docker setup
│   ├── models/                        # Database schemas
│   │   ├── User.js
│   │   ├── Lab.js
│   │   ├── Task.js
│   │   ├── AssignedTask.js
│   │   ├── Analytics.js
│   │   └── ... (more models)
│   ├── controllers/                   # Business logic
│   │   ├── aiController.js           # AI endpoints
│   │   ├── authController.js         # Auth logic
│   │   ├── containerController.js    # Docker
│   │   ├── labController.js          # Lab management
│   │   ├── userController.js         # User management
│   │   └── ... (more controllers)
│   ├── routes/                        # API routes
│   │   ├── ai.js                     # /api/ai/*
│   │   ├── auth.js                   # /api/auth/*
│   │   ├── labs.js                   # /api/labs/*
│   │   ├── containers.js             # /api/containers/*
│   │   ├── tasks.js                  # /api/tasks/*
│   │   └── ... (more routes)
│   ├── utils/                         # Helper modules
│   │   ├── aiService.js              # AI integration (Gemini/OpenAI)
│   │   ├── GeminiService.js          # Gemini integration
│   │   ├── dockerService.js          # Docker utilities
│   │   ├── languageDetector.js       # Language detection
│   │   └── runner.js                 # Code execution
│   ├── middleware/                    # Express middleware
│   │   └── auth.js                   # JWT protection
│   ├── scripts/                       # Utility scripts
│   │   ├── seedUsers.js              # Add test users
│   │   ├── seedLabsAndTasks.js       # Create labs
│   │   └── ... (more scripts)
│   └── uploads/                       # File uploads
├── docker-compose.yml                  # Container orchestration
├── Dockerfile                          # Backend image
├── package.json                        # Root dependencies
├── README.md                           # This file
├── GEMINI_INTEGRATION_SUMMARY.md       # AI integration guide
└── GEMINI_QUICK_START.md              # Quick reference
```

---

## ⚙️ Setup Guide

### 1️⃣ Backend Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env  # or create manually

# Edit .env with your settings
```

### 2️⃣ Environment Variables (.env)

```env
# Server
NODE_ENV=development
PORT=5000
CORS_ORIGIN=http://localhost:8000

# Database (MongoDB)
MONGODB_URI=mongodb://localhost:27017/virtual-lab-workbench

# JWT
JWT_SECRET=your_secret_key_here
JWT_EXPIRE=30d

# AI Provider: 'gemini' or 'openai'
AI_PROVIDER=gemini
AI_ENABLED=true

# Google Gemini (FREE - Get from https://aistudio.google.com/app/apikey)
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-1.5-flash

# OpenAI (Optional - Paid)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.3-codex
OPENAI_FALLBACK_MODEL=gpt-5-mini

# Docker
DOCKER_HOST=unix:///var/run/docker.sock  # Linux/Mac
# DOCKER_HOST=npipe:////./pipe/docker_engine  # Windows

# Optional
CORS_ORIGIN=http://localhost:8000
```

### 3️⃣ Database Setup

**Option A: Local MongoDB**
```bash
# Windows (if MongoDB is installed)
mongod

# Or use MongoDB Atlas (free cloud database)
# 1. Go to https://www.mongodb.com/cloud/atlas
# 2. Create account
# 3. Create cluster
# 4. Get connection string
# 5. Add to MONGODB_URI in .env
```

**Option B: Docker MongoDB**
```bash
docker run -d -p 27017:27017 --name mongodb mongo
```

### 4️⃣ Docker Setup

```bash
# Windows - Install Docker Desktop
# Mac - Install Docker Desktop
# Linux - Install Docker Engine

# Verify installation
docker --version
docker run hello-world
```

### 5️⃣ Start Backend

```bash
cd backend
npm start

# Expected output:
# ✅ Server running on port 5000
# ✅ MongoDB connected
# ✅ Docker client ready
```

### 6️⃣ Frontend Development

```bash
# Option 1: Python (quick)
python -m http.server 8000

# Option 2: Node.js http-server
npm install -g http-server
http-server -p 8000

# Open browser: http://localhost:8000
```

---

## 🌐 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication
All protected endpoints require JWT token in header:
```
Authorization: Bearer <token>
```

### 🔐 Authentication Routes

####  POST `/auth/signup`
Register new user
```javascript
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "student"  // 'student' | 'teacher' | 'admin'
}
```

#### POST `/auth/login`
Login and get JWT
```javascript
{
  "email": "john@example.com",
  "password": "password123"
}
```

Response:
```javascript
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "user": {
      "id": "64f...",
      "name": "John Doe",
      "role": "student"
    }
  }
}
```

### 🤖 AI Routes

All require authentication

#### POST `/ai/chat`
Chat with AI tutor
```javascript
{
  "message": "How do I write a loop in Python?",
  "context": { }
}
```

#### POST `/ai/debug`
Debug code
```javascript
{
  "code": "x = 10\nprint(y)",
  "language": "python"
}
```

#### POST `/ai/explain`
Explain code
```javascript
{
  "instructions": "def factorial(n): return n * factorial(n-1) if n > 1 else 1"
}
```

#### POST `/ai/docker-help`
Get Docker command help
```javascript
{
  "command": "docker run"
}
```

#### GET `/ai/status`
Check AI provider status
```javascript
// Response:
{
  "success": true,
  "data": {
    "provider": "gemini",
    "enabled": true,
    "apiKey": "present"
  }
}
```

### 💻 Container Routes

#### POST `/containers/execute`
Execute code in container
```javascript
{
  "code": "print('Hello World')",
  "language": "python",
  "timeout": 30
}
```

Response:
```javascript
{
  "success": true,
  "data": {
    "stdout": "Hello World\n",
    "stderr": "",
    "exitCode": 0,
    "executionTime": 245
  }
}
```

### 📚 Lab Routes

#### GET `/labs`
Get all labs
```javascript
// Query params
?role=student&page=1&limit=10
```

#### POST `/labs`
Create new lab (teacher/admin only)
```javascript
{
  "title": "Python Basics",
  "description": "Learn Python fundamentals",
  "template": "python-dev",
  "tasks": ["task1", "task2"]
}
```

#### GET `/labs/:id`
Get specific lab

#### PUT `/labs/:id`
Update lab

#### DELETE `/labs/:id`
Delete lab

### ✅ Task Routes

#### GET `/tasks`
Get all tasks

#### POST `/tasks`
Create task
```javascript
{
  "title": "Sum Two Numbers",
  "description": "Write code to sum two numbers",
  "labId": "64f...",
  "difficulty": "easy",
  "testCases": [
    { "input": "2, 3", "output": "5" },
    { "input": "10, 20", "output": "30" }
  ]
}
```

### 👥 User Routes

#### GET `/users/me`
Get current user profile

#### PUT `/users/me`
Update profile
```javascript
{
  "name": "John Doe Updated",
  "bio": "Computer Science Student"
}
```

#### GET `/users/:id`
Get user by ID (admin/teacher)

#### POST `/users/:id/disable`
Disable user (admin only)

### 📊 Analytics Routes

#### GET `/analytics/progress/:userId`
Get student progress
```javascript
{
  "tasksCompleted": 15,
  "averageScore": 85,
  "learningTrend": [65, 72, 78, 85],
  "topicsProgress": {
    "python": 90,
    "javascript": 75
  }
}
```

#### POST `/analytics/track`
Track user activity

---

## 🤖 AI Integration

### Switching Providers

#### Option 1: Gemini (FREE) ⭐
```env
AI_PROVIDER=gemini
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-1.5-flash
```

**Benefits:**
- ✅ 100% FREE
- ✅ 60 requests/minute
- ✅ 2,000 requests/day
- ✅ Fast responses

#### Option 2: OpenAI (PAID)
```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.3-codex
OPENAI_FALLBACK_MODEL=gpt-5-mini
```

**Benefits:**
- ✅ More powerful
- ✅ Better accuracy
- ✅ Faster processing
- ⚠️ Costs money (~$0.10-0.30 per 1M tokens)

### Getting Gemini API Key

1. Visit: https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key
4. Add to `.env`:
   ```env
   GEMINI_API_KEY=abc123xyz...
   ```
5. Restart backend

### AI Features

| Feature | Gemini | OpenAI |
|---------|--------|--------|
| Chat | ✅ | ✅ |
| Code Explanation | ✅ | ✅ |
| Debug Code | ✅ | ✅ |
| Generate Code | ✅ | ✅ |
| Docker Help | ✅ | ✅ |
| Speed | 🚀 Fast | ⚡ Very Fast |
| Cost | 🆓 Free | 💰 Paid |
| Accuracy | 95% | 99% |

---

## 🐳 Docker Integration

### Supported Environments

| Template | Use Case | Tools |
|----------|----------|-------|
| **python-dev** | Python programming | Python 3.11, pip, numpy, requests |
| **node-dev** | JavaScript programming | Node 20, npm, yarn |
| **eclipse-temurin:21** | Java programming | JDK 21 |
| **gcc:13** | C and C++ programming | GCC, G++ |
| **network-minimal** | Networking | curl, netcat, ping, traceroute |

### Execute Code

```javascript
// In JavaScript
const response = await fetch('/api/containers/execute', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    code: 'print("Hello")',
    language: 'python'
  })
});

const result = await response.json();
console.log(result.data.stdout); // "Hello\n"
```

### Execution Limits

```env
CONTAINER_TIMEOUT=30        # seconds
CONTAINER_MEMORY_LIMIT=256m # RAM
CONTAINER_CPU_LIMIT=1       # CPU cores
```

---

## 🗄️ Database Models

### User
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  password: String (hashed),
  role: 'student' | 'teacher' | 'admin',
  avatar: String,
  bio: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Lab
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  creator: ObjectId (User),
  template: String,
  tasks: [ObjectId],
  difficulty: 'beginner' | 'intermediate' | 'advanced',
  createdAt: Date,
  updatedAt: Date
}
```

### Task
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  lab: ObjectId,
  difficulty: String,
  testCases: [{ input, output }],
  hints: [String],
  solutions: [String],
  createdAt: Date
}
```

### Analytics
```javascript
{
  _id: ObjectId,
  user: ObjectId,
  tasksCompleted: Number,
  averageScore: Number,
  timeSpent: Number (minutes),
  lastActivity: Date
}
```

---

## 👨‍💻 Frontend Guide

### Key Pages

#### 1. **Login Page** (`login.html`)
- Signup/Login functionality
- Form validation
- Password reset (optional)

#### 2. **Student Dashboard** (`student-dashboard.html`)
- View assigned labs
- Track progress
- Access code editor
- Check analytics

#### 3. **Code Editor** (`code-editor.html`)
- Write code in 10+ languages
- Real-time syntax highlighting
- Execute code
- Get AI help
- View output

#### 4. **Admin Dashboard** (`admin-dashboard.html`)
- Manage users
- Create labs
- Monitor system
- View analytics

### Using AI Helper

```javascript
// Initialize
const ai = new AIHelper(jwtToken);

// Chat
const response = await ai.chat("How do I sort a list?");

// Explain code
const explanation = await ai.explainCode("for i in range(10): print(i)");

// Debug
const fix = await ai.debugCode(buggyCode, 'python');

// Docker help
const help = await ai.getDockerHelp('docker run');
```

### Responsive Design

- ✅ Mobile (320px+)
- ✅ Tablet (768px+)
- ✅ Desktop (1024px+)
- ✅ Large screens (1440px+)

---

## 🆘 Troubleshooting

### Server Won't Start

```bash
# Check Node version
node --version  # Should be 14+

# Check port 5000 is available
netstat -lntp | grep 5000  # Linux/Mac

# Clear npm cache
npm cache clean --force
npm install
```

### MongoDB Connection Error

```bash
# Check MongoDB is running
# Windows
mongod

# Mac
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Or use MongoDB Atlas (cloud)
```

### AI Returns Error

```bash
# Check API key is set
echo $GEMINI_API_KEY

# Verify .env file
cat backend/.env | grep GEMINI

# Check rate limit
# Gemini: 60 requests/minute, 2000/day
# Wait a minute if limit exceeded
```

### Docker Container Fails

```bash
# Check Docker is running
docker --version

# Check Docker daemon
docker ps

# Check container logs
docker logs container_name

# Restart Docker
# Windows: Restart Docker Desktop
# Linux: sudo systemctl restart docker
```

### Code Execution Timeout

```env
# Increase timeout in .env
CONTAINER_TIMEOUT=60  # from 30
```

### Port Already in Use

```bash
# Find and kill process using port 5000
# Linux/Mac
lsof -i :5000
kill -9 <PID>

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

---

## 📊 Testing

### Test AI Integration

```bash
cd backend
node test-gemini.js
```

Expected output:
```
✅ Login successful
✅ AI Status retrieved
✅ Chat successful
✅ Explain successful
✅ Debug successful
✅ Docker help successful

Total: 6/6 tests passed
```

### Seed Test Data

```bash
cd backend/scripts
node seedUsers.js          # Create test users
node seedLabsAndTasks.js  # Create sample labs
```

---

## 🚀 Deployment

### Production Checklist

- [ ] Update `.env` with production values
- [ ] Use strong `JWT_SECRET`
- [ ] Set `NODE_ENV=production`
- [ ] Use MongoDB Atlas (cloud)
- [ ] Setup HTTPS/SSL
- [ ] Configure CORS properly
- [ ] Monitor logs
- [ ] Setup backups
- [ ] Use environment-specific configs

### Docker Deployment

```bash
# Build Docker image
docker build -t virtual-lab-backend .

# Run container
docker run -d \
  -p 5000:5000 \
  -e MONGODB_URI=mongodb://mongo:27017/virtual-lab-workbench \
  -e GEMINI_API_KEY=your_key \
  --name virtual-lab \
  virtual-lab-backend
```

### Docker Compose

```bash
# Start all services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f backend
```

---

## 📝 Contributing

### Code Standards

- ✅ Use ES6+ syntax
- ✅ Add JSDoc comments
- ✅ Follow naming conventions
- ✅ Write error handling
- ✅ Test before committing

### Bug Reports

Create issue with:
- Description
- Steps to reproduce
- Expected vs actual behavior
- Screenshots (if applicable)
- System info (OS, Node version, etc)

### Feature Requests

Describe:
- Problem it solves
- How it works
- Potential benefits
- Alternatives

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| `README.md` | Project overview (this file) |
| `GEMINI_INTEGRATION_SUMMARY.md` | AI setup guide |
| `GEMINI_QUICK_START.md` | Quick reference |
| `backend/.env` | Configuration template |
| `backend/GEMINI_SETUP.md` | Detailed AI guide |

---

## 🎓 Learning Resources

### Getting Started
- [Express.js Tutorial](https://expressjs.com/)
- [MongoDB Guide](https://docs.mongodb.com/)
- [Docker Basics](https://docs.docker.com/)

### AI Integration
- [Google Gemini Docs](https://ai.google.dev/docs)
- [OpenAI API](https://platform.openai.com/docs)

### Frontend
- [CodeMirror Editor](https://codemirror.net/)
- [Socket.io Real-time](https://socket.io/)

---

## 📞 Support

### Getting Help

1. **Check Documentation**: See `README.md` and `GEMINI_QUICK_START.md`
2. **Review Examples**: Check `/backend/test-gemini.js`
3. **Check Logs**: Run with debug mode: `DEBUG=* npm start`
4. **Search Issues**: Look for similar problems reported

### Debug Mode

```bash
# Enable detailed logging
DEBUG=* npm start

# Or specific module
DEBUG=express:* npm start
```

---

## 📄 License

This project is provided as-is for educational purposes.

---

## 👥 Version Info

| Component | Version | Status |
|-----------|---------|--------|
| Backend | 1.0.0 | ✅ Active |
| Frontend | 1.0.0 | ✅ Active |
| AI (Gemini) | 1.0.0 | ✅ Integrated |
| AI (OpenAI) | 1.0.0 | ✅ Integrated |

**Last Updated**: March 7, 2026

---

## 🎯 Roadmap (Future)

- [ ] Collaborative coding
- [ ] Code review system
- [ ] Advanced debugging
- [ ] More language support (Go, Rust, PHP)
- [ ] Mobile app
- [ ] Video tutorials
- [ ] Live instructor sessions
- [ ] Peer-to-peer learning
- [ ] Team competitions
- [ ] Certificate generation

---

## 💡 Quick Tips

### Speed Up Development
```env
# Disable AI for faster testing
AI_ENABLED=false

# Use local MongoDB (faster than cloud)
MONGODB_URI=mongodb://localhost:27017/...
```

### Monitor Performance
```bash
# Check memory usage
npm install -g clinic
clinic doctor -- node server.js
```

### Use Nodemon for Auto-Restart
```bash
npm install --save-dev nodemon
npm run dev  # Uses nodemon
```

---

## 🎉 You're Ready!

You now have a fully functional AI-integrated virtual laboratory platform. Here's what's possible:

1. ✅ Students write and execute code
2. ✅ AI tutors help them learn
3. ✅ Teachers track progress
4. ✅ Analytics show improvement
5. ✅ Gamification keeps them engaged

**Next Steps:**
1. Get Gemini API key: https://aistudio.google.com/app/apikey
2. Update `.env` with your key
3. Run `npm install` and `npm start`
4. Open http://localhost:8000

**Happy Learning!** 🚀

---

**For detailed AI setup**, see [GEMINI_QUICK_START.md](GEMINI_QUICK_START.md) or [GEMINI_INTEGRATION_SUMMARY.md](GEMINI_INTEGRATION_SUMMARY.md)
