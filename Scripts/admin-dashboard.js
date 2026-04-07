// Admin Dashboard JavaScript - Full Backend Integration

function showLogsModal(logText) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 900px; width: 90%;">
            <span class="close" style="cursor:pointer; float:right; font-size: 22px;" onclick="this.closest('.modal').remove()">&times;</span>
            <h3 style="margin-top:0;">Container Logs</h3>
            <pre style="background:#111; color:#eee; padding:12px; border-radius:8px; overflow:auto; max-height:60vh;">${escapeHtml(String(logText || ''))}</pre>
            <div style="margin-top: 12px; text-align: right;">
                <button class="btn btn-outline" type="button" onclick="this.closest('.modal').remove()">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Check authentication on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is logged in and is admin
    const token = sessionStorage.getItem('token');
    const userType = sessionStorage.getItem('userType');
    
    if (!token || userType !== 'admin') {
        alert('Access denied. Please login as admin.');
        window.location.href = 'login.html';
        return;
    }
    // Get username from sessionStorage
    const username = sessionStorage.getItem('username') || 'Admin';
    document.getElementById('adminName').textContent = username;

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
        // Load initial data based on active section
        const activeSection = document.querySelector('.content-section.active');
        if (activeSection) {
            const sectionId = activeSection.id;
            await loadSectionData(sectionId);
        }
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showNotification('Error loading dashboard data', 'error');
    }
}

// Load data for specific section
async function loadSectionData(sectionId) {
    switch (sectionId) {
        case 'user-management':
            await loadUsers();
            break;
        case 'lab-environments':
            await loadLabs();
            await loadContainers();
            break;
        case 'task-management':
            await loadTasks();
            break;
        case 'monitoring':
            await loadMonitoringData();
            break;
    }
}

// ==================== USER MANAGEMENT ====================

async function loadUsers(filters = {}) {
    const activeTabBtn = document.querySelector('.tab-btn.active');
    const currentTab = (activeTabBtn && activeTabBtn.getAttribute('data-tab')) || 'students';
    const tabId = currentTab + '-tab';

    try {
        const tabEl = document.getElementById(tabId);
        if (tabEl) showLoading(tabId);
        const response = await window.api.getUsers(filters);

        if (response.success) {
            renderUsersTable(response.data, currentTab);
            if (currentTab === 'students') {
                updateFilters(response.data);
            }
        }
    } catch (error) {
        console.error('Error loading users:', error);
        showNotification('Error loading users: ' + error.message, 'error');
    } finally {
        if (document.getElementById(tabId)) hideLoading(tabId);
    }
}

function renderUsersTable(users, tab) {
    const tbody = document.querySelector(`#${tab}-tab tbody`);
    if (!tbody) return;

    const isFaculty = tab === 'faculty';
    const colSpan = isFaculty ? 7 : 8;

    if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align: center; padding: 2rem;">No ${isFaculty ? 'faculty' : 'students'} found</td></tr>`;
        if (!isFaculty) {
            resetUserSelectionState();
            updateBulkActionState();
        }
        return;
    }

    if (isFaculty) {
        tbody.innerHTML = users.map(user => `
            <tr data-user-id="${user._id || user.id}" data-status="${user.status || 'active'}">
                <td>${user.profile?.studentId || user._id?.substring(0, 8) || 'N/A'}</td>
                <td>${user.profile?.firstName && user.profile?.lastName ? `${user.profile.firstName} ${user.profile.lastName}` : user.username}</td>
                <td>${user.email}</td>
                <td>${user.department || user.profile?.department || 'N/A'}</td>
                <td>${user.assignedCourses || '—'}</td>
                <td><span class="status-badge ${user.status || 'active'}">${(user.status || 'active').charAt(0).toUpperCase() + (user.status || 'active').slice(1)}</span></td>
                <td>
                    <button class="btn-icon edit-user" title="Edit" data-user-id="${user._id || user.id}"><i class='bx bx-edit'></i></button>
                    <button class="btn-icon reset-password" title="Reset Password" data-user-id="${user._id || user.id}"><i class='bx bx-key'></i></button>
                    <button class="btn-icon toggle-status" title="${user.status === 'active' ? 'Deactivate' : 'Activate'}" data-user-id="${user._id || user.id}" data-status="${user.status || 'active'}"><i class='bx ${user.status === 'active' ? 'bx-x-circle' : 'bx-check-circle'}'></i></button>
                </td>
            </tr>
        `).join('');
    } else {
        tbody.innerHTML = users.map(user => `
            <tr 
                data-user-id="${user._id || user.id}"
                data-batch="${user.batch || ''}"
                data-section="${user.section || ''}"
                data-status="${user.status || 'active'}"
            >
                <td><input type="checkbox" class="user-checkbox" data-user-id="${user._id || user.id}"></td>
                <td>${user.profile?.studentId || user._id?.substring(0, 8) || 'N/A'}</td>
                <td>${user.profile?.firstName && user.profile?.lastName ? `${user.profile.firstName} ${user.profile.lastName}` : user.username}</td>
                <td>${user.email}</td>
                <td>${user.batch || 'N/A'}</td>
                <td>${user.section || 'N/A'}</td>
                <td><span class="status-badge ${user.status || 'active'}">${(user.status || 'active').charAt(0).toUpperCase() + (user.status || 'active').slice(1)}</span></td>
                <td>
                    <button class="btn-icon edit-user" title="Edit" data-user-id="${user._id || user.id}"><i class='bx bx-edit'></i></button>
                    <button class="btn-icon reset-password" title="Reset Password" data-user-id="${user._id || user.id}"><i class='bx bx-key'></i></button>
                    <button class="btn-icon toggle-status" title="${user.status === 'active' ? 'Deactivate' : 'Activate'}" data-user-id="${user._id || user.id}" data-status="${user.status || 'active'}"><i class='bx ${user.status === 'active' ? 'bx-x-circle' : 'bx-check-circle'}'></i></button>
                </td>
            </tr>
        `).join('');
        setupUserSelectionFeatures();
        if (typeof applyStudentFilters === 'function') applyStudentFilters();
    }

    attachUserActionListeners();
}

function applyStudentFilters() {
    const batchSelect = document.getElementById('batchFilter');
    const sectionSelect = document.getElementById('sectionFilter');
    const statusSelect = document.getElementById('statusFilter');

    const batch = batchSelect ? batchSelect.value : '';
    const section = sectionSelect ? sectionSelect.value : '';
    const status = statusSelect ? statusSelect.value : '';

    const rows = document.querySelectorAll('#students-tab tbody tr');

    rows.forEach(row => {
        const rowBatch = row.dataset.batch || '';
        const rowSection = row.dataset.section || '';
        const rowStatus = row.dataset.status || 'active';

        const matchBatch   = !batch   || rowBatch   === batch;
        const matchSection = !section || rowSection === section;
        const matchStatus  = !status  || rowStatus  === status;

        if (matchBatch && matchSection && matchStatus) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}



function attachUserActionListeners() {
    // Edit user
    document.querySelectorAll('.edit-user').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const userId = e.currentTarget.dataset.userId;
            openEditUserModal(userId);
        });
    });

    // Reset password
    document.querySelectorAll('.reset-password').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const userId = e.currentTarget.dataset.userId;
            resetUserPassword(userId);
        });
    });

    // Toggle status
    document.querySelectorAll('.toggle-status').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const userId = e.currentTarget.dataset.userId;
            const currentStatus = e.currentTarget.dataset.status;
            toggleUserStatus(userId, currentStatus);
        });
    });
}

function setupUserSelectionFeatures() {
    setupSelectAllCheckbox();
    attachUserCheckboxListeners();
    updateBulkActionState();
}

function setupSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById('selectAllUsers');
    if (!selectAllCheckbox) return;

    const newCheckbox = selectAllCheckbox.cloneNode(true);
    selectAllCheckbox.parentNode.replaceChild(newCheckbox, selectAllCheckbox);

    newCheckbox.checked = false;
    newCheckbox.indeterminate = false;

    newCheckbox.addEventListener('change', (e) => {
        const checked = e.target.checked;
        document.querySelectorAll('.user-checkbox').forEach(cb => {
            cb.checked = checked;
        });
        updateBulkActionState();
    });
}

function attachUserCheckboxListeners() {
    const selectAllCheckbox = document.getElementById('selectAllUsers');
    const checkboxes = document.querySelectorAll('.user-checkbox');

    checkboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            if (selectAllCheckbox) {
                const total = checkboxes.length;
                const selected = getSelectedUserIds().length;
                selectAllCheckbox.checked = selected === total && total > 0;
                selectAllCheckbox.indeterminate = selected > 0 && selected < total;
            }
            updateBulkActionState();
        });
    });
}

function resetUserSelectionState() {
    const selectAllCheckbox = document.getElementById('selectAllUsers');
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    }
}

function getSelectedUserIds() {
    return Array.from(document.querySelectorAll('.user-checkbox:checked'))
        .map(cb => cb.dataset.userId)
        .filter(Boolean);
}

function updateBulkActionState() {
    const deleteBtn = document.getElementById('deleteSelectedBtn');
    if (!deleteBtn) return;

    const selectedCount = getSelectedUserIds().length;
    deleteBtn.disabled = selectedCount === 0;
}

async function handleDeleteSelectedUsers(e) {
    e.preventDefault();

    const selectedIds = getSelectedUserIds();
    if (selectedIds.length === 0) {
        showNotification('Please select at least one user to delete.', 'error');
        return;
    }

    const currentUserId = sessionStorage.getItem('userId');
    const deletableIds = selectedIds.filter(id => id !== currentUserId);

    if (deletableIds.length === 0) {
        showNotification('You cannot delete your own account.', 'error');
        return;
    }

    if (deletableIds.length !== selectedIds.length) {
        showNotification('Your own admin account was removed from the selection.', 'info');
    }

    if (!confirm(`Are you sure you want to delete ${deletableIds.length} user(s)? This action cannot be undone.`)) {
        return;
    }

    try {
        for (const userId of deletableIds) {
            await window.api.deleteUser(userId);
        }
        showNotification('Selected users deleted successfully.', 'success');
        resetUserSelectionState();
        await loadUsers();
    } catch (error) {
        showNotification('Error deleting users: ' + error.message, 'error');
    } finally {
        updateBulkActionState();
    }
}

