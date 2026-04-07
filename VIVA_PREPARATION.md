# Viva Preparation - Virtual Lab Workbench

This guide is based on the current codebase, not just the high-level README. Use it as your quick revision sheet before the viva.

## 1. 30-Second Introduction

"Virtual Lab Workbench is a web-based virtual laboratory platform for computer science students. It allows students to log in, receive assigned tasks, write code in the browser, run that code inside isolated Docker containers, and track their progress through analytics and gamification. The backend is built with Node.js and Express, the database is MongoDB, authentication is handled using JWT, and AI support is available through OpenAI or Gemini, with an additional local offline chatbot on the student editor side."

## 2. Problem Statement

Traditional lab environments have three common problems:

- students depend on physical lab availability
- software setup differs across systems
- teachers find it hard to track progress centrally

This project solves that by giving a browser-based lab environment with centralized task management, isolated code execution, analytics, and guided assistance.

## 3. Main Objective

To build a virtual lab platform where:

- admins can create labs and tasks in the current build
- students can access assigned lab work remotely
- code can be executed safely in isolated containers
- progress, errors, and engagement can be tracked
- students receive learning support through AI and guided help

## 4. Core Modules

### Frontend

- built with HTML, CSS, and vanilla JavaScript
- key pages: `login.html`, `student-dashboard.html`, `admin-dashboard.html`, `code-editor.html`
- frontend API wrapper is in `Scripts/api.js`

### Backend

- built with Node.js and Express
- entry point: `backend/server.js`
- routes are grouped by feature such as auth, labs, containers, AI, analytics, gamification, assigned tasks, monitoring, and notifications

### Database

- MongoDB with Mongoose models
- main models: `User`, `Lab`, `Task`, `AssignedTask`, `Analytics`, `Gamification`, `Container`

### Execution Engine

- code is executed using Docker, not on the host machine directly
- runner logic is in `backend/utils/runner.js`
- supports Python, JavaScript, Java, C, and C++

## 5. High-Level Architecture

```text
Browser UI
  ->
Frontend JS (fetch API via Scripts/api.js)
  ->
Express REST API
  ->
Controllers and Services
  ->
MongoDB + Docker + AI Provider
```

### Important Backend Integrations

- MongoDB stores users, tasks, analytics, gamification, submissions, and notifications
- Docker runs user code inside temporary isolated containers
- AI service can use OpenAI or Gemini depending on environment variables
- Socket initialization exists for real-time features and monitoring broadcasts

## 6. End-to-End Flow to Explain in Viva

### Student Login Flow

1. Student logs in using username and password.
2. Backend validates the user from MongoDB.
3. Password is compared using bcrypt.
4. JWT token is generated and returned.
5. Frontend stores the token and sends it in future API requests.

### Assigned Task Flow

1. Admin assigns a task to one student, a batch, or all students.
2. An `AssignedTask` document is created per student.
3. Student dashboard loads assigned tasks from the backend.
4. Student opens the code editor for a selected task.
5. Student runs code through `/api/assigned-tasks/:id/run`.
6. Backend sends the code to the Docker-based runner.
7. Output, errors, exit code, and execution time are returned.
8. Analytics and activity logs are updated.
9. Student submits the final solution once.

### Free Code Execution Flow

1. Authenticated user sends code to `/api/code/execute`.
2. Backend runner creates a temporary Docker container.
3. Code file and stdin file are copied into the container.
4. Program is compiled or executed inside the container.
5. Logs are collected.
6. Container is removed after execution.

## 7. Why Docker Is Used

This is one of the most likely viva questions.

Short answer:

- Docker isolates untrusted student code from the host machine
- each run happens in a temporary environment
- resource usage can be controlled using memory, CPU, PID, and timeout limits
- it avoids dependency mismatch across student systems

What the current code does:

- disables network during execution
- applies memory and CPU limits
- enforces a timeout of 30 seconds
- drops Linux capabilities and uses `no-new-privileges`
- removes the temporary execution container after the run

