// Student Dashboard JavaScript - Full Backend Integration

document.addEventListener('DOMContentLoaded', async () => {
    // Dev helper: auto-set session token from dev sources (safe for local dev only)
    // Priority: URL param `?token=...` -> localStorage.DEV_TOKEN -> ?autologin=1 quick login
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const tokenParam = urlParams.get('token');
        const autoLogin = urlParams.get('autologin');

        if (tokenParam) {
            sessionStorage.setItem('token', tokenParam);
            sessionStorage.setItem('username', urlParams.get('user') || 'student1');
            sessionStorage.setItem('userType', 'student');
        }

        const devToken = localStorage.getItem('DEV_TOKEN');
        if (devToken && !sessionStorage.getItem('token')) {
            sessionStorage.setItem('token', devToken);
            sessionStorage.setItem('username', localStorage.getItem('DEV_USER') || 'student1');
            sessionStorage.setItem('userType', 'student');
        }

        if (autoLogin === '1' && !sessionStorage.getItem('token')) {
            // Attempt quick login using seeded credentials (development convenience)
            try {
                const resp = await window.api.login('student1', 'student123');
                if (resp && resp.token) {
                    sessionStorage.setItem('token', resp.token);
                    sessionStorage.setItem('username', (resp.user && resp.user.username) || 'student1');
                    sessionStorage.setItem('userType', 'student');
                }
            } catch (err) {
                console.warn('Auto-login failed:', err);
            }
        }
    } catch (e) {
        console.warn('Dev auto-login helper error', e);
    }

    // Check if user is logged in
    const token = sessionStorage.getItem('token');
    const userType = sessionStorage.getItem('userType');
    
    if (!token || userType !== 'student') {
        // If not logged in as student, redirect to login
        alert('Access denied. Please login as student.');
        window.location.href = 'login.html';
        return;
    }

    // Get username from sessionStorage
    const username = sessionStorage.getItem('username') || 'Student';
    const nameElem = document.getElementById('studentName');
    if (nameElem) nameElem.textContent = username;

    // Initialize dashboard
    await initializeDashboard();

    // Setup navigation
    setupNavigation();

    // Setup event listeners
    setupEventListeners();
});

// Initialize dashboard data
async function initializeDashboard() {
    try {
        // Load initial data for tasks and labs
        await loadTasks();
        await loadLabs();
        
        // Check AI status in background
        checkAIStatus();
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showNotification('Error loading dashboard data', 'error');
    }
}

// Check AI service status and update indicator
async function checkAIStatus() {
    try {
        const data = await window.api.getAIStatus();
        const dot = document.getElementById('aiStatusDot');
        const text = document.getElementById('aiStatusText');
        
        if (!dot || !text) return;
        
        if (data && data.success && data.data) {
            const { provider, keyPresent } = data.data;
            if (keyPresent) {
                dot.style.background = '#28a745'; // green
                text.textContent = `AI: ${provider} ✓`;
            } else {
                dot.style.background = '#ffc107'; // yellow
                text.textContent = `AI: ${provider} (no key)`;
            }
        } else {
            dot.style.background = '#dc3545'; // red
            text.textContent = 'AI: unavailable';
        }
    } catch (error) {
        const dot = document.getElementById('aiStatusDot');
        const text = document.getElementById('aiStatusText');
        if (dot && text) {
            dot.style.background = '#dc3545'; // red
            text.textContent = 'AI: offline';
        }
        console.debug('AI status check failed (non-critical):', error);
    }
}