async function toggleUserStatus(userId, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    if (!confirm(`Are you sure you want to ${newStatus === 'active' ? 'activate' : 'deactivate'} this user?`)) {
        return;
    }

    try {
        const response = await window.api.updateUser(userId, { status: newStatus });
        if (response.success) {
            showNotification(`User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`, 'success');
            await loadUsers();
        }
    } catch (error) {
        showNotification('Error updating user status: ' + error.message, 'error');
    }
}

async function resetUserPassword(userId) {
    const newPassword = prompt('Enter new password (leave empty for default "default123"):');
    if (newPassword === null) return;

    try {
        const response = await window.api.resetUserPassword(userId, newPassword || 'default123');
        if (response.success) {
            showNotification('Password reset successfully', 'success');
        }
    } catch (error) {
        showNotification('Error resetting password: ' + error.message, 'error');
    }
}

async function openEditUserModal(userId) {
    try {
        const response = await window.api.getUser(userId);
        if (response.success) {
            const user = response.data;
            // Open edit modal (you'll need to create this modal)
            showEditUserModal(user);
        }
    } catch (error) {
        showNotification('Error loading user: ' + error.message, 'error');
    }
}

function updateFilters(users) {
    // Find the three filter selects inside the students tab (batch, section, status)
    const container = document.getElementById('students-tab');
    if (!container) return;

    const selects = Array.from(container.querySelectorAll('.filter-select'));
    const batchSelect = selects[0] || null;
    const sectionSelect = selects[1] || null;
    const statusSelect = selects[2] || null;

    // Extract unique batches and sections and sort them
    const batches = [...new Set(users.map(u => u.batch).filter(Boolean))].sort();
    const sections = [...new Set(users.map(u => u.section).filter(Boolean))].sort();

    const populate = (selectEl, items, allLabel) => {
        if (!selectEl) return;
        // Preserve current selection
        const current = selectEl.value || '';
        selectEl.innerHTML = '';
        const optAll = document.createElement('option');
        optAll.value = '';
        optAll.textContent = allLabel || 'All';
        selectEl.appendChild(optAll);
        items.forEach(it => {
            const o = document.createElement('option');
            o.value = it;
            o.textContent = it;
            selectEl.appendChild(o);
        });
        // restore selection if still available
        if (current) {
            const match = Array.from(selectEl.options).some(o => o.value === current);
            if (match) selectEl.value = current;
        }
    };

    populate(batchSelect, batches, 'All Batches');
    populate(sectionSelect, sections, 'All Sections');

    if (statusSelect) {
        const cur = statusSelect.value || '';
        statusSelect.innerHTML = '';
        const optAll = document.createElement('option'); optAll.value = ''; optAll.textContent = 'All Status'; statusSelect.appendChild(optAll);
        ['active', 'inactive'].forEach(s => {
            const o = document.createElement('option'); o.value = s; o.textContent = s.charAt(0).toUpperCase() + s.slice(1); statusSelect.appendChild(o);
        });
        if (cur && Array.from(statusSelect.options).some(o => o.value === cur)) statusSelect.value = cur;
    }

    // Ensure selects have stable IDs for other code
    if (batchSelect && !batchSelect.id) batchSelect.id = 'batchFilter';
    if (sectionSelect && !sectionSelect.id) sectionSelect.id = 'sectionFilter';
    if (statusSelect && !statusSelect.id) statusSelect.id = 'statusFilter';

    // Hook up change handlers to apply filters on the client side
    [batchSelect, sectionSelect, statusSelect].forEach(sel => {
        if (!sel) return;
        sel.removeEventListener('change', applyStudentFilters);
        sel.addEventListener('change', applyStudentFilters);
    });

    // Apply filters immediately so the table reflects current selections
    if (typeof applyStudentFilters === 'function') applyStudentFilters();
}

// ==================== LAB MANAGEMENT ====================

async function loadLabs() {
    try {
        showLoading('lab-environments');
        const response = await window.api.getLabs();
        
        if (response.success) {
            renderLabsGrid(response.data);
        }
    } catch (error) {
        console.error('Error loading labs:', error);
        showNotification('Error loading labs: ' + error.message, 'error');
    } finally {
        hideLoading('lab-environments');
    }
}

function renderLabsGrid(labs) {
    const grid = document.querySelector('.lab-templates-grid');
    if (!grid) return;

    if (labs.length === 0) {
        grid.innerHTML = '<p style="text-align: center; padding: 2rem;">No lab templates found. Create your first lab template!</p>';
        return;
    }

    grid.innerHTML = labs.map(lab => `
        <div class="template-card" data-lab-id="${lab._id || lab.id}">
            <div class="template-header">
                <h3>${lab.name}</h3>
                <span class="template-status ${lab.isActive ? 'active' : 'inactive'}">
                    ${lab.isActive ? 'Active' : 'Inactive'}
                </span>
            </div>
            <div class="template-info">
                <p><i class='bx bx-image'></i> Image: ${lab.template?.dockerImage || 'N/A'}</p>
                <p><i class='bx bx-chip'></i> CPU: ${lab.template?.resources?.cpu || 2} cores</p>
                <p><i class='bx bx-memory-card'></i> Memory: ${lab.template?.resources?.memory || '2GB'}</p>
                <p><i class='bx bx-hdd'></i> Storage: ${lab.template?.resources?.storage || '10GB'}</p>
            </div>
            <div class="template-actions">
                <button class="btn btn-outline edit-lab" data-lab-id="${lab._id || lab.id}">Edit</button>
                <button class="btn btn-outline view-containers" data-lab-id="${lab._id || lab.id}">View Containers</button>
                <button class="btn btn-outline delete-lab" data-lab-id="${lab._id || lab.id}" style="color: #e74c3c;">Delete</button>
            </div>
        </div>
    `).join('');

    // Attach event listeners
    document.querySelectorAll('.edit-lab').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const labId = e.currentTarget.dataset.labId;
            openEditLabModal(labId);
        });
    });

    document.querySelectorAll('.delete-lab').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const labId = e.currentTarget.dataset.labId;
            deleteLab(labId);
        });
    });

    document.querySelectorAll('.view-containers').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const labId = e.currentTarget.dataset.labId;
            if (!labId) return;

            // Toggle filter
            if (activeContainersLabFilter && String(activeContainersLabFilter) === String(labId)) {
                activeContainersLabFilter = null;
                showNotification('Showing containers for all labs', 'info');
            } else {
                activeContainersLabFilter = labId;
                showNotification('Showing containers for selected lab', 'info');
            }
            await loadContainers();
        });
    });
}

async function deleteLab(labId) {
    if (!confirm('Are you sure you want to delete this lab template?')) {
        return;
    }

    try {
        const response = await window.api.deleteLab(labId);
        if (response.success) {
            showNotification('Lab deleted successfully', 'success');
            await loadLabs();
        }
    } catch (error) {
        showNotification('Error deleting lab: ' + error.message, 'error');
    }
}

async function openEditLabModal(labId) {
    try {
        const response = await window.api.getLab(labId);
        if (response.success) {
            showEditLabModal(response.data);
        }
    } catch (error) {
        showNotification('Error loading lab: ' + error.message, 'error');
    }
}

// ==================== CONTAINER MANAGEMENT ====================

let activeContainersLabFilter = null;

async function loadContainers() {
    try {
        const response = await window.api.getAllContainers();
        
        if (response.success) {
            let containers = response.data || [];
            if (activeContainersLabFilter) {
                containers = containers.filter(c => {
                    const labId = (c.labId && (c.labId._id || c.labId.id)) ? String(c.labId._id || c.labId.id) : String(c.labId || '');
                    return labId && labId === String(activeContainersLabFilter);
                });
            }
            renderContainersList(containers);
        }
    } catch (error) {
        console.error('Error loading containers:', error);
        // Don't show error if endpoint doesn't exist yet
        if (error.message.includes('404')) {
            document.querySelector('.containers-list').innerHTML = '<p>Container monitoring will be available soon.</p>';
        }
    }
}