## 8. AI Integration Explanation

The project supports two AI layers:

### Backend AI APIs

- handled through `backend/utils/aiService.js`
- provider can be OpenAI or Gemini
- current backend logic is OpenAI-first by default unless `AI_PROVIDER=gemini`
- used for chat, debug help, explanation, and Docker help

### Local Offline Chatbot in Student Editor

- editor help also uses a local keyword-based chatbot from `Scripts/chatbot.js`
- this provides quick offline guidance from a local response dataset

Best viva answer:

"The project supports both cloud AI and local guided assistance. Cloud AI is exposed through backend APIs using OpenAI or Gemini, while the editor also contains a lightweight offline chatbot for quick contextual help."

## 9. Analytics and Gamification

### Analytics

Analytics stores:

- time spent
- completion status
- actions performed
- execution attempts
- errors made

This helps measure student progress and lab difficulty.

### Gamification

Gamification stores:

- points
- XP
- level
- rank
- badges
- achievements

Points are awarded for events like:

- starting a lab
- completing a lab
- first-attempt completion

This improves engagement and motivation.

## 10. Key Database Models to Explain

### User

- stores username, email, hashed password, role, batch, section, and profile details

### Lab

- stores lab metadata, Docker template details, category, resources, ports, and assignment scope

### Task

- stores title, description, lab reference, deadline, and submission records

### AssignedTask

- stores one task instance per student
- tracks status, submission, grade, review decision, and timestamps

### Analytics

- stores actions, errors, attempts, completion status, and session timing

### Gamification

- stores points, badges, achievements, level, rank, and activity statistics

## 11. Security Features

Mention these clearly:

- JWT-based authentication
- bcrypt password hashing
- route protection middleware
- role-based authorization
- Docker isolation for code execution
- disabled network for execution containers
- execution timeout and resource limits
- production safety check for missing default JWT secret

## 12. Technology Choices and Why

### Why Node.js and Express?

- lightweight and fast for API development
- easy asynchronous handling for I/O-heavy tasks
- good ecosystem for Docker, JWT, MongoDB, and REST APIs

### Why MongoDB?

- flexible schema for labs, tasks, analytics, and gamification
- easy to model nested documents like submission history and points history

### Why Vanilla JavaScript Frontend?

- simple project structure
- low setup overhead
- easy to deploy and demonstrate

### Why JWT?

- stateless authentication
- easy to send with each API call from the browser

## 13. Important Routes You Can Name in Viva

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Code Execution

- `POST /api/code/execute`
- `POST /api/assigned-tasks/:id/run`
- `PUT /api/assigned-tasks/:id/submit`

### AI

- `POST /api/ai/chat`
- `POST /api/ai/debug`
- `POST /api/ai/explain`
- `GET /api/ai/status`

### Analytics and Gamification

- `POST /api/analytics/track`
- `GET /api/analytics/stats`
- `POST /api/gamification/award`
- `GET /api/gamification/leaderboard`

## 14. Likely Viva Questions with Short Answers

### What is the novelty of your project?

It combines virtual labs, isolated code execution, task management, analytics, gamification, notifications, and AI-guided support in one learning platform.

### How is this different from a normal coding website?

It is education-focused. It includes assigned tasks, batch-based management, analytics, grading, gamification, and monitoring rather than only code execution.

### How do you execute code safely?

User code runs in temporary Docker containers with limits on memory, CPU, process count, network access, and execution time.

### Why not run code directly on the server?

Running untrusted code directly on the host is risky. Docker gives process isolation and better resource control.

### How do you authenticate users?

After login, the backend creates a JWT token. Protected routes verify the token and load the user from the database.

### How are passwords stored?

Passwords are hashed using bcrypt before saving to MongoDB.

### How does role-based access work?

Protected routes use middleware to verify JWT, and authorization middleware checks whether the user role is allowed for that route.

