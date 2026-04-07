// Student Dashboard JavaScript - Updated for Assigned Tasks

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const tokenParam = urlParams.get('token');
        const autoLogin = urlParams.get('autologin');

        const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

        if (isLocalDev) {
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
        }
    } catch (e) {
        console.warn('Dev auto-login helper error', e);
    }

    const token = sessionStorage.getItem('token');
    const userType = sessionStorage.getItem('userType');
    
    if (!token) {
        alert('Access denied. Please login as student.');
        window.location.href = 'login.html';
        return;
    }

    // Source of truth: /auth/me
    // If token is valid and role is student, normalize storage so later API calls are consistent.
    let meUser = null;
    try {
        const me = await window.api.getCurrentUser();
        meUser = me && (me.user || me.data || me);
    } catch (err) {
        // We'll show this in the UI below.
        console.warn('Failed to load /auth/me:', err);
    }

    if (!meUser) {
        alert('Session expired or invalid token. Please login again.');
        sessionStorage.removeItem('token');
        window.location.href = 'login.html';
        return;
    }

    const role = String(meUser.role || meUser.userType || '').toLowerCase();
    if (role !== 'student') {
        alert('Access denied. Please login as student.');
        window.location.href = 'login.html';
        return;
    }

    // Normalize local session state from backend truth
    sessionStorage.setItem('userType', 'student');
    if (meUser.username) {
        sessionStorage.setItem('username', meUser.username);
    }

    const username = sessionStorage.getItem('username') || 'Student';
    const nameElem = document.getElementById('studentName');
    if (nameElem) nameElem.textContent = username;

    await initializeDashboard();
});

async function refreshLoggedInAs(userOverride = null) {
    const el = document.getElementById('loggedInAsValue');
    if (!el) return;

    try {
        const u = userOverride || (await window.api.getCurrentUser()) && ((await window.api.getCurrentUser()).user || (await window.api.getCurrentUser()).data || (await window.api.getCurrentUser()));
        const display = (u && (u.username || u.email || u.id || u._id)) ? (u.username || u.email || u.id || u._id) : 'unknown';
        const role = (u && (u.role || u.userType)) ? String(u.role || u.userType) : '';
        el.textContent = role ? `${display} (${role})` : String(display);
    } catch (err) {
        el.textContent = 'unknown (auth/me failed)';
        console.warn('Failed to load /auth/me:', err);
    }
}

async function initializeDashboard() {
    try {
        // Ensure UI handlers are attached before loading data
        setupEventListeners();
        setupNavigation();

        setupHeaderSearch();

        // Always prime the "All" assigned-task list once so count/badge matches backend truth.
        await refreshAssignedTasksAll();
        renderQuickLabOverview();
        await loadQuickRecentActivity();
        await refreshNotificationBadge();
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showNotification('Error loading dashboard data', 'error');
    }
}

function renderQuickLabOverview() {
    const username = sessionStorage.getItem('username') || 'Student';
    const welcomeTitle = document.getElementById('quickWelcomeTitle');
    const welcomeSummary = document.getElementById('quickWelcomeSummary');
    const assignedCount = document.getElementById('quickAssignedCount');
    const assignedSummary = document.getElementById('quickAssignedSummary');

    if (welcomeTitle) {
        welcomeTitle.textContent = `Welcome back, ${username}`;
    }

    if (welcomeSummary) {
        const activeItems = lastAssignedTasksAll.filter((item) => String(item.status || '').toLowerCase() !== 'graded').length;
        welcomeSummary.textContent = activeItems > 0
            ? `You have ${activeItems} active lab task${activeItems === 1 ? '' : 's'} ready to continue.`
            : 'Your coding workspace is ready whenever you are.';
    }

    if (assignedCount) {
        assignedCount.textContent = String(lastAssignedTasksAll.length || 0);
    }

    if (assignedSummary) {
        if (!lastAssignedTasksAll.length) {
            assignedSummary.textContent = 'No assigned labs yet.';
            return;
        }

        const pendingCount = lastAssignedTasksAll.filter((item) => ['pending', 'in-progress'].includes(String(item.status || '').toLowerCase())).length;
        assignedSummary.textContent = pendingCount > 0
            ? `${pendingCount} task${pendingCount === 1 ? '' : 's'} waiting for your attention.`
            : 'All assigned lab updates are up to date.';
    }
}

async function loadQuickRecentActivity() {
    const container = document.getElementById('quickRecentActivity');
    if (!container) return;

    try {
        const response = await window.api.getNotifications({ limit: 4 });
        const notifications = response?.success ? (response.data || []) : [];
        renderQuickRecentActivity(notifications);
    } catch (error) {
        console.error('Error loading quick recent activity:', error);
        renderQuickRecentActivity([]);
    }
}

function buildFallbackQuickActivities() {
    return (lastAssignedTasksAll || []).slice(0, 4).map((task) => {
        const taskInfo = task.taskId || task.task || {};
        const status = String(task.status || 'pending').replace(/-/g, ' ');
        return {
            type: 'task',
            title: taskInfo.title || 'Assigned Lab',
            message: `Task status: ${status.charAt(0).toUpperCase() + status.slice(1)}.`,
            createdAt: task.updatedAt || task.createdAt || task.deadline || null
        };
    });
}

function renderQuickRecentActivity(items) {
    const container = document.getElementById('quickRecentActivity');
    if (!container) return;

    const safeItems = Array.isArray(items) && items.length ? items : buildFallbackQuickActivities();

    if (!safeItems.length) {
        container.innerHTML = '<div class="quick-activity-empty">Recent activity will appear here once your lab work starts updating.</div>';
        return;
    }

    container.innerHTML = safeItems.map((item) => {
        const icon = item.type === 'task' ? 'bx bx-task' : getNotificationIcon(item.type, item.meta || {});
        const title = escapeHtml(String(item.title || 'Recent Activity'));
        const message = escapeHtml(String(item.message || item.description || 'You have a new dashboard update.'));
        const time = escapeHtml(formatRelativeDashboardTime(item.createdAt || item.updatedAt || item.time || item.unlockedAt));

        return `
            <div class="quick-activity-item">
                <div class="quick-activity-icon">
                    <i class='${icon}'></i>
                </div>
                <div class="quick-activity-content">
                    <h4>${title}</h4>
                    <p>${message}</p>
                    <small>${time}</small>
                </div>
            </div>
        `;
    }).join('');
}

function formatRelativeDashboardTime(value) {
    if (!value) return 'Just now';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Just now';

    const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    if (seconds < 60) return 'Just now';

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
}

function openStudentSection(sectionId) {
    const navItem = document.querySelector(`a.nav-item[href="#${sectionId}"]`);
    if (navItem) {
        navItem.click();
    }
}

function setupHeaderSearch() {
    const searchInput = document.querySelector('.search-box input');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const query = String(e.target.value || '').trim().toLowerCase();
        applyStudentSearch(query);
    });
}