function renderContainersList(containers) {
    const list = document.querySelector('.containers-list');
    if (!list) return;

    if (containers.length === 0) {
        list.innerHTML = '<p style="text-align: center; padding: 1rem;">No active containers</p>';
        return;
    }

    list.innerHTML = containers.map(container => {
        const startedAt = container.startedAt ? new Date(container.startedAt).toLocaleString() : 'Unknown';
        const timeAgo = container.startedAt ? getTimeAgo(new Date(container.startedAt)) : 'Unknown';
        
        return `
            <div class="container-item" data-container-id="${container.containerId || container._id}">
                <div class="container-info">
                    <strong>${container.userId?.username || 'User'} - ${container.labId?.name || 'Lab'}</strong>
                    <p>Container: ${container.containerId?.substring(0, 12) || 'N/A'}</p>
                    <p>Started: ${timeAgo}</p>
                </div>
                <div class="container-status ${container.status || 'running'}">
                    <i class='bx bx-check-circle'></i> ${(container.status || 'running').charAt(0).toUpperCase() + (container.status || 'running').slice(1)}
                </div>
                <div class="container-actions">
                    <button class="btn-icon view-logs" title="View Logs" data-container-id="${container.containerId || container._id}">
                        <i class='bx bx-file'></i>
                    </button>
                    <button class="btn-icon stop-container" title="Stop" data-container-id="${container.containerId || container._id}">
                        <i class='bx bx-stop'></i>
                    </button>
                    <button class="btn-icon danger kill-container" title="Kill" data-container-id="${container.containerId || container._id}">
                        <i class='bx bx-x'></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Attach event listeners
    document.querySelectorAll('.view-logs').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const containerId = e.currentTarget.dataset.containerId;
            viewContainerLogs(containerId);
        });
    });

    document.querySelectorAll('.stop-container').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const containerId = e.currentTarget.dataset.containerId;
            stopContainer(containerId);
        });
    });

    document.querySelectorAll('.kill-container').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const containerId = e.currentTarget.dataset.containerId;
            killContainer(containerId);
        });
    });
}

async function viewContainerLogs(containerId) {
    try {
        const response = await window.api.adminGetContainerLogs(containerId, 200);
        if (response.success) {
            showLogsModal(response.data);
        }
    } catch (error) {
        showNotification('Error loading logs: ' + error.message, 'error');
    }
}

async function stopContainer(containerId) {
    if (!confirm('Are you sure you want to stop this container?')) {
        return;
    }

    try {
        const response = await window.api.adminStopContainer(containerId);
        if (response.success) {
            showNotification('Container stopped successfully', 'success');
            await loadContainers();
            // Keep Monitoring tab in sync if it's open.
            try { await loadMonitoringData(); } catch {}
        }
    } catch (error) {
        showNotification('Error stopping container: ' + error.message, 'error');
    }
}

async function restartContainer(containerId) {
    if (!confirm('Restart this container?')) {
        return;
    }

    try {
        const response = await window.api.adminRestartContainer(containerId);
        if (response.success) {
            showNotification('Container restarted successfully', 'success');
            await loadContainers();
            try { await loadMonitoringData(); } catch {}
        }
    } catch (error) {
        showNotification('Error restarting container: ' + error.message, 'error');
    }
}

async function killContainer(containerId) {
    if (!confirm('Are you sure you want to kill this container? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await window.api.adminRemoveContainer(containerId);
        if (response.success) {
            showNotification('Container killed successfully', 'success');
            await loadContainers();
            try { await loadMonitoringData(); } catch {}
        }
    } catch (error) {
        showNotification('Error killing container: ' + error.message, 'error');
    }
}

// ==================== TASK MANAGEMENT ====================

async function loadTasks() {
    try {
        showLoading('task-management');
        const response = await window.api.getAllTasks();
        
        if (response.success) {
            renderTasksList(response.data);
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
        showNotification('Error loading tasks: ' + error.message, 'error');
    } finally {
        hideLoading('task-management');
    }
}

function renderTasksList(tasks) {
    const list = document.querySelector('.tasks-list-admin');
    if (!list) return;

    if (tasks.length === 0) {
        list.innerHTML = '<p style="text-align: center; padding: 2rem;">No tasks found. Create your first task!</p>';
        return;
    }

    list.innerHTML = tasks.map(task => {
        const deadline = new Date(task.deadline).toLocaleDateString();
        const isOverdue = new Date(task.deadline) < new Date() && task.status === 'active';
        // Prefer AssignedTask-based submission counts (the real student submission flow).
        const submissionCount = Number.isFinite(Number(task.assignedSubmissionCount))
            ? Number(task.assignedSubmissionCount)
            : (task.submissions?.length || 0);
        
        return `
            <div class="task-card-admin" data-task-id="${task._id || task.id}">
                <div class="task-header-admin">
                    <div>
                        <h3>${task.title}</h3>
                        ${task.isImportant ? '<span class="task-badge important">Important</span>' : ''}
                        <span class="task-badge difficulty-${task.difficulty || 'medium'}">${(task.difficulty || 'medium').charAt(0).toUpperCase() + (task.difficulty || 'medium').slice(1)}</span>
                    </div>
                    <div class="task-meta-admin">
                        <span class="${isOverdue ? 'text-danger' : ''}">
                            <i class='bx bx-calendar'></i> Due: ${deadline} ${isOverdue ? '(Overdue)' : ''}
                        </span>
                        <span><i class='bx bx-user'></i> ${submissionCount} submission${submissionCount !== 1 ? 's' : ''}</span>
                    </div>
                </div>
                <p class="task-description">${task.description}</p>
                ${task.assignedTo && task.assignedTo.length > 0 ? `
                    <div class="task-assignments">
                        <strong>Assigned to:</strong>
                        ${task.assignedTo.map(assignment => 
                            `<span class="assignment-tag">${assignment.assignToAll ? 'All Students' : (assignment.batch || '') + (assignment.section ? ' - ' + assignment.section : '')}</span>`
                        ).join('')}
                    </div>
                ` : ''}
                <div class="task-actions-admin">
                    <button class="btn btn-outline edit-task" data-task-id="${task._id || task.id}">Edit</button>
                    <button class="btn btn-outline extend-deadline" data-task-id="${task._id || task.id}">Extend Deadline</button>
                    ${task.status === 'closed' ? '<button class="btn btn-outline reopen-task" data-task-id="' + (task._id || task.id) + '">Re-open</button>' : ''}
                    <button class="btn btn-outline view-submissions" data-task-id="${task._id || task.id}">View Submissions</button>
                    <button class="btn btn-outline delete-task" data-task-id="${task._id || task.id}" style="color: #e74c3c;">Delete</button>
                </div>
            </div>
        `;
    }).join('');

    // Attach event listeners
    attachTaskActionListeners();
}

function attachTaskActionListeners() {
    document.querySelectorAll('.edit-task').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const taskId = e.currentTarget.dataset.taskId;
            openEditTaskModal(taskId);
        });
    });

    document.querySelectorAll('.delete-task').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const taskId = e.currentTarget.dataset.taskId;
            deleteTask(taskId);
        });
    });

    document.querySelectorAll('.view-submissions').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const taskId = e.currentTarget.dataset.taskId;
            viewTaskSubmissions(taskId);
        });
    });

    document.querySelectorAll('.extend-deadline').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const taskId = e.currentTarget.dataset.taskId;
            extendTaskDeadline(taskId);
        });
    });

    document.querySelectorAll('.reopen-task').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const taskId = e.currentTarget.dataset.taskId;
            reopenTask(taskId);
        });
    });
}

async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) {
        return;
    }

    try {
        const response = await window.api.deleteTask(taskId);
        if (response.success) {
            showNotification('Task deleted successfully', 'success');
            await loadTasks();
        }
    } catch (error) {
        showNotification('Error deleting task: ' + error.message, 'error');
    }
}

async function viewTaskSubmissions(taskId) {
    try {
        // Prefer AssignedTask submissions (this is what student code-editor submits)
        const assignedResp = await window.api.getAssignedTaskSubmissionsAdmin({ taskId });
        if (assignedResp && assignedResp.success) {
            showAssignedTaskSubmissionsModal(assignedResp.data);
            return;
        }

        // Fallback: legacy Task.submissions
        const response = await window.api.getTaskSubmissions(taskId);
        if (response.success) {
            showSubmissionsModal(response.data);
        }
    } catch (error) {
        showNotification('Error loading submissions: ' + error.message, 'error');
    }
}

async function extendTaskDeadline(taskId) {
    const card = document.querySelector(`.task-card-admin[data-task-id="${taskId}"]`);
    if (!card) return;

    // If editor already open, do nothing
    if (card.querySelector('.deadline-inline-editor')) return;

    // Read current value from the "Due:" text if possible, else leave blank
    let currentValue = '';
    try {
        const deadlineText = card.querySelector('.task-meta-admin')?.textContent || '';
        const m = deadlineText.match(/Due:\s*([0-9]{1,2}\/[^\s]+)/i);
        if (m && m[1]) {
            // Can't reliably parse locale date; leave blank if unknown
            currentValue = '';
        }
    } catch (e) {
        currentValue = '';
    }

    const container = document.createElement('div');
    container.className = 'deadline-inline-editor';
    container.style.cssText = 'margin-top: 10px; display:flex; gap:8px; align-items:center;';
    container.innerHTML = `
        <input type="date" class="deadline-inline-input" value="${currentValue}" style="padding:6px 8px; border:1px solid #ddd; border-radius:6px;" />
        <button type="button" class="btn btn-primary btn-sm deadline-inline-save">Save</button>
        <button type="button" class="btn btn-outline btn-sm deadline-inline-cancel">Cancel</button>
    `;

    const actions = card.querySelector('.task-actions-admin');
    if (!actions) return;
    actions.insertAdjacentElement('afterend', container);

    const input = container.querySelector('.deadline-inline-input');
    const saveBtn = container.querySelector('.deadline-inline-save');
    const cancelBtn = container.querySelector('.deadline-inline-cancel');

    cancelBtn.addEventListener('click', () => {
        container.remove();
    });

    const doSave = async () => {
        const newDate = (input && input.value) ? input.value : '';
        if (!newDate) {
            showNotification('Please select a date', 'error');
            return;
        }

        try {
            const response = await window.api.updateTask(taskId, { deadline: newDate });
            if (response && response.success) {
                showNotification('Deadline updated successfully', 'success');
                container.remove();
                await loadTasks();
            } else {
                showNotification('Error updating deadline', 'error');
            }
        } catch (error) {
            showNotification('Error extending deadline: ' + error.message, 'error');
        }
    };

    saveBtn.addEventListener('click', doSave);
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                doSave();
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                container.remove();
            }
        });
    }
}

async function reopenTask(taskId) {
    try {
        const response = await window.api.updateTask(taskId, { status: 'active' });
        if (response.success) {
            showNotification('Task reopened successfully', 'success');
            await loadTasks();
        }
    } catch (error) {
        showNotification('Error reopening task: ' + error.message, 'error');
    }
}

async function openEditTaskModal(taskId) {
    try {
        const response = await window.api.getAllTasks();
        const task = response.data.find(t => (t._id || t.id) === taskId);
        if (task) {
            showEditTaskModal(task);
        }
    } catch (error) {
        showNotification('Error loading task: ' + error.message, 'error');
    }
}

// ==================== MONITORING ====================

async function loadMonitoringData() {
    try {
        // Load users count
        const usersResponse = await window.api.getUsers();
        const totalUsers = usersResponse.success ? usersResponse.count : 0;

        // Load containers count
        const containersResponse = await window.api.getAllContainers();
        const containers = containersResponse.success ? (containersResponse.data || []) : [];
        const activeContainers = containers.filter(c => String(c.status || '').toLowerCase() === 'running').length;

        // Refresh container list panel
        renderContainersList(containers);

        // Monitoring tables/charts
        renderMonitoringContainersTable(containers);
        renderMonitoringRecentActivity(containers);
        renderMonitoringAlerts(containers);
        renderLabUsageSummary(containers);
        renderMonitoringCharts(containers);

        // Update monitoring cards
        updateMonitoringCards({
            activeContainers,
            totalUsers
        });
    } catch (error) {
        console.error('Error loading monitoring data:', error);
    }
}

function updateMonitoringCards(stats) {
    const cards = document.querySelectorAll('.monitor-card');
    if (cards.length >= 4) {
        cards[0].querySelector('.monitor-value').textContent = stats.activeContainers || 0;
        cards[1].querySelector('.monitor-value').textContent = stats.totalUsers || 0;
        // These require server-side OS metrics; show as N/A for now (better than static fake values).
        cards[2].querySelector('.monitor-value').textContent = 'N/A';
        const cpuSub = cards[2].querySelector('.monitor-subtext');
        if (cpuSub) cpuSub.textContent = 'CPU usage';
        cards[3].querySelector('.monitor-value').textContent = 'N/A';
        const storageSub = cards[3].querySelector('.monitor-subtext');
        if (storageSub) storageSub.textContent = 'Used / Total';
    }
}

function formatDurationSince(dateLike) {
    if (!dateLike) return 'N/A';
    const started = new Date(dateLike);
    if (Number.isNaN(started.getTime())) return 'N/A';
    const ms = Math.max(0, Date.now() - started.getTime());
    const sec = Math.floor(ms / 1000);
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);

    if (day > 0) return `${day}d ${hr % 24}h`;
    if (hr > 0) return `${hr}h ${min % 60}m`;
    if (min > 0) return `${min}m`;
    return `${sec}s`;
}

function renderMonitoringContainersTable(containers) {
    const table = document.getElementById('monitoring-containers-table');
    const tbody = table ? table.querySelector('tbody') : null;
    if (!tbody) return;

    if (!Array.isArray(containers) || containers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 14px; color:#666;">No containers</td></tr>`;
        return;
    }

    const sorted = [...containers].sort((a, b) => {
        const aT = a.startedAt ? new Date(a.startedAt).getTime() : 0;
        const bT = b.startedAt ? new Date(b.startedAt).getTime() : 0;
        return bT - aT;
    });

    tbody.innerHTML = sorted.map(c => {
        const id = c.containerId || c._id || '';
        const shortId = id ? String(id).slice(0, 12) : 'N/A';
        const labName = (c.labId && c.labId.name) ? c.labId.name : (typeof c.labId === 'string' ? c.labId : 'Lab');
        const studentName = (c.userId && c.userId.username) ? c.userId.username : (typeof c.userId === 'string' ? c.userId : 'Student');
        const status = String(c.status || 'unknown').toLowerCase();
        const timeRunning = (status === 'running' && c.startedAt) ? formatDurationSince(c.startedAt) : (c.startedAt ? formatDurationSince(c.startedAt) : '-');
        const lastAct = c.lastAccessed ? getTimeAgo(new Date(c.lastAccessed)) : 'N/A';

        return `
            <tr data-container-id="${escapeHtml(id)}">
                <td><code>${escapeHtml(shortId)}</code></td>
                <td>${escapeHtml(labName)}</td>
                <td>${escapeHtml(studentName)}</td>
                <td><span style="padding: 2px 8px; border-radius: 999px; font-size: 12px; background: ${status === 'running' ? '#e8f5e9' : status === 'paused' ? '#fff8e1' : '#eceff1'}; color: ${status === 'running' ? '#2e7d32' : status === 'paused' ? '#8d6e63' : '#455a64'};">${escapeHtml(status)}</span></td>
                <td>${escapeHtml(timeRunning)}</td>
                <td>${escapeHtml(lastAct)}</td>
                <td style="white-space: nowrap;">
                    ${id ? `
                        <button class="btn-icon monitor-view-logs" title="View Logs" data-container-id="${escapeHtml(id)}"><i class='bx bx-file'></i></button>
                        <button class="btn-icon monitor-restart" title="Restart" data-container-id="${escapeHtml(id)}"><i class='bx bx-refresh'></i></button>
                        <button class="btn-icon monitor-stop" title="Stop" data-container-id="${escapeHtml(id)}"><i class='bx bx-stop'></i></button>
                    ` : ''}
                </td>
            </tr>
        `;
    }).join('');

    tbody.querySelectorAll('.monitor-view-logs').forEach(btn => {
        btn.addEventListener('click', (e) => viewContainerLogs(e.currentTarget.dataset.containerId));
    });
    tbody.querySelectorAll('.monitor-stop').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            await stopContainer(e.currentTarget.dataset.containerId);
        });
    });
    tbody.querySelectorAll('.monitor-restart').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            await restartContainer(e.currentTarget.dataset.containerId);
        });
    });
}