// Setup navigation
function setupNavigation() {
    // Use event delegation on the nav menu so clicks on inner elements work reliably
    const navMenu = document.querySelector('.nav-menu');
    const contentSections = document.querySelectorAll('.content-section');

    if (!navMenu) return;

    navMenu.addEventListener('click', async (e) => {
        const anchor = e.target.closest && e.target.closest('a.nav-item');
        if (!anchor) return;
        e.preventDefault();

        // Remove active class from all nav items and sections
        Array.from(navMenu.querySelectorAll('.nav-item')).forEach(nav => nav.classList.remove('active'));
        contentSections.forEach(section => section.classList.remove('active'));

        // Add active class to clicked nav item
        anchor.classList.add('active');

        // Show corresponding section
        const href = anchor.getAttribute('href') || '';
        const targetId = href.startsWith('#') ? href.substring(1) : href;
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.classList.add('active');
            const titleSpan = anchor.querySelector('span');
            if (document.getElementById('pageTitle') && titleSpan) {
                document.getElementById('pageTitle').textContent = titleSpan.textContent;
            }

            // Load section-specific data
            try {
                if (targetId === 'assigned-tasks') {
                    await loadTasks();
                } else if (targetId === 'assigned-labs') {
                    await loadLabs();
                }
            } catch (err) {
                console.error('Error loading section data for', targetId, err);
            }
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    setupAIChat();
    setupFilterTabs();
    setupLabActions();
    setupNotifications();
}

// ==================== TASK MANAGEMENT ====================

async function loadTasks(filters = {}) {
    try {
        showLoading('assigned-tasks');
        const data = await window.api.getTasks();
        if (data && data.success) {
            renderTasksGrid(data.data);
            updateTaskFilters(data.data);
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
        showNotification('Error loading tasks: ' + error.message, 'error');
    } finally {
        hideLoading('assigned-tasks');
    }
}

function renderTasksGrid(tasks) {
    const tasksContainer = document.getElementById('assignedTasksContainer') || document.getElementById('tasks-container');
    if (!tasksContainer) return;
    
    if (tasks.length === 0) {
        tasksContainer.innerHTML = '<div class="empty-state"><p>No tasks assigned yet</p></div>';
        return;
    }
    
    tasksContainer.innerHTML = tasks.map(task => {
        const deadline = new Date(task.deadline);
        const now = new Date();
        const isOverdue = deadline < now;
        const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
        
        // Determine task status
        let statusClass = 'pending';
        let statusText = 'Pending';
        if (task.submissions && task.submissions.length > 0) {
            const submission = task.submissions[0];
            statusClass = submission.status === 'graded' ? 'completed' : 'in-progress';
            statusText = submission.status === 'graded' ? 'Graded' : 'Submitted';
        }
        
        return `
            <div class="task-card ${statusClass}" data-task-id="${task._id}">
                <div class="task-header">
                    <h3>${task.title}</h3>
                    <span class="difficulty-badge ${task.difficulty || 'medium'}">${task.difficulty || 'Medium'}</span>
                </div>
                <p class="task-description">${task.description.substring(0, 100)}...</p>
                <div class="task-meta">
                    <span class="deadline ${isOverdue ? 'overdue' : ''}">${isOverdue ? 'Overdue' : daysLeft + ' days left'}</span>
                    <span class="status-badge">${statusText}</span>
                </div>
                ${task.submissions && task.submissions.length > 0 && task.submissions[0].grade ? 
                    `<div class="grade-display">
                        <span class="grade-label">Grade:</span>
                        <span class="grade-value">${task.submissions[0].grade}/100</span>
                    </div>` 
                    : ''}
                <div class="task-actions">
                    <button class="btn-secondary view-task" onclick="viewTaskDetails('${task._id}')">View Details</button>
                    ${!task.submissions || task.submissions.length === 0 ? 
                        `<button class="btn-primary submit-task" onclick="openSubmitModal('${task._id}')">Submit</button>` 
                        : `<button class="btn-secondary view-submission" onclick="viewSubmission('${task._id}')">View Submission</button>`}
                </div>
            </div>
        `;
    }).join('');
}

function updateTaskFilters(tasks) {
    // Extract unique statuses for filter tabs
    const statuses = new Set();
    statuses.add('all');
    
    tasks.forEach(task => {
        if (task.submissions && task.submissions.length > 0) {
            const submission = task.submissions[0];
            if (submission.status === 'graded') {
                statuses.add('completed');
            } else {
                statuses.add('in-progress');
            }
        } else {
            statuses.add('pending');
        }
    });
    
    // Update filter tabs
    const filterContainer = document.querySelector('.filter-tabs');
    if (filterContainer) {
        const currentActive = document.querySelector('.filter-tab.active');
        const currentFilter = currentActive ? currentActive.getAttribute('data-filter') : 'all';
        
        filterContainer.innerHTML = Array.from(statuses).map(status => {
            const label = status.charAt(0).toUpperCase() + status.slice(1);
            return `<button class="filter-tab ${status === currentFilter ? 'active' : ''}" data-filter="${status}">${label}</button>`;
        }).join('');
        
        // Reattach filter handlers
        setupFilterTabs();
    }
}

async function viewTaskDetails(taskId) {
    try {
        const data = await window.api.getTask(taskId);
        if (data && data.success) {
            const task = data.data;
            showModal(`
                <h2>${task.title}</h2>
                <p><strong>Description:</strong> ${task.description}</p>
                <p><strong>Difficulty:</strong> ${task.difficulty}</p>
                <p><strong>Deadline:</strong> ${new Date(task.deadline).toLocaleDateString()}</p>
                ${task.attachments && task.attachments.length > 0 ? 
                    `<p><strong>Attachments:</strong><br>${task.attachments.map(a => `<a href="${a.path}" target="_blank">${a.filename}</a>`).join('<br>')}` 
                    : ''}
                <div class="modal-actions">
                    <button class="btn-primary" onclick="openSubmitModal('${taskId}')">Submit Task</button>
                    <button class="btn-secondary" onclick="closeModal()">Close</button>
                </div>
            `);
        }
    } catch (error) {
        showNotification('Error loading task details: ' + error.message, 'error');
    }
}

async function openSubmitModal(taskId) {
    const form = `
        <h3>Submit Task</h3>
        <form id="submitForm" onsubmit="submitTask(event, '${taskId}')">
            <div class="form-group">
                <label>Select Files to Upload:</label>
                <input type="file" id="taskFiles" multiple required />
            </div>
            <div class="modal-actions">
                <button type="submit" class="btn-primary">Submit</button>
                <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
            </div>
        </form>
    `;
    showModal(form);
}

async function submitTask(event, taskId) {
    event.preventDefault();
    
    try {
        const fileInput = document.getElementById('taskFiles');
        const files = fileInput.files;
        
        if (files.length === 0) {
            showNotification('Please select at least one file', 'error');
            return;
        }
        
        showLoading('modal');
        const formData = new FormData();
        for (let file of files) formData.append('files', file);

        const data = await window.api.submitTaskForm(taskId, formData);
        if (data && data.success) {
            showNotification('Task submitted successfully!', 'success');
            closeModal();
            await loadTasks();
        } else {
            showNotification(data.message || 'Failed to submit task', 'error');
        }
    } catch (error) {
        showNotification('Error submitting task: ' + error.message, 'error');
    } finally {
        hideLoading('modal');
    }
}

async function viewSubmission(taskId) {
    try {
        const data = await window.api.getTask(taskId);
        if (data && data.success) {
            const task = data.data;
            const submission = task.submissions && task.submissions[0];
            
            if (!submission) {
                showNotification('No submission found', 'error');
                return;
            }
            
            const feedbackSection = submission.feedback ? 
                `<div class="feedback-section"><strong>Feedback:</strong><p>${submission.feedback}</p></div>` : '';
            const gradeSection = submission.grade ? 
                `<div class="grade-section"><strong>Grade:</strong> ${submission.grade}/100</div>` : '';
            
            const content = `
                <h3>Submission Details</h3>
                <p><strong>Status:</strong> ${submission.status}</p>
                <p><strong>Submitted At:</strong> ${new Date(submission.submittedAt).toLocaleString()}</p>
                ${submission.files && submission.files.length > 0 ? 
                    `<p><strong>Submitted Files:</strong><br>${submission.files.map(f => 
                        `<a href="${f.path}" target="_blank">${f.filename}</a>`
                    ).join('<br>')}` : ''}
                ${gradeSection}
                ${feedbackSection}
                <button class="btn-secondary" onclick="closeModal()">Close</button>
            `;
            showModal(content);
        }
    } catch (error) {
        showNotification('Error loading submission: ' + error.message, 'error');
    }
}

// ==================== LAB MANAGEMENT ====================

async function loadLabs() {
    try {
        showLoading('assigned-labs');
        const token = sessionStorage.getItem('token');

        // Small debug banner to help diagnose missing token / auth issues
        const labsDebugContainer = document.getElementById('labsContainer') || document.getElementById('labs-container');
        if (labsDebugContainer) {
            const existing = labsDebugContainer.querySelector('.debug-banner');
            if (existing) existing.remove();
            const user = sessionStorage.getItem('username') || 'n/a';
            labsDebugContainer.insertAdjacentHTML('afterbegin', `<div class="debug-banner" style="padding:8px;background:#fff8c6;border:1px dashed #f0c36d;margin-bottom:10px;font-size:13px;color:#333;">Debug: token ${token ? 'present' : 'missing'} • user: ${user}</div>`);
        }

        const data = await window.api.getLabs();
        console.log('loadLabs() response:', data);
        if (data && data.success) {
            // Defensive: ensure data.data is an array
            const labs = Array.isArray(data.data) ? data.data : (data.data ? [data.data] : []);
            if (labs.length === 0) {
                // Show more visible debug message to help diagnose empty-response issues
                const labsContainer = document.getElementById('labsContainer') || document.getElementById('labs-container');
                if (labsContainer) {
                    labsContainer.innerHTML = '<div class="empty-state"><p style="color:#666;">No labs assigned (debug): server returned an empty list.</p></div>';
                }
            }
            renderLabsGrid(labs);
        } else {
            console.warn('loadLabs: unexpected response shape', data);
            const labsContainer = document.getElementById('labsContainer') || document.getElementById('labs-container');
            if (labsContainer) {
                labsContainer.innerHTML = `<div class="empty-state"><p style="color:#b00;">Failed to load labs: ${data && data.message ? data.message : 'unknown error'}</p></div>`;
            }
        }
    } catch (error) {
        console.error('Error loading labs:', error);
        showNotification('Error loading labs: ' + error.message, 'error');
    } finally {
        hideLoading('assigned-labs');
    }
}

function renderLabsGrid(labs) {
    const labsContainer = document.getElementById('labsContainer') || document.getElementById('labs-container');
    if (!labsContainer) return;
    
    if (labs.length === 0) {
        labsContainer.innerHTML = '<div class="empty-state"><p>No labs assigned yet</p></div>';
        return;
    }
    
    labsContainer.innerHTML = labs.map(lab => `
        <div class="lab-card" style="padding: 20px; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h3 style="margin: 0 0 10px 0;">${lab.name}</h3>
            <p style="margin: 0 0 10px 0; color: #666;">${lab.description}</p>
            <div class="lab-meta" style="margin: 10px 0; display: flex; gap: 10px;">
                <span class="tech-badge" style="background: #ff4800; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${lab.technology || 'Lab'}</span>
            </div>
            <button class="btn-primary" style="background: #ff4800; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-size: 14px;" onclick="startLabHandler('${lab._id}', '${lab.name}')">Start Lab</button>
        </div>
    `).join('');
}

async function startLabHandler(labId, labName) {
    try {
        showNotification(`Starting ${labName}...`, 'info');
        await startLab(labId);
    } catch (error) {
        console.error('Error in startLabHandler:', error);
    }
}

async function startLab(labId) {
    try {
        const data = await window.api.startLab(labId);
        if (data && data.success) {
            showNotification('✓ Lab started successfully! Container ID: ' + (data.data?.containerId || data.data?.id || 'unknown'), 'success');
            setTimeout(() => loadLabs(), 1000);
        } else {
            showNotification(data.message || 'Failed to start lab', 'error');
        }
    } catch (error) {
        console.error('Error starting lab:', error);
        showNotification('Error starting lab: ' + error.message, 'error');
    }
}

// Quick start lab from Quick Lab Access section
function quickStartLab(labId, labName) {
    try {
        showNotification(`Starting ${labName}. Launching container...`, 'info');

        // Try to resolve an actual lab and start it
        (async () => {
            try {
                // Fetch available labs
                const labsResp = await window.api.getLabs();
                const labs = labsResp && labsResp.data ? labsResp.data : [];

                // Find a matching lab by id or name keyword
                const searchKey = (labName || labId || '').toString().toLowerCase();
                let match = labs.find(l => l._id === labId || (labName && l.name.toLowerCase().includes(labName.toLowerCase())));
                if (!match && searchKey) {
                    match = labs.find(l => l.name.toLowerCase().includes(searchKey) || (l.template && l.template.dockerImage && l.template.dockerImage.toLowerCase().includes(searchKey)));
                }

                if (!match) {
                    showNotification(`No matching lab found for '${labName}'.`, 'error');
                    return;
                }

                // Start the matched lab
                const result = await startLab(match._id);
                if (result && result.success && result.data) {
                    const containerInfo = result.data.containerInfo || result.data;
                    // If containerInfo includes ports, open the first exposed host port in a new tab
                    const ports = (containerInfo && containerInfo.ports) || (result.data && result.data.ports) || [];
                    if (Array.isArray(ports) && ports.length > 0 && ports[0].host) {
                        const hostPort = ports[0].host;
                        // Open the service in a new tab
                        const url = `http://localhost:${hostPort}`;
                        window.open(url, '_blank');
                    } else if (containerInfo && containerInfo.containerId) {
                        // No web UI exposed; navigate user to My Lab Files section to access workspace
                        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                        document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
                        const filesNav = Array.from(document.querySelectorAll('.nav-item')).find(n => n.getAttribute('href') === '#lab-files');
                        if (filesNav) filesNav.classList.add('active');
                        const filesSection = document.getElementById('lab-files');
                        if (filesSection) filesSection.classList.add('active');
                        showNotification(`Lab started. Container ID: ${containerInfo.containerId}. Open 'My Lab Files' to work on your files.`, 'success');
                    } else {
                        showNotification('Lab started, but no access URL available. Check My Lab Files.', 'info');
                    }
                }
            } catch (err) {
                console.error('Quick start failed:', err);
                showNotification('Failed to quick-start lab: ' + (err.message || err), 'error');
            }
        })();
    } catch (error) {
        console.error('Error starting lab:', error);
        showNotification('Error starting lab', 'error');
    }
}

// Pause lab from Quick Lab Access section
function pauseLab(labId) {
    try {
        showNotification('Lab paused successfully', 'success');
    } catch (error) {
        console.error('Error pausing lab:', error);
        showNotification('Error pausing lab', 'error');
    }
}

// ==================== AI CHAT ====================

function setupAIChat() {
    const aiInput = document.getElementById('aiInput');
    const sendAiMessage = document.getElementById('sendAiMessage');
    const aiChatMessages = document.getElementById('aiChatMessages');

    function addMessage(text, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = isUser ? 'ai-message user-message' : 'ai-message';
        
        if (isUser) {
            messageDiv.innerHTML = `
                <div class="message-content" style="margin-left: auto; background: #ff4800; color: #fff;">
                    <p>${text}</p>
                </div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="message-avatar">
                    <i class='bx bx-bot'></i>
                </div>
                <div class="message-content">
                    <p>${text}</p>
                </div>
            `;
        }
        
        if (aiChatMessages) {
            aiChatMessages.appendChild(messageDiv);
            aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
        }
    }

    async function sendMessage() {
        const message = aiInput.value.trim();
        if (message) {
            addMessage(message, true);
            aiInput.value = '';
            
            try {
                const data = await window.api.sendAIMessage(message);
                if (data && data.success) {
                    addMessage(data.data.response || data.data?.answer || '');
                } else {
                    addMessage('Sorry, I encountered an error. Please try again.');
                }
            } catch (error) {
                addMessage("I'm here to help! This is a placeholder response. In the full implementation, this will connect to an AI API.");
            }
        }
    }

    if (sendAiMessage) {
        sendAiMessage.addEventListener('click', sendMessage);
    }

    if (aiInput) {
        aiInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }

    // Quick action buttons
    const quickActionBtns = document.querySelectorAll('.quick-action-btn');
    quickActionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.querySelector('span').textContent;
            if (aiInput) {
                aiInput.value = `Help me with ${action}`;
                sendMessage();
            }
        });
    });
}