function applyStudentSearch(query) {
    const activeSection = document.querySelector('.content-section.active');
    const sectionId = activeSection ? activeSection.id : '';

    const matchesText = (el) => {
        const t = (el && el.textContent) ? el.textContent.toLowerCase() : '';
        return t.includes(query);
    };

    // Empty query resets all known lists
    if (!query) {
        document.querySelectorAll('.task-card, .lab-card, .file-card, .notification-card').forEach(el => {
            el.style.display = '';
        });
        return;
    }

    if (sectionId === 'assigned-labs') {
        // Filter assigned tasks cards
        document.querySelectorAll('#assignedTasksContainer .task-card').forEach(card => {
            card.style.display = matchesText(card) ? '' : 'none';
        });
        // Filter labs cards (if present)
        document.querySelectorAll('#labsContainer .lab-card').forEach(card => {
            card.style.display = matchesText(card) ? '' : 'none';
        });
        return;
    }

    if (sectionId === 'lab-files') {
        document.querySelectorAll('#myLabFilesContainer .file-card').forEach(card => {
            card.style.display = matchesText(card) ? '' : 'none';
        });
        return;
    }

    if (sectionId === 'notifications') {
        document.querySelectorAll('#notificationsContainer .notification-card').forEach(card => {
            card.style.display = matchesText(card) ? '' : 'none';
        });
        return;
    }
}

async function checkAIStatus() {
    try {
        const data = await window.api.getAIStatus();
        const dot = document.getElementById('aiStatusDot');
        const text = document.getElementById('aiStatusText');
        
        if (!dot || !text) return;
        
        if (data && data.success && data.data) {
            const { provider, keyPresent } = data.data;
            if (keyPresent) {
                dot.style.background = '#28a745';
                text.textContent = `AI: ${provider} ✓`;
            } else {
                dot.style.background = '#ffc107';
                text.textContent = `AI: ${provider} (no key)`;
            }
        } else {
            dot.style.background = '#dc3545';
            text.textContent = 'AI: unavailable';
        }
    } catch (error) {
        const dot = document.getElementById('aiStatusDot');
        const text = document.getElementById('aiStatusText');
        if (dot && text) {
            dot.style.background = '#dc3545';
            text.textContent = 'AI: offline';
        }
        console.debug('AI status check failed:', error);
    }
}

function setupNavigation() {
    const navMenu = document.querySelector('.nav-menu');
    const contentSections = document.querySelectorAll('.content-section');

    if (!navMenu) return;

    function activateSectionById(targetId) {
        const navItems = Array.from(navMenu.querySelectorAll('.nav-item'));
        navItems.forEach(nav => nav.classList.remove('active'));
        contentSections.forEach(section => section.classList.remove('active'));

        const targetAnchor = navItems.find(a => (a.getAttribute('href') || '') === `#${targetId}`);
        if (targetAnchor) targetAnchor.classList.add('active');

        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        return { targetAnchor, targetSection };
    }

    async function handleNavClick(anchor) {
        if (!anchor) return;
        const href = anchor.getAttribute('href') || '';
        const targetId = href.startsWith('#') ? href.substring(1) : href;

        const { targetSection } = activateSectionById(targetId);
        if (!targetSection) return;

        window.location.hash = targetId;

        try {
            if (targetId === 'quick-lab') {
                renderQuickLabOverview();
                await loadQuickRecentActivity();
            } else if (targetId === 'assigned-labs') {
                // Re-sync backend truth when user enters Assigned Labs section
                await refreshAssignedTasksAll();
            } else if (targetId === 'analytics') {
                await loadAnalyticsData();
            } else if (targetId === 'gamification') {
                await loadGamificationData();
            } else if (targetId === 'lab-files') {
                await loadMyLabFiles();
            } else if (targetId === 'notifications') {
                await loadNotifications();
            }
        } catch (err) {
            console.error('Error loading section data for', targetId, err);
        }
    }

    navMenu.addEventListener('click', async (e) => {
        const anchor = e.target.closest && e.target.closest('a.nav-item');
        if (!anchor) return;
        e.preventDefault();

        await handleNavClick(anchor);
    });

    // Initial render based on URL hash (or current active item)
    const initialId = (window.location.hash || '').replace('#', '');
    let initialAnchor = null;
    if (initialId) {
        activateSectionById(initialId);
        initialAnchor = navMenu.querySelector(`a.nav-item[href="#${initialId}"]`);
    } else {
        const active = navMenu.querySelector('a.nav-item.active');
        if (active) {
            const href = active.getAttribute('href') || '';
            const targetId = href.startsWith('#') ? href.substring(1) : href;
            activateSectionById(targetId);
            initialAnchor = active;
        }
    }

    if (initialAnchor) {
        handleNavClick(initialAnchor).catch((error) => {
            console.error('Error loading initial section:', error);
        });
    }
}

function setupEventListeners() {
    setupAIChat();
    setupLabActions();
    setupNotificationActions();
}

// ==================== ASSIGNED TASKS ====================

let lastAssignedTasksAll = [];
let lastNotificationItems = [];

async function refreshAssignedTasksAll() {
    // This is the single source of truth for task counts.
    // It renders the list and updates badge ONLY for the All view.
    await loadAssignedTasks({});
}

async function loadAssignedTasks(filters = {}) {
    try {
        console.log('[ASSIGNED TASKS] Loading with filters:', filters);
        const data = await window.api.getAssignedTasks(filters);
        console.log('[ASSIGNED TASKS] API response:', data);

        if (data && data.success) {
            // Store only the "All" list for any count/badge sync. Do NOT display counts for filtered tabs.
            const isAll = !filters || Object.keys(filters).length === 0 || filters.status === 'all';
            if (isAll) {
                lastAssignedTasksAll = Array.isArray(data.data) ? data.data : [];
                syncAssignedTasksBadge(lastAssignedTasksAll.length);
                renderQuickLabOverview();
            }
            renderAssignedTasks(data.data);
        } else {
            renderAssignedTasks([]);
            renderQuickLabOverview();
            if (data && data.message) {
                showNotification('Assigned tasks: ' + data.message, 'error');
            }
        }
    } catch (error) {
        console.error('Error loading assigned tasks:', error);
        const msg = String(error && error.message ? error.message : error);
        showNotification('Error loading tasks: ' + msg, 'error');
        renderAssignedTasks([]);
        renderQuickLabOverview();

        // Make auth issues obvious instead of silently showing empty tasks.
        if (/401|403|token|jwt|unauthorized|access denied/i.test(msg)) {
            const noTasksMsg = document.getElementById('noTasksMessage');
            if (noTasksMsg) {
                noTasksMsg.textContent = 'Not authorized to load assigned tasks. Please log out and log back in.';
                noTasksMsg.style.display = 'block';
            }
        }
    }
}