function renderMonitoringRecentActivity(containers) {
    const table = document.getElementById('recent-activity-table');
    const tbody = table ? table.querySelector('tbody') : null;
    if (!tbody) return;

    const items = Array.isArray(containers) ? [...containers] : [];
    items.sort((a, b) => new Date(b.lastAccessed || b.updatedAt || 0) - new Date(a.lastAccessed || a.updatedAt || 0));

    const top = items.slice(0, 10);
    if (top.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 14px; color:#666;">No recent activity</td></tr>`;
        return;
    }

    tbody.innerHTML = top.map(c => {
        const studentName = (c.userId && c.userId.username) ? c.userId.username : 'Student';
        const labName = (c.labId && c.labId.name) ? c.labId.name : 'Lab';
        const status = String(c.status || 'unknown').toLowerCase();
        const action = status === 'running' ? 'Active session' : status === 'paused' ? 'Paused session' : 'Session updated';
        const time = c.lastAccessed ? getTimeAgo(new Date(c.lastAccessed)) : (c.updatedAt ? getTimeAgo(new Date(c.updatedAt)) : 'N/A');
        return `
            <tr>
                <td>${escapeHtml(studentName)}</td>
                <td>${escapeHtml(labName)}</td>
                <td>${escapeHtml(action)}</td>
                <td>${escapeHtml(time)}</td>
            </tr>
        `;
    }).join('');
}

function renderMonitoringAlerts(containers) {
    const alerts = document.getElementById('monitoring-alerts');
    if (!alerts) return;

    const running = (Array.isArray(containers) ? containers : []).filter(c => String(c.status || '').toLowerCase() === 'running');
    const longRunning = running.filter(c => {
        if (!c.startedAt) return false;
        const ms = Date.now() - new Date(c.startedAt).getTime();
        return ms > 2 * 60 * 60 * 1000; // 2 hours
    });

    const out = [];
    if (longRunning.length > 0) {
        out.push(`<li><strong>${longRunning.length}</strong> container(s) running more than 2 hours.</li>`);
    }
    if (running.length > 20) {
        out.push(`<li><strong>High load:</strong> ${running.length} containers currently running.</li>`);
    }

    if (out.length === 0) {
        alerts.innerHTML = '<li>No alerts</li>';
        return;
    }
    alerts.innerHTML = out.join('');
}

function renderLabUsageSummary(containers) {
    const el = document.getElementById('lab-usage-summary');
    if (!el) return;

    const items = Array.isArray(containers) ? containers : [];
    const map = new Map();
    items.forEach(c => {
        const labId = (c.labId && (c.labId._id || c.labId.id)) ? String(c.labId._id || c.labId.id) : String(c.labId || '');
        const name = (c.labId && c.labId.name) ? c.labId.name : 'Lab';
        const key = labId || name;
        const status = String(c.status || '').toLowerCase();
        if (!map.has(key)) map.set(key, { name, total: 0, running: 0, paused: 0, stopped: 0 });
        const row = map.get(key);
        row.total += 1;
        if (status === 'running') row.running += 1;
        else if (status === 'paused') row.paused += 1;
        else row.stopped += 1;
    });

    const rows = Array.from(map.values()).sort((a, b) => b.running - a.running);
    if (rows.length === 0) {
        el.innerHTML = '<div style="color:#666;">No usage data</div>';
        return;
    }

    el.innerHTML = `
        <div style="display:grid; gap: 8px;">
            ${rows.map(r => `
                <div style="display:flex; justify-content: space-between; gap: 10px; padding: 8px 10px; border: 1px solid #eee; border-radius: 8px; background: #fff;">
                    <div style="font-weight: 600;">${escapeHtml(r.name)}</div>
                    <div style="color:#666; font-size: 13px;">Running: ${r.running} | Paused: ${r.paused} | Total: ${r.total}</div>
                </div>
            `).join('')}
        </div>
    `;
}