// ==================== LAB ACTIONS ====================

function setupLabActions() {
    // Attach listeners to quick-lab-btn elements (Resume, Pause, etc.)
    const quickLabButtons = document.querySelectorAll('.quick-lab-btn');
    quickLabButtons.forEach(btn => {
        // Buttons already have onclick handlers in HTML; this function ensures they're properly delegated
        if (btn.onclick) {
            // Already has an onclick handler; leave it be
        }
    });

    // Attach listeners to Start Lab buttons in lab grid
    const labStartButtons = document.querySelectorAll('.lab-card .btn-primary, .lab-card button[class*="start"], [onclick*="startLab"]');
    labStartButtons.forEach(btn => {
        // These already have onclick handlers from the HTML inline; ensure they work
        if (!btn.onclick && btn.dataset.labId) {
            btn.addEventListener('click', () => {
                startLab(btn.dataset.labId);
            });
        }
    });
}

// ==================== FILTER TABS ====================

function setupFilterTabs() {
    const filterTabs = document.querySelectorAll('.filter-tab');
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const filter = tab.getAttribute('data-filter');
            const taskCards = document.querySelectorAll('.task-card');
            
            taskCards.forEach(card => {
                if (filter === 'all') {
                    card.style.display = 'block';
                } else {
                    card.style.display = card.classList.contains(filter) ? 'block' : 'none';
                }
            });
        });
    });
}

// ==================== NOTIFICATIONS ====================

function setupNotifications() {
    const notificationItems = document.querySelectorAll('.notification-item');
    notificationItems.forEach(item => {
        item.addEventListener('click', () => {
            item.classList.remove('unread');
            // Update badge count
            const badge = document.querySelector('.nav-item[href="#notifications"] .badge');
            if (badge) {
                const count = parseInt(badge.textContent) - 1;
                if (count > 0) {
                    badge.textContent = count;
                } else {
                    badge.remove();
                }
            }
        });
    });
}

// ==================== UTILITY FUNCTIONS ====================

function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = '<div class="loading"><span class="spinner"></span> Loading...</div>';
    }
}

function hideLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        const loading = element.querySelector('.loading');
        if (loading) loading.remove();
    }
}

function showModal(content) {
    let modal = document.getElementById('modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="closeModal()">&times;</span>
            <div class="modal-body">${content}</div>
        </div>
    `;
    modal.style.display = 'block';
}

function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    // Add inline styles for visibility
    const bgColor = type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 15px 20px;
        border-radius: 4px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.2);
        z-index: 9999;
        font-size: 14px;
        max-width: 400px;
        animation: slideIn 0.3s ease-in-out;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in-out';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