function syncAssignedTasksBadge(count) {
    // Sidebar "Assigned Labs" item has no badge by default; update only if present.
    const assignedNav = document.querySelector('a.nav-item[href="#assigned-labs"]');
    if (!assignedNav) return;
    const badge = assignedNav.querySelector('.badge');
    if (!badge) return;

    if (!count || count <= 0) {
        badge.style.display = 'none';
        badge.textContent = '';
        return;
    }

    badge.style.display = '';
    badge.textContent = String(count);
}

function renderAssignedTasks(tasks) {
    const container = document.getElementById('assignedTasksContainer');
    let noTasksMsg = document.getElementById('noTasksMessage');
    
    if (!container) return;

    if (!noTasksMsg) {
        noTasksMsg = document.createElement('div');
        noTasksMsg.id = 'noTasksMessage';
        noTasksMsg.style.cssText = 'padding: 16px; background: #fff3cd; border: 1px solid #ffeeba; color: #856404; border-radius: 8px; margin: 10px 0; display: none;';
        noTasksMsg.textContent = 'No assigned tasks found.';
        container.parentElement.insertBefore(noTasksMsg, container);
    }
    
    if (!tasks || tasks.length === 0) {
        container.innerHTML = '';
        if (noTasksMsg) noTasksMsg.style.display = 'block';
        return;
    }
    
    if (noTasksMsg) noTasksMsg.style.display = 'none';
    container.innerHTML = tasks.map(task => {
        // Safeguard: some assigned tasks may not have a populated `taskId` (null).
        // Fall back to `task.task` or a placeholder object so UI doesn't throw.
        const taskInfo = task.taskId || task.task || { title: 'Untitled Task', description: '', difficulty: 'medium' };
        const deadline = task.deadline ? new Date(task.deadline) : null;
        const now = new Date();
        const isOverdue = deadline && (deadline < now) && task.status !== 'graded';
        const daysLeft = deadline ? Math.ceil((deadline - now) / (1000 * 60 * 60 * 24)) : 'N/A';
        
        const statusColors = {
            pending: '#FFC107',
            'in-progress': '#2196F3',
            submitted: '#673AB7',
            graded: '#4CAF50'
        };

        return `
            <div class="task-card ${task.status}" data-assigned-task-id="${task._id}">
                <div class="task-header">
                    <h3>${taskInfo.title}</h3>
                    <span class="difficulty-badge ${taskInfo.difficulty || 'medium'}">${(taskInfo.difficulty || 'Medium').toUpperCase()}</span>
                </div>
                <p class="task-description">${(taskInfo.description || '').substring(0, 120)}...</p>
                <div class="task-meta">
                    <div class="task-details">
                        <span class="task-detail"><i class='bx bx-calendar'></i> Due: ${deadline ? deadline.toLocaleDateString() : 'No deadline'}</span>
                        <span class="task-detail"><i class='bx bx-time'></i> ${daysLeft === 'N/A' ? 'No deadline' : (isOverdue ? `Overdue by ${Math.abs(daysLeft)} days` : `${daysLeft} days left`)}</span>
                        ${taskInfo.language ? `<span class="task-detail"><i class='bx bx-code-curly'></i> ${taskInfo.language.toUpperCase()}</span>` : ''}
                    </div>
                    <div class="task-status">
                        <span class="status-badge ${task.status}" style="background-color: ${statusColors[task.status] || '#6c757d'};">${task.status.toUpperCase()}</span>
                    </div>
                </div>
                <div class="task-actions">
                    ${task.status === 'pending' || task.status === 'in-progress' ? 
                        `<button class="btn btn-primary" onclick="openCodeEditor('${task._id}')"><i class='bx bx-play'></i> Start Task</button>` : ''}
                    ${task.status === 'in-progress' ? 
                        `<button class="btn btn-secondary" onclick="openCodeEditor('${task._id}')"><i class='bx bx-edit'></i> Continue</button>` : ''}
                    ${task.status === 'submitted' || task.status === 'graded' ? 
                        `<button class="btn btn-info" onclick="viewTaskGrade('${task._id}')"><i class='bx bx-show'></i> View Submission</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

async function openCodeEditor(assignedTaskId) {
    try {
        const token = sessionStorage.getItem('token');

        // 1️⃣ Get assigned task details
        const response = await window.api.getAssignedTask(assignedTaskId);

        if (!response || !response.success) {
            showNotification('Failed to load task details', 'error');
            return;
        }

        const assignedTask = response.data;
        const task = assignedTask.taskId;

        if (!task) {
            showNotification('Task details not found', 'error');
            return;
        }

        // 2️⃣ Store assigned language (Task model may not have language; default to python)
        const lang = task.language || 'python';
        sessionStorage.setItem('assignedLanguage', lang);
        sessionStorage.setItem('assignedTaskId', assignedTaskId);

        // 3️⃣ Open editor
        window.location.href = `code-editor.html?taskId=${assignedTaskId}`;
    } catch (error) {
        console.error('Error opening editor:', error);
        showNotification('Error opening code editor', 'error');
    }
}


function openFreeEditor() {
    window.location.href = 'free-editor.html';
}

function viewTaskGrade(assignedTaskId) {
    // Load and show submission details (and evaluation, if graded)
    window.api.getAssignedTask(assignedTaskId).then(response => {
        if (response.success) {
            const at = response.data;
            const status = String(at.status || '').toLowerCase();
            const isGraded = status === 'graded';
            const grade = (typeof at.grade === 'number') ? at.grade : null;
            const feedback = at.feedback || '';
            const decision = at.reviewDecision || '';
            const code = at.submission && at.submission.code ? at.submission.code : '';
            const output = at.submission && at.submission.output ? at.submission.output : '';

            const statusLabel = isGraded ? 'EVALUATED' : (status ? status.toUpperCase() : 'UNKNOWN');
            const statusColor = isGraded ? '#4CAF50' : (status === 'submitted' ? '#673AB7' : '#6c757d');

            showModal(`
                <h2>${escapeHtml(String(at.taskId?.title || 'Untitled Task'))}</h2>
                <div style="margin: 20px 0;">
                    <p><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${escapeHtml(statusLabel)}</span></p>
                    ${isGraded && grade !== null ? `<p><strong>Marks:</strong> <span style="font-size: 24px; color: #2196F3; font-weight: bold;">${grade}/100</span></p>` : ''}
                    ${isGraded && decision ? `<p><strong>Decision:</strong> <span style="font-weight: 600;">${escapeHtml(String(decision).toUpperCase())}</span></p>` : ''}
                    ${feedback ? `<p><strong>Remarks:</strong><br>${escapeHtml(String(feedback))}</p>` : (status === 'submitted' ? `<p style="color:#666;"><strong>Remarks:</strong> Awaiting evaluation.</p>` : '')}
                    ${code ? `<h3 style="margin-top: 16px;">Submitted Code</h3><pre style="background:#111827; color:#e5e7eb; padding: 12px; border-radius: 8px; white-space: pre-wrap; max-height: 280px; overflow: auto;">${escapeHtml(String(code))}</pre>` : ''}
                    ${output ? `<h3 style="margin-top: 16px;">Last Output</h3><pre style="background:#0f172a; color:#ffffff; padding: 12px; border-radius: 8px; white-space: pre-wrap; max-height: 200px; overflow: auto;">${escapeHtml(String(output))}</pre>` : ''}
                </div>
                <div class="modal-actions">
                    <button class="btn-secondary" onclick="closeModal()">Close</button>
                </div>
            `);
        }
    }).catch(err => {
        showNotification('Error loading grade: ' + err.message, 'error');
    });
}

// ==================== LAB ACTIONS ====================

function setupLabActions() {
    // Setup event delegation for dynamic buttons
    document.addEventListener('click', async (e) => {
        const quickLabBtn = e.target.closest('.quick-lab-btn');
        if (quickLabBtn && quickLabBtn.onclick === null) {
            const labId = quickLabBtn.getAttribute('data-lab-id');
            if (labId) {
                try {
                    const response = await window.api.startLab(labId);
                    if (response.success) {
                        showNotification('Lab started successfully', 'success');
                    } else {
                        showNotification('Error starting lab: ' + response.message, 'error');
                    }
                } catch (error) {
                    showNotification('Error: ' + error.message, 'error');
                }
            }
        }
    });
}

function setupNotificationActions() {
    const markAllButton = document.getElementById('markAllNotificationsBtn');
    if (markAllButton && !markAllButton.dataset.bound) {
        markAllButton.dataset.bound = 'true';
        markAllButton.addEventListener('click', async () => {
            try {
                await window.api.markAllNotificationsRead();
                lastNotificationItems = lastNotificationItems.map((item) => ({
                    ...item,
                    readAt: item.readAt || new Date().toISOString()
                }));
                await loadNotifications();
                showNotification('All notifications marked as read', 'success');
            } catch (error) {
                console.error('Error marking all notifications read:', error);
                showNotification('Unable to mark notifications as read', 'error');
            }
        });
    }

    const notificationsContainer = document.getElementById('notificationsContainer');
    if (notificationsContainer && !notificationsContainer.dataset.bound) {
        notificationsContainer.dataset.bound = 'true';
        notificationsContainer.addEventListener('click', async (event) => {
            const card = event.target.closest('.notification-card[data-notification-id]');
            if (!card) return;

            event.preventDefault();
            await handleNotificationClick(card.dataset.notificationId);
        });
    }
}

async function refreshNotificationBadge(notifications = null) {
    const badge = document.querySelector('a.nav-item[href="#notifications"] .badge');
    if (!badge) return;

    try {
        let unreadCount = 0;

        if (Array.isArray(notifications)) {
            unreadCount = notifications.filter((item) => !item.readAt).length;
        } else {
            const response = await window.api.getNotifications({ unreadOnly: 'true', limit: 100 });
            unreadCount = response?.success ? Number(response.count || (response.data || []).length || 0) : 0;
        }

        badge.textContent = String(unreadCount);
        badge.style.display = unreadCount > 0 ? '' : 'none';
    } catch (error) {
        console.error('Error refreshing notification badge:', error);
    }
}

// ==================== AI CHAT ====================

function setupAIChat() {
    const sendBtn = document.getElementById('sendAiMessage');
    const aiInput = document.getElementById('aiInput');

    if (sendBtn && aiInput) {
        sendBtn.addEventListener('click', sendMessage);
        aiInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }
}

async function sendMessage() {
    const input = document.getElementById('aiInput');
    const message = input.value.trim();

    if (!message) return;

    const chatMessages = document.getElementById('aiChatMessages');

    // Add user message
    const userMsgDiv = document.createElement('div');
    userMsgDiv.className = 'user-message';
    userMsgDiv.innerHTML = `
        <div class="message-avatar" style="background: #2196F3;">
            <i class='bx bx-user'></i>
        </div>
        <div class="message-content">
            <p>${escapeHtml(message)}</p>
        </div>
    `;
    chatMessages.appendChild(userMsgDiv);

    input.value = '';

    // Add loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'ai-message loading';
    loadingDiv.innerHTML = `
        <div class="message-avatar">
            <i class='bx bx-bot'></i>
        </div>
        <div class="message-content">
            <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 8px; height: 8px; background: #ff4800; border-radius: 50%; animation: pulse 1.5s infinite;"></div>
                <span>Checking offline help...</span>
            </div>
        </div>
    `;
    chatMessages.appendChild(loadingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        const response = window.staticChatbot && typeof window.staticChatbot.getBotResponse === 'function'
            ? window.staticChatbot.getBotResponse(message)
            : {
                text: 'Offline chatbot is not loaded. Please refresh the page.'
            };

        // Remove loading indicator
        loadingDiv.remove();

        const aiMsgDiv = document.createElement('div');
        aiMsgDiv.className = 'ai-message';
        
        let messageText = response && response.text
            ? response.text
            : 'Offline assistant responded with an empty message.';
        
        // Format the AI response with proper structure (ensure string)
        messageText = formatAIResponse(String(messageText));
        
        aiMsgDiv.innerHTML = `
            <div class="message-avatar">
                <i class='bx bx-bot'></i>
            </div>
            <div class="message-content">
                ${messageText}
            </div>
        `;
        chatMessages.appendChild(aiMsgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (error) {
        // Remove loading indicator
        loadingDiv.remove();

        const errMsg = error && error.message ? String(error.message) : 'Offline assistant is unavailable right now.';
        const errorDiv = document.createElement('div');
        errorDiv.className = 'ai-message error';
        errorDiv.innerHTML = `
            <div class="message-avatar" style="background: #f44336;">
                <i class='bx bx-error'></i>
            </div>
            <div class="message-content">
                <p><strong>Error:</strong> ${escapeHtml(errMsg)}</p>
            </div>
        `;
        chatMessages.appendChild(errorDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
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
        const copyId = 'code-' + Math.random().toString(36).substr(2, 9);
        return `<div style="position: relative; background: #2d2d30; border-radius: 6px; margin: 10px 0;">
            <button class="copy-code-btn" onclick="copyCode('${copyId}')" style="position: absolute; top: 8px; right: 8px; background: #ff4800; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px;">
                <i class='bx bx-copy' style="font-size: 14px;"></i> Copy
            </button>
            <pre id="${copyId}" style="margin: 0; padding: 12px; padding-top: 30px;"><code>${escapedCode}</code></pre>
        </div>`;
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
    formatted = formatted.replace(/<p>(<div)/g, '$1');
    formatted = formatted.replace(/(<\/div>)<\/p>/g, '$1');
    
    return formatted;
}

// Copy code to clipboard
function copyCode(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const text = element.textContent;
    navigator.clipboard.writeText(text).then(() => {
        // Show feedback
        const btn = event.target.closest('.copy-code-btn');
        if (btn) {
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="bx bx-check" style="font-size: 14px;"></i> Copied!';
            btn.style.background = '#4CAF50';
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = '#ff4800';
            }, 2000);
        }
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}

// ==================== NOTIFICATIONS ====================

function showNotification(message, type = 'info') {
    // Create a toast notification
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class='bx ${getIconForType(type)}'></i>
            <span>${message}</span>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;
    
    // Add to container or body
    const container = document.getElementById('toastContainer');
    if (container) {
        container.appendChild(toast);
    } else {
        document.body.appendChild(toast);
    }
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

function getIconForType(type) {
    const icons = {
        success: 'bx-check-circle',
        error: 'bx-error',
        warning: 'bx-error',
        info: 'bx-info-circle'
    };
    return icons[type] || 'bx-bell';
}

function showModal(content) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <div>${content}</div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'block';
}

function closeModal() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(m => m.remove());
}

// Helper to check if element is in viewport
function isInViewport(el) {
    const rect = el.getBoundingClientRect();
    return rect.top >= 0 && rect.bottom <= window.innerHeight;
}

// ==================== ANALYTICS ====================

let __analyticsCharts = {
    completion: null,
    timeSpent: null,
    errors: null,
    trends: null
};

function destroyAnalyticsCharts() {
    Object.keys(__analyticsCharts).forEach((key) => {
        if (__analyticsCharts[key]) {
            try {
                __analyticsCharts[key].destroy();
            } catch (_) {
                // ignore chart cleanup issues
            }
            __analyticsCharts[key] = null;
        }
    });
}

function setChartEmptyState(canvasId, message) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const card = canvas.closest('.chart-card');
    if (!card) return;

    let emptyState = card.querySelector('.chart-empty-state');
    if (!message) {
        if (emptyState) emptyState.remove();
        return;
    }

    if (!emptyState) {
        emptyState = document.createElement('div');
        emptyState.className = 'chart-empty-state';
        card.appendChild(emptyState);
    }

    emptyState.textContent = message;
}

function getCompletedAssignedTasks(tasks) {
    return (Array.isArray(tasks) ? tasks : []).filter((task) => ['submitted', 'graded'].includes(String(task.status || '').toLowerCase()));
}

function buildTimeByLabFallback(tasks) {
    const grouped = new Map();

    (Array.isArray(tasks) ? tasks : []).forEach((task) => {
        if (!task.labId) return;

        const labId = String(task.labId._id || task.labId);
        const label = task.labId?.name || task.taskId?.title || 'Lab';
        const start = task.startedAt ? new Date(task.startedAt) : null;
        const end = task.submittedAt ? new Date(task.submittedAt) : task.gradedAt ? new Date(task.gradedAt) : null;
        const duration = (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()))
            ? Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000))
            : 0;

        if (!grouped.has(labId)) {
            grouped.set(labId, { labId, name: label, timeSpent: 0, completedCount: 0, pendingCount: 0 });
        }

        const entry = grouped.get(labId);
        entry.timeSpent += duration;
        if (['submitted', 'graded'].includes(String(task.status || '').toLowerCase())) {
            entry.completedCount += 1;
        } else {
            entry.pendingCount += 1;
        }
    });

    return Array.from(grouped.values()).sort((left, right) => right.timeSpent - left.timeSpent);
}

function getAverageAssignedTaskScore(tasks) {
    const scores = (Array.isArray(tasks) ? tasks : [])
        .map((task) => Number(task.grade || 0))
        .filter((score) => Number.isFinite(score) && score > 0);

    if (!scores.length) return 0;
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

async function loadAnalyticsData() {
    try {
        const [statsResp, summaryResp, tasksResp] = await Promise.all([
            window.api.getStats(),
            window.api.getStudentAnalyticsSummary(),
            window.api.getAssignedTasks()
        ]);

        const stats = (statsResp && statsResp.success) ? (statsResp.data || {}) : {};
        const summary = (summaryResp && summaryResp.success) ? (summaryResp.data || {}) : {};
        const assignedTasks = (tasksResp && tasksResp.success) ? (tasksResp.data || []) : [];
        const completedTasks = getCompletedAssignedTasks(assignedTasks);

        const totalLabsCompleted = Number(stats.totalLabsCompleted || summary.completedCount || completedTasks.length || 0);
        const averageScore = Number(stats.averageScore || getAverageAssignedTaskScore(assignedTasks) || 0);
        const totalErrors = Number(stats.totalErrors || 0);

        const completedCount = Number(summary.completedCount || completedTasks.length || totalLabsCompleted || 0);
        const pendingCount = Number(
            typeof summary.pendingCount === 'number'
                ? summary.pendingCount
                : Math.max(0, assignedTasks.length - completedCount)
        );
        const timeByLab = Array.isArray(summary.timeByLab) && summary.timeByLab.length
            ? summary.timeByLab
            : buildTimeByLabFallback(assignedTasks);
        const totalTimeSpentSec = Number(
            stats.totalTimeSpent ||
            timeByLab.reduce((sum, item) => sum + Number(item.timeSpent || 0), 0) ||
            0
        );
        const weekly = summary.weekly || {};

        // Stats cards
        const labsEl = document.getElementById('totalLabsCompleted');
        if (labsEl) labsEl.textContent = String(totalLabsCompleted);

        const timeEl = document.getElementById('totalTimeSpent');
        if (timeEl) timeEl.textContent = formatDurationSeconds(totalTimeSpentSec);

        const avgEl = document.getElementById('averageScore');
        if (avgEl) avgEl.textContent = `${Math.round(averageScore)}%`;

        const errEl = document.getElementById('totalErrors');
        if (errEl) errEl.textContent = String(totalErrors);

        // Charts
        if (typeof Chart !== 'undefined') {
            destroyAnalyticsCharts();

            const compactChartOptions = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 10,
                            boxHeight: 10,
                            padding: 12,
                            font: {
                                size: 11
                            }
                        }
                    }
                }
            };

            const completionCtx = document.getElementById('completionChart');
            if (completionCtx) {
                const totalTracked = completedCount + pendingCount;
                setChartEmptyState('completionChart', totalTracked === 0 ? 'No task progress yet. Start a lab to populate this chart.' : '');
                __analyticsCharts.completion = new Chart(completionCtx, {
                    type: 'doughnut',
                    data: {
                        labels: totalTracked === 0 ? ['No activity yet'] : ['Completed', 'Pending'],
                        datasets: [{
                            data: totalTracked === 0 ? [1] : [completedCount, pendingCount],
                            backgroundColor: totalTracked === 0 ? ['#d1d5db'] : ['#4CAF50', '#FFC107']
                        }]
                    },
                    options: {
                        ...compactChartOptions,
                        cutout: '62%'
                    }
                });
            }

            const timeSpentCtx = document.getElementById('timeSpentChart');
            if (timeSpentCtx) {
                const labels = timeByLab.slice(0, 10).map(x => x.name || 'Lab');
                const values = timeByLab.slice(0, 10).map(x => Math.round(Number(x.timeSpent || 0) / 60)); // minutes
                setChartEmptyState('timeSpentChart', values.length === 0 ? 'Time spent per lab will appear after you start and submit tasks.' : '');
                __analyticsCharts.timeSpent = new Chart(timeSpentCtx, {
                    type: 'bar',
                    data: {
                        labels: labels.length ? labels : ['No tracked lab time yet'],
                        datasets: [{
                            label: 'Minutes Spent',
                            data: values.length ? values : [0],
                            backgroundColor: '#2196F3'
                        }]
                    },
                    options: {
                        ...compactChartOptions,
                        plugins: {
                            ...compactChartOptions.plugins,
                            legend: { display: false }
                        },
                        scales: {
                            x: {
                                ticks: {
                                    maxRotation: 0,
                                    autoSkip: false,
                                    font: { size: 10 }
                                },
                                grid: { display: false }
                            },
                            y: {
                                beginAtZero: true,
                                ticks: { font: { size: 10 } }
                            }
                        }
                    }
                });
            }

            const errorsCtx = document.getElementById('errorsChart');
            if (errorsCtx) {
                const common = stats.commonErrors && typeof stats.commonErrors === 'object' ? stats.commonErrors : {};
                const pairs = Object.entries(common).sort((a, b) => b[1] - a[1]).slice(0, 8);
                const labels = pairs.map(([k]) => k);
                const values = pairs.map(([, v]) => Number(v || 0));
                setChartEmptyState('errorsChart', values.length === 0 ? 'Good news: no tracked errors yet.' : '');
                __analyticsCharts.errors = new Chart(errorsCtx, {
                    type: 'bar',
                    data: {
                        labels: labels.length ? labels : ['No errors yet'],
                        datasets: [{
                            label: 'Count',
                            data: values.length ? values : [0],
                            backgroundColor: '#F44336'
                        }]
                    },
                    options: {
                        ...compactChartOptions,
                        plugins: {
                            ...compactChartOptions.plugins,
                            legend: { display: false }
                        },
                        scales: {
                            x: {
                                ticks: {
                                    maxRotation: 0,
                                    autoSkip: false,
                                    font: { size: 10 }
                                },
                                grid: { display: false }
                            },
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    precision: 0,
                                    font: { size: 10 }
                                }
                            }
                        }
                    }
                });
            }

            const trendsCtx = document.getElementById('trendsChart');
            if (trendsCtx) {
                const weeklyTimeMin = Math.round(Number(weekly.totalTimeSpent || 0) / 60);
                const weeklyExec = Number(
                    weekly.totalExecutionAttempts ||
                    (assignedTasks || []).filter((task) => {
                        const activityAt = task.updatedAt || task.submittedAt || task.startedAt || task.createdAt;
                        return activityAt && (new Date(activityAt).getTime() >= Date.now() - (7 * 24 * 60 * 60 * 1000));
                    }).length ||
                    0
                );
                const weeklyErr = Number(weekly.totalErrors || 0);
                const hasWeeklyActivity = (weeklyTimeMin + weeklyExec + weeklyErr) > 0;
                setChartEmptyState('trendsChart', !hasWeeklyActivity ? 'Weekly trends will appear after your recent activity is tracked.' : '');
                __analyticsCharts.trends = new Chart(trendsCtx, {
                    type: 'bar',
                    data: {
                        labels: ['Weekly Time (min)', 'Weekly Executions', 'Weekly Errors'],
                        datasets: [{
                            data: [weeklyTimeMin, weeklyExec, weeklyErr],
                            backgroundColor: ['#673AB7', '#009688', '#FF9800']
                        }]
                    },
                    options: {
                        ...compactChartOptions,
                        plugins: {
                            ...compactChartOptions.plugins,
                            legend: { display: false }
                        },
                        scales: {
                            x: {
                                ticks: {
                                    maxRotation: 0,
                                    autoSkip: false,
                                    font: { size: 10 }
                                },
                                grid: { display: false }
                            },
                            y: {
                                beginAtZero: true,
                                ticks: { font: { size: 10 } }
                            }
                        }
                    }
                });
            }
        }
    } catch (error) {
        console.error('[ANALYTICS] load failed:', error);
        showNotification('Error loading analytics: ' + error.message, 'error');
    }
}