let __monitoringCharts = { usage: null, status: null };
function renderMonitoringCharts(containers) {
    if (typeof Chart === 'undefined') return;

    const usageEl = document.getElementById('containerUsageChart');
    const statusEl = document.getElementById('resourceUtilizationChart');
    if (!usageEl || !statusEl) return;

    const items = Array.isArray(containers) ? containers : [];

    // Usage over last 7 days (containers started per day)
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        days.push(d);
    }
    const labels = days.map(d => `${d.getMonth() + 1}/${d.getDate()}`);
    const counts = days.map(d => {
        const next = new Date(d);
        next.setDate(next.getDate() + 1);
        return items.filter(c => {
            if (!c.startedAt) return false;
            const t = new Date(c.startedAt);
            return t >= d && t < next;
        }).length;
    });

    // Status distribution
    const statusCounts = { running: 0, paused: 0, stopped: 0, exited: 0, unknown: 0 };
    items.forEach(c => {
        const s = String(c.status || 'unknown').toLowerCase();
        if (statusCounts[s] === undefined) statusCounts.unknown += 1;
        else statusCounts[s] += 1;
    });

    if (__monitoringCharts.usage) __monitoringCharts.usage.destroy();
    if (__monitoringCharts.status) __monitoringCharts.status.destroy();

    __monitoringCharts.usage = new Chart(usageEl, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Containers Started',
                data: counts,
                backgroundColor: '#2196F3'
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
        }
    });

    __monitoringCharts.status = new Chart(statusEl, {
        type: 'doughnut',
        data: {
            labels: Object.keys(statusCounts),
            datasets: [{
                data: Object.values(statusCounts),
                backgroundColor: ['#2e7d32', '#8d6e63', '#455a64', '#607d8b', '#9e9e9e']
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

// ==================== MODALS ====================

function showAddUserModal() {
    console.log('showAddUserModal called');
    
    // Remove any existing modal first
    const existingModal = document.getElementById('addUserModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Create modal HTML with better styling
    const modalHTML = `
        <div id="addUserModal" class="modal" style="display: block;">
            <div class="modal-content" style="max-width: 500px;">
                <span class="close-modal">&times;</span>
                <h2 style="margin-bottom: 20px; color: #333;">
                    <i class='bx bx-user-plus' style="margin-right: 10px;"></i>Create Student Account
                </h2>
                <form id="addUserForm">
                    <div class="form-group">
                        <label>Username *</label>
                        <input type="text" name="username" required placeholder="Enter username" autocomplete="off">
                    </div>
                    <div class="form-group">
                        <label>Email *</label>
                        <input type="email" name="email" required placeholder="student@example.com" autocomplete="off">
                    </div>
                    <div class="form-group">
                        <label>Password *</label>
                        <input type="password" name="password" required minlength="4" placeholder="Minimum 4 characters" autocomplete="new-password">
                        <small style="color: #666; font-size: 12px;">Password must be at least 4 characters long</small>
                    </div>
                    <div class="form-group">
                        <label>Role *</label>
                        <select name="role" required>
                            <option value="student" selected>Student</option>
                            <option value="faculty">Faculty</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>First Name</label>
                        <input type="text" name="firstName" placeholder="Optional">
                    </div>
                    <div class="form-group">
                        <label>Last Name</label>
                        <input type="text" name="lastName" placeholder="Optional">
                    </div>
                    <div class="form-group">
                        <label>Student ID</label>
                        <input type="text" name="studentId" placeholder="Optional">
                    </div>
                    <div class="form-group">
                        <label>Batch</label>
                        <input type="text" name="batch" placeholder="e.g., 2024">
                    </div>
                    <div class="form-group">
                        <label>Section</label>
                        <input type="text" name="section" placeholder="e.g., A, B, C">
                    </div>
                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button type="submit" class="btn btn-primary" style="flex: 1;">
                            <i class='bx bx-check'></i> Create Account
                        </button>
                        <button type="button" class="btn btn-outline" style="flex: 1;" onclick="document.getElementById('addUserModal').remove();">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    setupModalClose('#addUserModal');
    
    const form = document.getElementById('addUserForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            
            // Build user data object
            const userData = {
                username: formData.get('username'),
                email: formData.get('email'),
                password: formData.get('password'),
                role: formData.get('role') || 'student',
                batch: formData.get('batch') || undefined,
                section: formData.get('section') || undefined
            };

            // Add profile data if provided
            const firstName = formData.get('firstName');
            const lastName = formData.get('lastName');
            const studentId = formData.get('studentId');
            
            if (firstName || lastName || studentId) {
                userData.profile = {};
                if (firstName) userData.profile.firstName = firstName;
                if (lastName) userData.profile.lastName = lastName;
                if (studentId) userData.profile.studentId = studentId;
            }
            
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Creating...';
            
            try {
                const response = await window.api.createUser(userData);
                if (response.success) {
                    showNotification('Student account created successfully!', 'success');
                    document.getElementById('addUserModal').remove();
                    await loadUsers();
                }
            } catch (error) {
                showNotification('Error creating account: ' + error.message, 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }
}

function showBulkUploadModal() {
    console.log('showBulkUploadModal called');
    
    // Remove any existing modal first
    const existingModal = document.getElementById('bulkUploadModal');
    if (existingModal) {
        existingModal.remove();
    }

    const modalHTML = `
        <div id="bulkUploadModal" class="modal" style="display: block;">
            <div class="modal-content" style="max-width: 600px;">
                <span class="close-modal">&times;</span>
                <h2 style="margin-bottom: 20px; color: #333;">
                    <i class='bx bx-upload' style="margin-right: 10px;"></i>Bulk Upload Students (CSV)
                </h2>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                    <h4 style="margin-bottom: 10px; color: #333;">CSV Format Requirements:</h4>
                    <p style="margin: 5px 0; font-size: 14px; color: #666;">
                        <strong>Required columns:</strong> username, email, password
                    </p>
                    <p style="margin: 5px 0; font-size: 14px; color: #666;">
                        <strong>Optional columns:</strong> role, batch, section, firstName, lastName, studentId
                    </p>
                    <p style="margin: 5px 0; font-size: 12px; color: #999;">
                        Default role will be "student" if not specified. Default password will be "default123" if not provided.
                    </p>
                </div>
                <form id="bulkUploadForm">
                    <div class="form-group">
                        <label>Select CSV File *</label>
                        <input type="file" id="csvFileInput" accept=".csv" required style="padding: 10px; border: 2px dashed #ddd; border-radius: 5px; width: 100%; cursor: pointer;">
                        <small style="color: #666; font-size: 12px; display: block; margin-top: 5px;">
                            Only CSV files are allowed
                        </small>
                    </div>
                    <div id="uploadProgress" style="display: none; margin: 15px 0;">
                        <div style="background: #e0e0e0; border-radius: 10px; height: 20px; overflow: hidden;">
                            <div id="progressBar" style="background: #ff4800; height: 100%; width: 0%; transition: width 0.3s;"></div>
                        </div>
                        <p id="progressText" style="text-align: center; margin-top: 5px; font-size: 14px; color: #666;">Uploading...</p>
                    </div>
                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button type="submit" class="btn btn-primary" style="flex: 1;">
                            <i class='bx bx-upload'></i> Upload CSV
                        </button>
                        <button type="button" class="btn btn-outline" style="flex: 1;" onclick="document.getElementById('bulkUploadModal').remove();">
                            Cancel
                        </button>
                    </div>
                </form>
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
                    <h4 style="margin-bottom: 10px; color: #333; font-size: 14px;">Example CSV:</h4>
                    <pre style="background: #f5f5f5; padding: 10px; border-radius: 5px; font-size: 12px; overflow-x: auto;">
username,email,password,role,batch,section,firstName,lastName,studentId
john.doe,john@example.com,pass123,student,2024,A,John,Doe,STU001
jane.smith,jane@example.com,pass123,student,2024,B,Jane,Smith,STU002</pre>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    setupModalClose('#bulkUploadModal');
    
    const form = document.getElementById('bulkUploadForm');
    const fileInput = document.getElementById('csvFileInput');
    
    if (form && fileInput) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const file = fileInput.files[0];
            if (!file) {
                showNotification('Please select a CSV file', 'error');
                return;
            }

            // Check file extension
            if (!file.name.endsWith('.csv')) {
                showNotification('Please select a valid CSV file', 'error');
                return;
            }

            const submitBtn = form.querySelector('button[type="submit"]');
            const progressDiv = document.getElementById('uploadProgress');
            const progressBar = document.getElementById('progressBar');
            const progressText = document.getElementById('progressText');
            
            submitBtn.disabled = true;
            progressDiv.style.display = 'block';
            progressBar.style.width = '30%';
            progressText.textContent = 'Reading file...';
            
            try {
                progressBar.style.width = '60%';
                progressText.textContent = 'Uploading to server...';
                
                const response = await window.api.bulkUploadUsers(file);
                
                progressBar.style.width = '100%';
                progressText.textContent = 'Processing...';
                
                if (response.success) {
                    showNotification(`Successfully uploaded ${response.count || response.data?.length || 0} user(s)!`, 'success');
                    setTimeout(() => {
                        document.getElementById('bulkUploadModal').remove();
                        loadUsers();
                    }, 1000);
                } else {
                    throw new Error(response.message || 'Upload failed');
                }
            } catch (error) {
                progressDiv.style.display = 'none';
                submitBtn.disabled = false;
                showNotification('Error uploading CSV: ' + error.message, 'error');
            }
        });

        // Show file name when selected
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const fileName = file.name;
                fileInput.style.borderColor = '#27ae60';
                fileInput.style.backgroundColor = '#f0f9f4';
            }
        });
    }
}