### Why did you choose MongoDB?

The project contains flexible and evolving data such as analytics actions, errors, points history, achievements, and submissions, which are convenient to model in MongoDB.

### How does AI work in your project?

The backend exposes AI endpoints and can use OpenAI or Gemini depending on configuration. The student editor also has a local offline chatbot for quick response support.

### What languages are supported for execution?

Python, JavaScript, Java, C, and C++.

### How do you handle user input for programs?

The editor checks whether code likely needs stdin, collects input from the user, and sends it to the runner along with the code.

### How are analytics collected?

The frontend sends tracking events such as task start, run attempts, completion, and errors. The backend stores these in the `Analytics` collection.

### What is the purpose of gamification?

It increases engagement through points, levels, badges, achievements, and leaderboard features.

### Can admins monitor the system?

Yes. There are monitoring and container-management APIs for administrative visibility.

### What happens if AI is not configured?

The platform still works for labs and execution. AI requests return a configuration or availability error instead of crashing the whole system.

### What happens if Docker is unavailable?

The server still starts, but code execution features will fail until Docker becomes available.

### What happens if MongoDB is unavailable?

The backend retries connection several times, and if it still cannot connect, startup is stopped because the app depends on database access.

## 15. Honest Limitations to Mention

This section is important. If an examiner asks about gaps, answer confidently.

- forgot-password and reset-password APIs are present but not implemented yet
- some documentation still describes teacher role, while the current `User` model uses `student`, `admin`, and `faculty`; however, the current lab, task, and assignment routes are effectively admin-only
- the editor AI help is partly local/offline, so cloud AI is not the only help path
- the project focuses more on safe execution and workflow tracking than on deep automatic code evaluation with hidden test cases
- some README content is broader than the exact current implementation, so the codebase is the ground truth

Best answer:

"The system is functional end-to-end, but a few features are intentionally left as future scope, such as password reset flow and more advanced automatic assessment."

## 16. Future Scope

Good future enhancements:

- stronger automated test-case evaluation and plagiarism checks
- richer faculty workflows and grading rubrics
- live collaborative coding
- video or voice-based tutoring
- deployment on cloud infrastructure with scaling
- better dashboard visualizations
- audit logs and stronger admin reporting

## 17. Short Demo Script for Viva

If seeded users are available, you can use:

- admin: `admin / admin123`
- student: `student1 / student123`

Suggested live demo order:

1. Show login page and explain JWT-based authentication.
2. Log in as student and open assigned tasks.
3. Open one assigned task in the editor.
4. Write a simple program and run it.
5. Show output and explain Docker-based execution.
6. Mention that analytics and activity are tracked on each run.
7. Submit the task and explain one-time submission flow.
8. Show gamification or notifications on the dashboard.
9. If needed, explain admin-side task assignment and monitoring.

## 18. Best One-Line Answers

Use these when the examiner asks for a quick summary.

- "It is a browser-based virtual lab with safe Docker execution and learning analytics."
- "Docker is the key security layer because student code never runs directly on the host."
- "JWT secures the API, MongoDB stores flexible learning data, and Express manages the API layer."
- "The project is not only a code runner; it is a complete academic workflow system."
- "AI is integrated as a support layer, not as the only dependency."

## 19. Files Worth Remembering

- `backend/server.js`
- `backend/utils/runner.js`
- `backend/utils/aiService.js`
- `backend/controllers/assignedTaskController.js`
- `backend/controllers/analyticsController.js`
- `backend/controllers/gamificationController.js`
- `backend/models/User.js`
- `backend/models/AssignedTask.js`
- `Scripts/api.js`
- `Scripts/code-editor.js`
- `Scripts/student-dashboard.js`

## 20. Final Viva Tip

Do not try to claim every planned feature as fully complete. The strongest defense is:

"These are the features implemented in the current build, these are the limitations, and this is how I would extend it next."