function formatDurationSeconds(seconds) {
    const sec = Math.max(0, Number(seconds || 0));
    const totalMin = Math.round(sec / 60);
    if (totalMin < 60) return `${totalMin}m`;
    const hours = Math.floor(totalMin / 60);
    const mins = totalMin % 60;
    return `${hours}h${mins ? ' ' + mins + 'm' : ''}`;
}

// ==================== GAMIFICATION ====================

async function loadGamificationData() {
    try {
        const resp = await window.api.getGamification();
        if (!resp || !resp.success) {
            throw new Error(resp && resp.message ? resp.message : 'Failed to load gamification');
        }

        const g = resp.data || {};
        const level = Number(g.level || 1);
        const xp = Number(g.xp || 0);
        const rank = g.rank || 'Beginner';
        const totalPoints = Number(g.points || 0);
        const badges = Array.isArray(g.badges) ? g.badges : [];
        const pointsHistory = Array.isArray(g.pointsHistory) ? g.pointsHistory : [];
        const achievements = Array.isArray(g.achievements) ? g.achievements : [];
        const stats = g.stats || {};

        const levelEl = document.getElementById('userLevel');
        if (levelEl) levelEl.textContent = String(level);

        const rankEl = document.getElementById('userRank');
        if (rankEl) rankEl.textContent = String(rank);

        const xpEl = document.getElementById('userXP');
        if (xpEl) xpEl.textContent = String(xp);

        const xpForNext = level * 200;
        const pct = xpForNext > 0 ? Math.min(100, Math.max(0, Math.round((xp / xpForNext) * 100))) : 0;
        const bar = document.querySelector('.xp-progress-fill');
        if (bar) bar.style.width = pct + '%';

        const totalPointsEl = document.getElementById('totalPointsEarned');
        if (totalPointsEl) totalPointsEl.textContent = String(totalPoints);

        const badgesCountEl = document.getElementById('badgesEarnedCount');
        if (badgesCountEl) badgesCountEl.textContent = String(badges.length);

        const labsCompletedStat = document.getElementById('labsCompletedStat');
        if (labsCompletedStat) labsCompletedStat.textContent = String(Number(stats.labsCompleted || 0));

        const firstAttemptStat = document.getElementById('firstAttemptStat');
        if (firstAttemptStat) firstAttemptStat.textContent = String(Number(stats.firstAttemptCompletions || 0));

        // Badges
        const badgesContainer = document.getElementById('badgesContainer');
        if (badgesContainer) {
            if (badges.length === 0) {
                badgesContainer.innerHTML = '<div class="no-badges">No badges earned yet. Keep going.</div>';
            } else {
                badgesContainer.innerHTML = badges
                    .slice()
                    .sort((a, b) => new Date(b.earnedAt || 0) - new Date(a.earnedAt || 0))
                    .map(b => `
                        <div class="badge-card">
                            <div class="badge-icon"><i class='${escapeHtml(String(b.icon || 'bx bx-award'))}'></i></div>
                            <div class="badge-info">
                                <h4>${escapeHtml(String(b.name || 'Badge'))}</h4>
                                <p>${escapeHtml(String(b.description || ''))}</p>
                                <small>${b.earnedAt ? `Earned: ${new Date(b.earnedAt).toLocaleDateString()}` : ''}</small>
                            </div>
                        </div>
                    `).join('');
            }
        }

        const updatesContainer = document.getElementById('gamificationUpdatesContainer');
        const liveUpdates = [
            ...achievements.map((item) => ({
                title: item.name || 'Achievement unlocked',
                description: item.description || 'Keep the streak going.',
                at: item.unlockedAt || null,
                icon: 'bx bx-trophy',
                sortAt: item.unlockedAt || null
            })),
            ...pointsHistory.map((item) => ({
                title: `${Number(item.points || 0)} points`,
                description: item.reason || 'Activity completed',
                at: item.createdAt || null,
                icon: 'bx bx-bolt-circle',
                sortAt: item.createdAt || null
            }))
        ]
            .sort((left, right) => new Date(right.sortAt || 0) - new Date(left.sortAt || 0))
            .slice(0, 8);

        if (updatesContainer) {
            if (liveUpdates.length === 0) {
                updatesContainer.innerHTML = '<div class="no-achievements">No live updates yet. Your next run or badge unlock will appear here.</div>';
            } else {
                updatesContainer.innerHTML = liveUpdates.map((item) => `
                    <div class="achievement-card live-update">
                        <div class="achievement-icon"><i class='${escapeHtml(String(item.icon || 'bx bx-trophy'))}'></i></div>
                        <div class="achievement-info">
                            <h4>${escapeHtml(String(item.title || 'Achievement'))}</h4>
                            <p>${escapeHtml(String(item.description || ''))}</p>
                            <small>${item.at ? `Date: ${new Date(item.at).toLocaleString()}` : ''}</small>
                        </div>
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.error('[GAMIFICATION] load failed:', error);
        showNotification('Error loading gamification: ' + error.message, 'error');
    }
}

// ==================== MY LAB FILES ====================

async function loadMyLabFiles() {
    try {
        const response = await window.api.getMyLabFiles();
        
        if (response && response.success) {
            const files = response.data;
            const container = document.getElementById('myLabFilesContainer');
            
            if (!container) return;
            
            if (!files || files.length === 0) {
                container.innerHTML = '<p class="no-files">No files saved yet. Save your code from the editors to see it here!</p>';
                return;
            }
            
            container.innerHTML = files.map(file => `
                <div class="file-card" data-file-id="${file._id}">
                    <div class="file-header">
                        <div class="file-icon">
                            <i class='bx bx-file'></i>
                        </div>
                        <div class="file-info">
                            <h3>${file.fileName}</h3>
                            <p class="file-meta">
                                <span class="file-language ${file.language}">${file.language.toUpperCase()}</span>
                                <span class="file-date">${new Date(file.createdAt).toLocaleDateString()}</span>
                            </p>
                            <p class="file-description">${file.description || 'No description'}</p>
                        </div>
                    </div>
                    <div class="file-actions">
                        <button class="btn btn-secondary" onclick="viewLabFile('${file._id}')">
                            <i class='bx bx-show'></i> View
                        </button>
                        <button class="btn btn-primary" onclick="downloadLabFile('${file._id}')">
                            <i class='bx bx-download'></i> Download
                        </button>
                        <button class="btn btn-danger" onclick="deleteLabFile('${file._id}')">
                            <i class='bx bx-trash'></i> Delete
                        </button>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading lab files:', error);
        showNotification('Error loading lab files: ' + error.message, 'error');
    }
}

async function viewLabFile(fileId) {
    try {
        const fileIdStr = String(fileId);
        const existingModal = document.getElementById('labFileModal');
        if (existingModal) {
            if (existingModal.dataset && existingModal.dataset.fileId === fileIdStr) {
                existingModal.style.display = 'flex';
                return;
            }
            existingModal.dataset.fileId = fileIdStr;
            existingModal.style.display = 'flex';
            const existingBody = existingModal.querySelector('.modal-content');
            if (existingBody) {
                existingBody.innerHTML = '<div style="padding: 24px; text-align: center; color: #666;">Loading...</div>';
            }
        } else {
            const modal = document.createElement('div');
            modal.id = 'labFileModal';
            modal.className = 'modal';
            modal.dataset.fileId = fileIdStr;
            modal.innerHTML = '<div class="modal-content" role="dialog" aria-modal="true" aria-label="Lab file viewer"><div style="padding: 24px; text-align: center; color: #666;">Loading...</div></div>';
            document.body.appendChild(modal);
            modal.style.display = 'flex';

            const closeModal = () => {
                const m = document.getElementById('labFileModal');
                if (m) m.style.display = 'none';
            };

            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal();
            });

            const onEsc = (e) => {
                if (e.key === 'Escape') closeModal();
            };
            modal.dataset.escHandlerAttached = '1';
            document.addEventListener('keydown', onEsc);

            modal.dataset.escHandlerId = 'labFileModalEscHandler';
            window.__labFileModalEscHandler = onEsc;
        }

        const response = await window.api.getMyLabFile(fileId);
        
        if (response && response.success) {
            const file = response.data;

            const modal = document.getElementById('labFileModal');
            if (!modal || (modal.dataset && modal.dataset.fileId !== fileIdStr)) {
                return;
            }
            modal.innerHTML = `
                <div class="modal-content" role="dialog" aria-modal="true" aria-label="Lab file viewer">
                    <button type="button" class="close" aria-label="Close">&times;</button>
                    <h2>${file.fileName}</h2>
                    <div class="file-details">
                        <p><strong>Language:</strong> ${file.language.toUpperCase()}</p>
                        <p><strong>Created:</strong> ${new Date(file.createdAt).toLocaleString()}</p>
                        ${file.description ? `<p><strong>Description:</strong> ${file.description}</p>` : ''}
                        ${file.topic ? `<p><strong>Topic:</strong> ${file.topic}</p>` : ''}
                    </div>
                    <div class="code-viewer">
                        <pre><code class="language-${file.language}">${escapeHtml(file.code)}</code></pre>
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-primary" id="labFileModalDownloadBtn">
                            <i class='bx bx-download'></i> Download
                        </button>
                        <button class="btn btn-secondary" id="labFileModalCloseBtn">
                            Close
                        </button>
                    </div>
                </div>
            `;

            const closeModal = () => {
                const m = document.getElementById('labFileModal');
                if (m) m.style.display = 'none';
            };

            const closeBtn = modal.querySelector('.close');
            if (closeBtn) closeBtn.onclick = closeModal;

            const closeFooterBtn = modal.querySelector('#labFileModalCloseBtn');
            if (closeFooterBtn) closeFooterBtn.onclick = closeModal;

            const downloadBtn = modal.querySelector('#labFileModalDownloadBtn');
            if (downloadBtn) downloadBtn.onclick = () => downloadLabFile(fileId);
            
            // Highlight code if hljs is available
            if (typeof hljs !== 'undefined') {
                const codeBlock = modal.querySelector('code');
                if (codeBlock) {
                    hljs.highlightElement(codeBlock);
                }
            }
        }
    } catch (error) {
        console.error('Error viewing file:', error);
        showNotification('Error viewing file: ' + error.message, 'error');
    }
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

async function downloadLabFile(fileId) {
    try {
        const response = await window.api.getMyLabFile(fileId);
        
        if (response && response.success) {
            const file = response.data;
            const blob = new Blob([file.code], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = file.fileName;
            document.body.appendChild(a);
            a.click();
            
            // Clean up
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        }
    } catch (error) {
        console.error('Error downloading file:', error);
        showNotification('Error downloading file: ' + error.message, 'error');
    }
}

async function deleteLabFile(fileId) {
    if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await window.api.deleteMyLabFile(fileId);
        
        if (response && response.success) {
            showNotification('File deleted successfully', 'success');
            // Reload the files list
            await loadMyLabFiles();
        } else {
            throw new Error(response.message || 'Failed to delete file');
        }
    } catch (error) {
        console.error('Error deleting file:', error);
        showNotification('Error deleting file: ' + error.message, 'error');
    }
}

// ==================== NOTIFICATIONS ====================

async function loadNotifications() {
    try {
        const response = await window.api.getNotifications({ limit: 100 });
        const notifications = response?.success ? (response.data || []) : [];
        lastNotificationItems = notifications;

        const container = document.getElementById('notificationsContainer');
        if (!container) return;

        if (!notifications.length) {
            container.innerHTML = '<p class="no-notifications">No notifications yet. New task and gamification updates will appear here.</p>';
            renderQuickRecentActivity([]);
            await refreshNotificationBadge([]);
            return;
        }

        container.innerHTML = notifications.map((notification) => {
            const action = resolveNotificationAction(notification);
            const isRead = Boolean(notification.readAt);
            const icon = getNotificationIcon(notification.type, notification.meta || {});
            const labName = notification.meta?.labId?.name || '';

            return `
                <div class="notification-card ${isRead ? 'is-read' : 'is-unread'}" data-notification-id="${notification._id}">
                    <div class="notification-icon">
                        <i class='${escapeHtml(icon)}'></i>
                    </div>
                    <div class="notification-content">
                        <h4>${escapeHtml(String(notification.title || 'Notification'))}</h4>
                        <p>${escapeHtml(String(notification.message || ''))}</p>
                        <small>${notification.createdAt ? new Date(notification.createdAt).toLocaleString() : ''}</small>
                        <div class="notification-meta">
                            <span class="notification-pill">${escapeHtml(String(notification.type || 'system').toUpperCase())}</span>
                            ${labName ? `<span class="notification-pill">${escapeHtml(labName)}</span>` : ''}
                            <span class="notification-pill notification-state ${isRead ? 'read' : ''}">${isRead ? 'Seen' : 'Unseen'}</span>
                        </div>
                    </div>
                    <div class="notification-actions">
                        <button type="button" class="btn btn-primary" data-notification-id="${notification._id}">
                            ${escapeHtml(action.label)}
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        renderQuickRecentActivity(notifications);
        await refreshNotificationBadge(notifications);
    } catch (error) {
        console.error('Error loading notifications:', error);
        showNotification('Error loading notifications: ' + error.message, 'error');
    }
}

function getNotificationIcon(type, meta = {}) {
    if (type === 'task') return 'bx bx-task';
    if (type === 'grading') return 'bx bx-check-shield';
    if (type === 'submission') return 'bx bx-upload';
    if (type === 'gamification' && meta.badgeId) return 'bx bx-medal';
    if (type === 'gamification') return 'bx bx-trophy';
    return 'bx bx-bell';
}

function getReferenceId(value) {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value._id || value.id || '';
}

function resolveNotificationAction(notification) {
    const type = String(notification?.type || 'system').toLowerCase();
    const meta = notification?.meta || {};
    const assignedTaskId = getReferenceId(meta.assignedTaskId);

    if (type === 'task' && assignedTaskId) {
        return { label: 'Open Task', kind: 'task-editor', assignedTaskId };
    }

    if (type === 'grading' && assignedTaskId) {
        return { label: 'View Review', kind: 'task-review', assignedTaskId };
    }

    if (type === 'gamification') {
        return { label: 'Open Gamification', kind: 'section', sectionId: 'gamification' };
    }

    if (meta.labId || meta.taskId) {
        return { label: 'Open Assigned Labs', kind: 'section', sectionId: 'assigned-labs' };
    }

    return { label: 'Open Analytics', kind: 'section', sectionId: 'analytics' };
}

async function handleNotificationClick(notificationId) {
    if (!notificationId) return;

    const notification = lastNotificationItems.find((item) => String(item._id) === String(notificationId));
    if (!notification) return;

    if (!notification.readAt) {
        await markNotificationRead(notificationId);
    }

    const action = resolveNotificationAction(notification);
    if (action.kind === 'task-editor' && action.assignedTaskId) {
        await openCodeEditor(String(action.assignedTaskId));
        return;
    }

    if (action.kind === 'task-review' && action.assignedTaskId) {
        const navItem = document.querySelector('a.nav-item[href="#assigned-labs"]');
        if (navItem) {
            navItem.click();
            setTimeout(() => {
                viewTaskGrade(String(action.assignedTaskId));
                const card = document.querySelector(`[data-assigned-task-id="${action.assignedTaskId}"]`);
                if (card) {
                    card.classList.add('notification-focus');
                    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setTimeout(() => card.classList.remove('notification-focus'), 1800);
                }
            }, 250);
        }
        return;
    }

    if (action.kind === 'section' && action.sectionId) {
        const navItem = document.querySelector(`a.nav-item[href="#${action.sectionId}"]`);
        if (navItem) navItem.click();
    }
}

async function markNotificationRead(notificationId) {
    try {
        const response = await window.api.markNotificationRead(notificationId);
        if (response && response.success) {
            lastNotificationItems = lastNotificationItems.map((item) => (
                String(item._id) === String(notificationId)
                    ? { ...item, readAt: response.data?.readAt || new Date().toISOString() }
                    : item
            ));
            await loadNotifications();
        }
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}