function showCreateLabModal() {
    const modalHTML = `
        <div id="createLabModal" class="modal" style="display: block;">
            <div class="modal-content" style="max-width: 600px;">
                <span class="close-modal">&times;</span>
                <h2>Create Lab Template</h2>
                <form id="createLabForm">
                    <div class="form-group">
                        <label>Lab Name *</label>
                        <input type="text" name="name" required>
                    </div>
                    <div class="form-group">
                        <label>Description *</label>
                        <textarea name="description" required></textarea>
                    </div>
                    <div class="form-group">
                        <label>Docker Image *</label>
                        <input type="text" name="dockerImage" placeholder="e.g., python:3.9" required>
                    </div>
                    <div class="form-group">
                        <label>Category</label>
                        <select name="category">
                            <option value="programming">Programming</option>
                            <option value="database">Database</option>
                            <option value="machine-learning">Machine Learning</option>
                            <option value="web-development">Web Development</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Difficulty</label>
                        <select name="difficulty">
                            <option value="easy">Easy</option>
                            <option value="medium" selected>Medium</option>
                            <option value="hard">Hard</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>CPU Cores</label>
                        <input type="number" name="cpu" value="1" min="1">
                    </div>
                    <div class="form-group">
                        <label>Memory</label>
                        <input type="text" name="memory" value="512MB" placeholder="e.g., 512MB">
                    </div>
                    <div class="form-group">
                        <label>Storage</label>
                        <input type="text" name="storage" value="2GB" placeholder="e.g., 2GB">
                    </div>
                    <button type="submit" class="btn btn-primary">Create Lab</button>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    setupModalClose('#createLabModal');
    
    document.getElementById('createLabForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const labData = {
            name: formData.get('name'),
            description: formData.get('description'),
            category: formData.get('category'),
            difficulty: formData.get('difficulty'),
            template: {
                dockerImage: formData.get('dockerImage'),
                resources: {
                    cpu: parseInt(formData.get('cpu')),
                    memory: formData.get('memory'),
                    storage: formData.get('storage')
                }
            }
        };
        
        try {
            const response = await window.api.createLab(labData);
            if (response.success) {
                showNotification('Lab created successfully', 'success');
                document.getElementById('createLabModal').remove();
                await loadLabs();
            }
        } catch (error) {
            showNotification('Error creating lab: ' + error.message, 'error');
        }
    });
}

function showCreateTaskModal() {
    // First, load labs for the dropdown
    window.api.getLabs().then(labsResponse => {
        const labs = labsResponse.success ? labsResponse.data : [];
        
        const modalHTML = `
            <div id="createTaskModal" class="modal" style="display: block;">
                <div class="modal-content" style="max-width: 600px;">
                    <span class="close-modal">&times;</span>
                    <h2>Create Task</h2>
                    <form id="createTaskForm">
                        <div class="form-group">
                            <label>Task Title *</label>
                            <input type="text" name="title" required>
                        </div>
                        <div class="form-group">
                            <label>Description *</label>
                            <textarea name="description" required></textarea>
                        </div>
                        <div class="form-group">
                            <label>Lab Template</label>
                            <select name="labId">
                                <option value="">None</option>
                                ${labs.map(lab => `<option value="${lab._id || lab.id}">${lab.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Difficulty</label>
                            <select name="difficulty">
                                <option value="easy">Easy</option>
                                <option value="medium" selected>Medium</option>
                                <option value="hard">Hard</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Deadline *</label>
                            <input type="datetime-local" name="deadline" required>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="isImportant"> Mark as Important
                            </label>
                        </div>
                        <div class="form-group">
                            <label>Assign To</label>
                            <div style="margin-top: 10px;">
                                <label style="display: block; margin-bottom: 5px;">
                                    <input type="checkbox" name="assignToAll" id="assignToAll"> All Students
                                </label>
                                <div id="assignmentOptions" style="margin-left: 20px;">
                                    <input type="text" name="batch" placeholder="Batch (e.g., 2024)" style="margin-bottom: 5px;">
                                    <input type="text" name="section" placeholder="Section (e.g., A)">
                                </div>
                            </div>
                        </div>
                        <button type="submit" class="btn btn-primary">Create Task</button>
                    </form>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        setupModalClose('#createTaskModal');
        
        // Handle assignToAll checkbox
        const assignToAllCheckbox = document.getElementById('assignToAll');
        const assignmentOptions = document.getElementById('assignmentOptions');
        assignToAllCheckbox.addEventListener('change', (e) => {
            assignmentOptions.style.display = e.target.checked ? 'none' : 'block';
        });
        
        document.getElementById('createTaskForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            
            const taskData = {
                title: formData.get('title'),
                description: formData.get('description'),
                difficulty: formData.get('difficulty'),
                deadline: formData.get('deadline'),
                isImportant: formData.get('isImportant') === 'on',
                assignedTo: []
            };
            
            if (formData.get('labId')) {
                taskData.labId = formData.get('labId');
            }
            
            // Handle assignment
            if (formData.get('assignToAll') === 'on') {
                taskData.assignedTo.push({ assignToAll: true });
            } else {
                const batch = formData.get('batch');
                const section = formData.get('section');
                if (batch || section) {
                    taskData.assignedTo.push({
                        batch: batch || undefined,
                        section: section || undefined
                    });
                }
            }
            
            try {
                const response = await window.api.createTask(taskData);
                if (response.success) {
                    showNotification('Task created successfully', 'success');
                    document.getElementById('createTaskModal').remove();
                    await loadTasks();
                }
            } catch (error) {
                showNotification('Error creating task: ' + error.message, 'error');
            }
        });
    }).catch(error => {
        showNotification('Error loading labs: ' + error.message, 'error');
    });
}

// ==================== UTILITY FUNCTIONS ====================

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const contentSections = document.querySelectorAll('.content-section');

    function showSection(sectionId) {
        const targetId = (sectionId || '').replace(/^#/, '');
        if (!targetId) return;

        navItems.forEach(nav => {
            const href = (nav.getAttribute('href') || '').replace(/^#/, '');
            nav.classList.toggle('active', href === targetId);
        });
        contentSections.forEach(section => {
            section.classList.toggle('active', section.id === targetId);
        });

        const targetSection = document.getElementById(targetId);
        const pageTitle = document.getElementById('pageTitle');
        const activeNav = document.querySelector('.nav-item.active');
        if (targetSection && pageTitle && activeNav) {
            const span = activeNav.querySelector('span');
            if (span) pageTitle.textContent = span.textContent;
        }
    }

    navItems.forEach(item => {
        item.addEventListener('click', async (e) => {
            e.preventDefault();
            const href = item.getAttribute('href') || '';
            const targetId = href.replace(/^#/, '');
            if (!targetId) return;

            showSection(targetId);
            if (history.replaceState) {
                history.replaceState(null, '', '#' + targetId);
            }

            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                await loadSectionData(targetId);
            }
        });
    });

    // Sync section with URL hash on load and when hash changes
    function syncSectionWithHash() {
        const hash = (window.location.hash || '#user-management').replace(/^#/, '');
        const section = document.getElementById(hash);
        if (section && section.classList.contains('content-section')) {
            showSection(hash);
            loadSectionData(hash);
        }
    }
    window.addEventListener('hashchange', syncSectionWithHash);
    syncSectionWithHash();
}

function setupEventListeners() {
    // Tab switching for User Management (Students / Faculty)
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetTab = btn.getAttribute('data-tab');
            if (!targetTab) return;

            tabBtns.forEach(t => t.classList.remove('active'));
            tabContents.forEach(t => t.classList.remove('active'));

            btn.classList.add('active');
            const tabPanel = document.getElementById(targetTab + '-tab');
            if (tabPanel) {
                tabPanel.classList.add('active');
            }

            if (targetTab === 'students') {
                loadUsers({ role: 'student' });
            } else if (targetTab === 'faculty') {
                loadUsers({ role: 'faculty' });
            }
        });
    });

    // ------- Student filters (Batch / Section / Status) -------
    const batchFilter = document.getElementById('batchFilter');
    const sectionFilter = document.getElementById('sectionFilter');
    const statusFilter = document.getElementById('statusFilter');

    [batchFilter, sectionFilter, statusFilter].forEach(sel => {
        if (sel) {
            sel.addEventListener('change', () => {
                applyStudentFilters();
            });
        }
    });

    // Add Student button
    const addStudentBtn = document.getElementById('addStudentBtn');
    if (addStudentBtn) {
        const newAddBtn = addStudentBtn.cloneNode(true);
        addStudentBtn.parentNode.replaceChild(newAddBtn, addStudentBtn);
        newAddBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showAddUserModal();
        });
    }

    // Bulk Upload button
    const bulkUploadBtn = document.getElementById('bulkUploadBtn');
    if (bulkUploadBtn) {
        const newBulkBtn = bulkUploadBtn.cloneNode(true);
        bulkUploadBtn.parentNode.replaceChild(newBulkBtn, bulkUploadBtn);
        newBulkBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showBulkUploadModal();
        });
    }

    // Delete Selected button
    const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
    if (deleteSelectedBtn) {
        const newDeleteBtn = deleteSelectedBtn.cloneNode(true);
        deleteSelectedBtn.parentNode.replaceChild(newDeleteBtn, deleteSelectedBtn);
        newDeleteBtn.disabled = true;
        newDeleteBtn.addEventListener('click', handleDeleteSelectedUsers);
    }

    // Create Lab Template button
    const createLabTemplateBtn = document.getElementById('createLabTemplateBtn');
    if (createLabTemplateBtn) {
        createLabTemplateBtn.addEventListener('click', showCreateLabModal);
    }

    // Create Task button
    const createTaskBtn = document.getElementById('createTaskBtn');
    if (createTaskBtn) {
        createTaskBtn.addEventListener('click', showCreateTaskModal);
    }

    // Logout
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sessionStorage.clear();
            localStorage.clear();
            window.location.href = 'login.html';
        });
    }

    // Search functionality
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = String(e.target.value || '').trim().toLowerCase();
            applyAdminSearch(query);
        });
    }
}

function applyAdminSearch(query) {
    const activeSection = document.querySelector('.content-section.active');
    const sectionId = activeSection ? activeSection.id : '';

    // Empty query = reset
    if (!query) {
        // reset tables
        document.querySelectorAll('#students-tab tbody tr, #faculty-tab tbody tr').forEach(tr => {
            tr.style.display = '';
        });
        // reset cards
        document.querySelectorAll('.template-card, .task-card-admin, .container-item').forEach(el => {
            el.style.display = '';
        });
        return;
    }

    const matchesText = (el) => {
        const txt = (el && (el.textContent || '')) ? el.textContent.toLowerCase() : '';
        return txt.includes(query);
    };

    if (sectionId === 'user-management') {
        const activeTabBtn = document.querySelector('.tab-btn.active');
        const tab = activeTabBtn ? activeTabBtn.getAttribute('data-tab') : 'students';
        const selector = tab === 'faculty' ? '#faculty-tab tbody tr' : '#students-tab tbody tr';
        document.querySelectorAll(selector).forEach(tr => {
            tr.style.display = matchesText(tr) ? '' : 'none';
        });
        return;
    }

    if (sectionId === 'lab-environments') {
        document.querySelectorAll('.template-card').forEach(card => {
            card.style.display = matchesText(card) ? '' : 'none';
        });
        document.querySelectorAll('.container-item').forEach(item => {
            item.style.display = matchesText(item) ? '' : 'none';
        });
        return;
    }

    if (sectionId === 'task-management') {
        document.querySelectorAll('.task-card-admin').forEach(card => {
            card.style.display = matchesText(card) ? '' : 'none';
        });
        return;
    }

    if (sectionId === 'monitoring') {
        document.querySelectorAll('.container-item').forEach(item => {
            item.style.display = matchesText(item) ? '' : 'none';
        });
        return;
    }
}

function setupModalClose(modalSelector) {
    const modal = document.querySelector(modalSelector);
    if (!modal) return;
    
    const closeBtn = modal.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.remove();
        });
    }
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function showLoading(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.style.opacity = '0.6';
        section.style.pointerEvents = 'none';
    }
}

function hideLoading(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.style.opacity = '1';
        section.style.pointerEvents = 'auto';
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db'};
        color: white;
        border-radius: 5px;
        z-index: 10000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return seconds + ' seconds ago';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + ' minute' + (minutes !== 1 ? 's' : '') + ' ago';
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + ' hour' + (hours !== 1 ? 's' : '') + ' ago';
    const days = Math.floor(hours / 24);
    return days + ' day' + (days !== 1 ? 's' : '') + ' ago';
}

// Placeholder functions for modals that need more implementation
function showEditUserModal(user) {
    // Remove any existing modal first
    const existingModal = document.getElementById('editUserModal');
    if (existingModal) existingModal.remove();

    const userId = user._id || user.id;
    const role = user.role || 'student';
    const status = user.status || 'active';

    const modalHTML = `
        <div id="editUserModal" class="modal" style="display: block;">
            <div class="modal-content" style="max-width: 520px;">
                <span class="close-modal">&times;</span>
                <h2 style="margin-bottom: 20px; color: #333;">
                    <i class='bx bx-edit' style="margin-right: 10px;"></i>Edit User
                </h2>
                <form id="editUserForm">
                    <div class="form-group">
                        <label>Username *</label>
                        <input type="text" name="username" required value="${user.username || ''}" autocomplete="off">
                    </div>
                    <div class="form-group">
                        <label>Email *</label>
                        <input type="email" name="email" required value="${user.email || ''}" autocomplete="off">
                    </div>
                    <div class="form-group">
                        <label>Role *</label>
                        <select name="role" required>
                            <option value="student" ${role === 'student' ? 'selected' : ''}>Student</option>
                            <option value="faculty" ${role === 'faculty' ? 'selected' : ''}>Faculty</option>
                            <option value="admin" ${role === 'admin' ? 'selected' : ''}>Admin</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Status *</label>
                        <select name="status" required>
                            <option value="active" ${status === 'active' ? 'selected' : ''}>Active</option>
                            <option value="inactive" ${status === 'inactive' ? 'selected' : ''}>Inactive</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Batch</label>
                        <input type="text" name="batch" value="${user.batch || ''}" placeholder="e.g., 2024">
                    </div>
                    <div class="form-group">
                        <label>Section</label>
                        <input type="text" name="section" value="${user.section || ''}" placeholder="e.g., A">
                    </div>
                    <div style="display:flex; gap:10px; margin-top: 20px;">
                        <button type="submit" class="btn btn-primary" style="flex: 1;">Save Changes</button>
                        <button type="button" class="btn btn-outline" style="flex: 1;" id="cancelEditUser">Cancel</button>
                    </div>
                    <div style="margin-top: 12px; display:flex; justify-content:flex-end;">
                        <button type="button" class="btn btn-outline" id="deleteUserBtn" style="color:#e74c3c; border-color:#e74c3c;">Delete User</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    setupModalClose('#editUserModal');

    const form = document.getElementById('editUserForm');
    const cancelBtn = document.getElementById('cancelEditUser');
    const deleteBtn = document.getElementById('deleteUserBtn');

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            document.getElementById('editUserModal')?.remove();
        });
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
            try {
                const resp = await window.api.deleteUser(userId);
                if (resp && resp.success) {
                    showNotification('User deleted successfully', 'success');
                    document.getElementById('editUserModal')?.remove();
                    // Refresh current tab
                    const activeTabBtn = document.querySelector('.tab-btn.active');
                    const tab = activeTabBtn ? activeTabBtn.getAttribute('data-tab') : 'students';
                    if (tab === 'faculty') await loadUsers({ role: 'faculty' });
                    else await loadUsers({ role: 'student' });
                } else {
                    showNotification('Failed to delete user', 'error');
                }
            } catch (err) {
                showNotification('Error deleting user: ' + err.message, 'error');
            }
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(form);
            const payload = {
                username: String(fd.get('username') || '').trim(),
                email: String(fd.get('email') || '').trim(),
                role: fd.get('role') || 'student',
                status: fd.get('status') || 'active',
                batch: (fd.get('batch') || '').trim() || undefined,
                section: (fd.get('section') || '').trim() || undefined
            };

            try {
                const resp = await window.api.updateUser(userId, payload);
                if (resp && resp.success) {
                    showNotification('User updated successfully', 'success');
                    document.getElementById('editUserModal')?.remove();

                    // Refresh current tab
                    const activeTabBtn = document.querySelector('.tab-btn.active');
                    const tab = activeTabBtn ? activeTabBtn.getAttribute('data-tab') : 'students';
                    if (tab === 'faculty') await loadUsers({ role: 'faculty' });
                    else await loadUsers({ role: 'student' });
                } else {
                    showNotification('Failed to update user', 'error');
                }
            } catch (err) {
                showNotification('Error updating user: ' + err.message, 'error');
            }
        });
    }
}

function showEditLabModal(lab) {
    showNotification('Edit lab functionality - to be fully implemented', 'info');
}

function showEditTaskModal(task) {
    // Remove any existing modal first
    const existing = document.getElementById('editTaskModal');
    if (existing) existing.remove();

    const taskId = task._id || task.id;
    const modalHTML = `
        <div id="editTaskModal" class="modal" style="display: block;">
            <div class="modal-content" style="max-width: 900px;">
                <span class="close-modal">&times;</span>
                <h2>Edit Task</h2>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px;">
                    <div style="grid-column: 1 / -1;">
                        <label style="display:block; font-weight: 600; margin-bottom: 6px;">Title</label>
                        <input id="editTaskTitle" type="text" value="${escapeHtml(task.title || '')}" style="width:100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;" />
                    </div>

                    <div style="grid-column: 1 / -1;">
                        <label style="display:block; font-weight: 600; margin-bottom: 6px;">Description</label>
                        <textarea id="editTaskDescription" rows="5" style="width:100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">${escapeHtml(task.description || '')}</textarea>
                    </div>

                    <div>
                        <label style="display:block; font-weight: 600; margin-bottom: 6px;">Difficulty</label>
                        <select id="editTaskDifficulty" style="width:100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                            <option value="easy" ${task.difficulty === 'easy' ? 'selected' : ''}>Easy</option>
                            <option value="medium" ${(!task.difficulty || task.difficulty === 'medium') ? 'selected' : ''}>Medium</option>
                            <option value="hard" ${task.difficulty === 'hard' ? 'selected' : ''}>Hard</option>
                        </select>
                    </div>

                    <div>
                        <label style="display:block; font-weight: 600; margin-bottom: 6px;">Deadline</label>
                        <input id="editTaskDeadline" type="date" value="${task.deadline ? new Date(task.deadline).toISOString().slice(0, 10) : ''}" style="width:100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;" />
                    </div>

                    <div>
                        <label style="display:block; font-weight: 600; margin-bottom: 6px;">Status</label>
                        <select id="editTaskStatus" style="width:100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                            <option value="active" ${task.status === 'active' ? 'selected' : ''}>Active</option>
                            <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Completed</option>
                            <option value="closed" ${task.status === 'closed' ? 'selected' : ''}>Closed</option>
                        </select>
                    </div>

                    <div style="display:flex; align-items:center; gap: 10px;">
                        <input id="editTaskImportant" type="checkbox" ${task.isImportant ? 'checked' : ''} />
                        <label for="editTaskImportant" style="margin:0; font-weight: 600;">Mark as important</label>
                    </div>
                </div>

                <div style="display:flex; justify-content:flex-end; gap: 10px; margin-top: 16px;">
                    <button class="btn btn-outline" id="editTaskCancelBtn">Cancel</button>
                    <button class="btn btn-primary" id="editTaskSaveBtn">Save Changes</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    setupModalClose('#editTaskModal');

    const modal = document.getElementById('editTaskModal');
    const cancelBtn = document.getElementById('editTaskCancelBtn');
    const saveBtn = document.getElementById('editTaskSaveBtn');

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            if (modal) modal.remove();
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            try {
                saveBtn.disabled = true;
                const original = saveBtn.textContent;
                saveBtn.textContent = 'Saving...';

                const payload = {
                    title: document.getElementById('editTaskTitle').value.trim(),
                    description: document.getElementById('editTaskDescription').value.trim(),
                    difficulty: document.getElementById('editTaskDifficulty').value,
                    deadline: document.getElementById('editTaskDeadline').value,
                    status: document.getElementById('editTaskStatus').value,
                    isImportant: document.getElementById('editTaskImportant').checked
                };

                if (!payload.title) throw new Error('Title is required');
                if (!payload.description) throw new Error('Description is required');
                if (!payload.deadline) throw new Error('Deadline is required');

                const response = await window.api.updateTask(taskId, payload);
                if (response && response.success) {
                    showNotification('Task updated successfully', 'success');
                    if (modal) modal.remove();
                    await loadTasks();
                } else {
                    throw new Error(response.message || 'Failed to update task');
                }

                saveBtn.textContent = original;
                saveBtn.disabled = false;
            } catch (err) {
                showNotification('Error updating task: ' + err.message, 'error');
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Changes';
            }
        });
    }
}

function showLogsModal(logs) {
    const modalHTML = `
        <div id="logsModal" class="modal" style="display: block;">
            <div class="modal-content" style="max-width: 800px;">
                <span class="close-modal">&times;</span>
                <h2>Container Logs</h2>
                <pre style="background: #1e1e1e; color: #d4d4d4; padding: 1rem; border-radius: 5px; max-height: 500px; overflow-y: auto; font-family: monospace; white-space: pre-wrap;">${logs}</pre>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    setupModalClose('#logsModal');
}

function showSubmissionsModal(submissions) {
    const modalHTML = `
        <div id="submissionsModal" class="modal" style="display: block;">
            <div class="modal-content" style="max-width: 800px;">
                <span class="close-modal">&times;</span>
                <h2>Task Submissions</h2>
                <div style="max-height: 500px; overflow-y: auto;">
                    ${submissions.length === 0 ? '<p>No submissions yet</p>' : 
                        submissions.map(sub => `
                            <div style="border-bottom: 1px solid #eee; padding: 1rem;">
                                <strong>${sub.userId?.username || 'Unknown'}</strong>
                                <p>Submitted: ${new Date(sub.submittedAt).toLocaleString()}</p>
                                <p>Status: ${sub.status}</p>
                            </div>
                        `).join('')
                    }
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    setupModalClose('#submissionsModal');
}

function showAssignedTaskSubmissionsModal(items) {
    // Keep the data around so Evaluate actions can access full record without extra API calls.
    window.__lastAssignedTaskSubmissions = Array.isArray(items) ? items : [];

    const modalHTML = `
        <div id="submissionsModal" class="modal" style="display: block;">
            <div class="modal-content" style="max-width: 950px;">
                <span class="close-modal">&times;</span>
                <h2>Assigned Task Submissions</h2>
                <div style="max-height: 550px; overflow-y: auto;">
                    ${items.length === 0 ? '<p>No assigned-task submissions yet</p>' :
                        items.map(at => {
                            const student = at.studentId || {};
                            const task = at.taskId || {};
                            const submittedAt = at.submittedAt ? new Date(at.submittedAt).toLocaleString() : 'N/A';
                            const grade = (typeof at.grade === 'number') ? at.grade : null;
                            const decision = at.reviewDecision || '';
                            const feedback = at.feedback || '';
                            const code = (at.submission && at.submission.code) ? at.submission.code : '';
                            const output = (at.submission && at.submission.output) ? at.submission.output : '';
                            const isGraded = String(at.status || '').toLowerCase() === 'graded';

                            return `
                                <div class="at-submission-card" data-assigned-task-id="${at._id || ''}" style="border-bottom: 1px solid #eee; padding: 1rem;">
                                    <div style="display:flex; justify-content:space-between; gap: 12px; flex-wrap: wrap;">
                                        <div>
                                            <strong>${escapeHtml(student.username || 'Unknown Student')}</strong>
                                            <div style="color:#666; font-size: 13px;">${escapeHtml(student.email || '')} | Batch: ${escapeHtml(student.batch || '')}</div>
                                            <div style="margin-top: 6px;"><strong>Task:</strong> ${escapeHtml(task.title || 'Untitled Task')}</div>
                                            <div class="at-status-line">
                                                <strong>Status:</strong> <span class="at-status-text">${escapeHtml(at.status || '')}</span>
                                                <span class="at-grade-block" style="display: ${grade !== null ? 'inline' : 'none'};"> | <strong>Grade:</strong> <span class="at-grade-text">${grade !== null ? grade : ''}</span>/100</span>
                                                <span class="at-decision-block" style="display: ${decision ? 'inline' : 'none'};"> | <strong>Decision:</strong> <span class="at-decision-text">${escapeHtml(decision)}</span></span>
                                            </div>
                                            <div><strong>Submitted:</strong> ${submittedAt}</div>
                                            <div class="at-feedback-block" style="margin-top:6px; display: ${feedback ? 'block' : 'none'};"><strong>Remarks:</strong> <span class="at-feedback-text">${escapeHtml(feedback)}</span></div>
                                        </div>
                                        <div style="display:flex; gap: 8px; align-items: start;">
                                            ${at._id ? `<button class="btn btn-primary evaluate-assigned-task" data-assigned-task-id="${at._id}">${isGraded ? 'Update Evaluation' : 'Evaluate'}</button>` : ''}
                                        </div>
                                    </div>

                                    ${code ? `<pre style=\"background:#1e1e1e; color:#d4d4d4; padding: 1rem; border-radius: 6px; margin-top: 10px; white-space: pre-wrap;\">${escapeHtml(code)}</pre>` : ''}
                                    ${output ? `<pre style=\"background:#0f172a; color:#ffffff; padding: 1rem; border-radius: 6px; margin-top: 10px; white-space: pre-wrap;\">${escapeHtml(output)}</pre>` : ''}
                                </div>
                            `;
                        }).join('')
                    }
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    setupModalClose('#submissionsModal');

    // Wire Evaluate buttons
    document.querySelectorAll('#submissionsModal .evaluate-assigned-task').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const assignedTaskId = e.currentTarget.dataset.assignedTaskId;
            openAssignedTaskEvaluationModal(assignedTaskId);
        });
    });
}

function escapeHtml(unsafe) {
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function openAssignedTaskEvaluationModal(assignedTaskId) {
    const id = String(assignedTaskId || '');
    if (!id) return;

    const items = Array.isArray(window.__lastAssignedTaskSubmissions) ? window.__lastAssignedTaskSubmissions : [];
    const at = items.find(x => String(x && x._id) === id);
    if (!at) {
        showNotification('Submission not found for evaluation', 'error');
        return;
    }

    const existing = document.getElementById('evaluationModal');
    if (existing) existing.remove();

    const student = at.studentId || {};
    const task = at.taskId || {};
    const initialGrade = (typeof at.grade === 'number') ? at.grade : '';
    const initialFeedback = at.feedback || '';
    const initialDecision = at.reviewDecision || '';

    const modalHTML = `
        <div id="evaluationModal" class="modal" style="display: block;">
            <div class="modal-content" style="max-width: 700px;">
                <span class="close-modal">&times;</span>
                <h2>Evaluate Submission</h2>
                <div style="margin-top: 8px; color: #666;">
                    <div><strong>Student:</strong> ${escapeHtml(student.username || 'Unknown')}</div>
                    <div><strong>Task:</strong> ${escapeHtml(task.title || 'Untitled Task')}</div>
                </div>

                <form id="evaluationForm" style="margin-top: 16px; display: grid; gap: 12px;">
                    <div class="form-group">
                        <label for="evalGrade">Marks (0-100)</label>
                        <input id="evalGrade" name="grade" type="number" min="0" max="100" step="1" value="${escapeHtml(initialGrade)}" required>
                    </div>

                    <div class="form-group">
                        <label for="evalDecision">Decision</label>
                        <select id="evalDecision" name="decision">
                            <option value="" ${!initialDecision ? 'selected' : ''}>No decision</option>
                            <option value="approved" ${initialDecision === 'approved' ? 'selected' : ''}>Approved</option>
                            <option value="rejected" ${initialDecision === 'rejected' ? 'selected' : ''}>Rejected</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="evalFeedback">Remarks</label>
                        <textarea id="evalFeedback" name="feedback" rows="5" placeholder="Add feedback for the student...">${escapeHtml(initialFeedback)}</textarea>
                    </div>

                    <div style="display:flex; gap: 10px; justify-content: flex-end; margin-top: 6px;">
                        <button type="button" class="btn btn-outline" onclick="document.getElementById('evaluationModal').remove();">Cancel</button>
                        <button type="submit" class="btn btn-primary" id="evalSaveBtn">Save Evaluation</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    setupModalClose('#evaluationModal');

    const form = document.getElementById('evaluationForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const saveBtn = document.getElementById('evalSaveBtn');
        const original = saveBtn ? saveBtn.textContent : 'Save Evaluation';
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
        }

        try {
            const grade = Number(document.getElementById('evalGrade').value);
            const feedback = String(document.getElementById('evalFeedback').value || '');
            const decision = String(document.getElementById('evalDecision').value || '');

            if (!Number.isFinite(grade) || grade < 0 || grade > 100) {
                throw new Error('Grade must be a number between 0 and 100');
            }

            const resp = await window.api.gradeAssignedTask(id, grade, feedback, decision);
            if (!resp || !resp.success) {
                throw new Error(resp && resp.message ? resp.message : 'Failed to save evaluation');
            }

            // Update cached item + UI in the submissions modal (no need to refetch)
            at.status = 'graded';
            at.grade = grade;
            at.feedback = feedback;
            at.reviewDecision = decision || undefined;

            const card = document.querySelector(`#submissionsModal .at-submission-card[data-assigned-task-id="${CSS.escape(id)}"]`);
            if (card) {
                const statusEl = card.querySelector('.at-status-text');
                if (statusEl) statusEl.textContent = 'graded';

                const gradeBlock = card.querySelector('.at-grade-block');
                const gradeEl = card.querySelector('.at-grade-text');
                if (gradeEl) gradeEl.textContent = String(grade);
                if (gradeBlock) gradeBlock.style.display = 'inline';

                // Decision
                const decisionBlock = card.querySelector('.at-decision-block');
                const decisionEl = card.querySelector('.at-decision-text');
                if (decision) {
                    if (decisionEl) decisionEl.textContent = decision;
                    if (decisionBlock) decisionBlock.style.display = 'inline';
                } else {
                    if (decisionEl) decisionEl.textContent = '';
                    if (decisionBlock) decisionBlock.style.display = 'none';
                }

                // Feedback
                const feedbackBlock = card.querySelector('.at-feedback-block');
                const feedbackEl = card.querySelector('.at-feedback-text');
                if (feedback) {
                    if (feedbackEl) feedbackEl.textContent = feedback;
                    if (feedbackBlock) feedbackBlock.style.display = 'block';
                } else {
                    if (feedbackEl) feedbackEl.textContent = '';
                    if (feedbackBlock) feedbackBlock.style.display = 'none';
                }

                const evalBtn = card.querySelector('.evaluate-assigned-task');
                if (evalBtn) evalBtn.textContent = 'Update Evaluation';
            }

            showNotification('Evaluation saved', 'success');
            const modal = document.getElementById('evaluationModal');
            if (modal) modal.remove();
        } catch (err) {
            showNotification('Error saving evaluation: ' + err.message, 'error');
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = original;
            }
        }
    });
}
