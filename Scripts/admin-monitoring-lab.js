(function () {
    const SOCKET_URL = 'http://localhost:5000';
    const TEMPLATE_PRESETS = {
        python: {
            label: 'Python',
            name: 'Python Programming Lab',
            description: 'Python 3 environment for fundamentals, scripting, problem solving, and data structure exercises.',
            dockerImage: 'virtual-lab/python-dev:latest',
            category: 'programming',
            resources: {
                cpu: 1,
                memory: '512MB',
                storage: '5GB'
            }
        },
        javascript: {
            label: 'JavaScript',
            name: 'JavaScript Programming Lab',
            description: 'Node.js powered environment for core JavaScript practice, algorithms, and console applications.',
            dockerImage: 'virtual-lab/node-dev:latest',
            category: 'programming',
            resources: {
                cpu: 1,
                memory: '512MB',
                storage: '5GB'
            }
        },
        java: {
            label: 'Java',
            name: 'Java Programming Lab',
            description: 'Java 21 lab template for OOP, collections, and command-line programming assignments.',
            dockerImage: 'eclipse-temurin:21',
            category: 'programming',
            resources: {
                cpu: 1,
                memory: '1GB',
                storage: '5GB'
            }
        },
        c: {
            label: 'C',
            name: 'C Programming Lab',
            description: 'GCC-based environment for structured programming, arrays, pointers, and systems-oriented exercises.',
            dockerImage: 'gcc:13',
            category: 'programming',
            resources: {
                cpu: 1,
                memory: '512MB',
                storage: '4GB'
            }
        },
        cpp: {
            label: 'C++',
            name: 'C++ Programming Lab',
            description: 'G++ environment tuned for modern C++ practice, STL exercises, and algorithmic problem solving.',
            dockerImage: 'gcc:13',
            category: 'programming',
            resources: {
                cpu: 1,
                memory: '512MB',
                storage: '4GB'
            }
        },
        networking: {
            label: 'Networking',
            name: 'Network Fundamentals Lab',
            description: 'Ubuntu-based image with networking tools for packet capture, routing, and diagnostics exercises.',
            dockerImage: 'virtual-lab/network-minimal:latest',
            category: 'networking',
            resources: {
                cpu: 1,
                memory: '512MB',
                storage: '2GB'
            }
        }
    };
    const state = {
        snapshot: null,
        socket: null,
        activeTemplateFilter: null,
        charts: {
            containerUsage: null,
            resourceUtilization: null
        }
    };

    function getToken() {
        return sessionStorage.getItem('token') || localStorage.getItem('token') || '';
    }

    function notify(message, type = 'info') {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
            return;
        }

        console.log(`[${type}] ${message}`);
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function toNumber(value, fallback = 0) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    function formatCount(value) {
        return new Intl.NumberFormat('en-IN').format(toNumber(value));
    }

    function formatPercent(value) {
        const parsed = toNumber(value);
        return `${parsed.toFixed(parsed % 1 === 0 ? 0 : 1)}%`;
    }

    function formatBytes(value) {
        const bytes = toNumber(value);
        if (bytes <= 0) return '0 B';

        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let size = bytes;
        let index = 0;

        while (size >= 1024 && index < units.length - 1) {
            size /= 1024;
            index += 1;
        }

        return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
    }

    function formatDateTime(value) {
        if (!value) return '--';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '--';

        return date.toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function formatRelativeTime(value) {
        if (!value) return '--';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '--';

        const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
        if (seconds <= 5) return 'Just now';
        if (seconds < 60) return `${seconds}s ago`;

        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;

        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }

    function formatDuration(value) {
        if (!value) return '--';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '--';

        const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        if (minutes > 0) return `${minutes}m`;
        return `${seconds}s`;
    }

    function getStatus(container) {
        return String(container?.status || 'unknown').toLowerCase();
    }

    function getContainerLabId(container) {
        const value = container?.labId || container?.lab;
        if (!value) return '';
        if (typeof value === 'string') return value;
        return String(value._id || value.id || '');
    }

    function getContainerDockerImage(container) {
        return String(
            container?.dockerImage ||
            container?.lab?.template?.dockerImage ||
            container?.labId?.template?.dockerImage ||
            ''
        );
    }

    function shortContainerId(containerId) {
        return String(containerId || '--').slice(0, 12);
    }

    function setLiveIndicator(text, mode) {
        const indicator = document.getElementById('monitoringLiveIndicator');
        if (!indicator) return;

        indicator.textContent = text;
        indicator.classList.remove('is-loading', 'is-live', 'is-offline');
        if (mode) {
            indicator.classList.add(mode);
        }
    }

    function setLabFilterBadge() {
        const badge = document.getElementById('labFilterBadge');
        if (!badge) return;

        badge.textContent = state.activeTemplateFilter ? state.activeTemplateFilter.name : 'All Labs';
    }

    function getFilteredContainers(containers) {
        if (!state.activeTemplateFilter) {
            return containers;
        }

        return containers.filter((container) => {
            const dockerImage = getContainerDockerImage(container);
            const labId = getContainerLabId(container);

            return (
                dockerImage === state.activeTemplateFilter.filterValue ||
                state.activeTemplateFilter.relatedLabIds.includes(labId)
            );
        });
    }

    function renderEmptyRow(targetId, colspan, message) {
        const target = document.getElementById(targetId);
        if (!target) return;

        target.innerHTML = `
            <tr>
                <td colspan="${colspan}">
                    <div class="empty-state compact-empty">${escapeHtml(message)}</div>
                </td>
            </tr>
        `;
    }

    function updateSummaryCards(summary) {
        const map = [
            ['metricActiveContainers', formatCount(summary.activeContainers)],
            ['metricTotalUsers', formatCount(summary.totalUsers)],
            ['metricCpuUsage', formatPercent(summary.cpuUsage)],
            ['metricStorageUsage', formatPercent(summary.storageUsage)]
        ];

        map.forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });

        const cpuSubtext = document.getElementById('metricCpuUsageSubtext');
        if (cpuSubtext) cpuSubtext.textContent = `Memory ${formatPercent(summary.memoryUsage)}`;

        const storageSubtext = document.getElementById('metricStorageUsageSubtext');
        if (storageSubtext) {
            storageSubtext.textContent = `${formatBytes(summary.usedDiskBytes)} / ${formatBytes(summary.totalDiskBytes)}`;
        }

        const activeSubtext = document.getElementById('metricActiveContainersSubtext');
        if (activeSubtext) {
            activeSubtext.textContent = summary.dockerConnected ? 'Live Docker sessions' : 'Docker unavailable';
        }
    }

    function updateResourceStrip(summary) {
        const cpu = document.getElementById('resourceCpuValue');
        const memory = document.getElementById('resourceMemoryValue');
        const storage = document.getElementById('resourceStorageValue');
        const updated = document.getElementById('resourceLastUpdated');

        if (cpu) cpu.textContent = formatPercent(summary.cpuUsage);
        if (memory) {
            memory.textContent = formatPercent(summary.memoryUsage);
            memory.title = `${formatBytes(summary.usedMemoryBytes)} / ${formatBytes(summary.totalMemoryBytes)} used`;
        }
        if (storage) {
            storage.textContent = formatPercent(summary.storageUsage);
            storage.title = `${formatBytes(summary.usedDiskBytes)} / ${formatBytes(summary.totalDiskBytes)} used`;
        }
        if (updated) updated.textContent = formatDateTime(summary.lastUpdated);
    }

    function updateLabSummary(templates, containers) {
        const runningContainers = containers.filter((container) => getStatus(container) === 'running').length;
        const elements = [
            ['labTotalTemplates', formatCount(templates.length)],
            ['labRunningSessions', formatCount(runningContainers)],
            ['labTotalSessions', formatCount(containers.length)]
        ];

        elements.forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    }

    function renderAlerts(alerts) {
        const list = document.getElementById('monitoring-alerts');
        if (!list) return;

        if (!Array.isArray(alerts) || alerts.length === 0) {
            list.innerHTML = '<li class="alert-info">No alerts right now. The system is operating normally.</li>';
            return;
        }

        list.innerHTML = alerts.map((alert) => `
            <li class="alert-${escapeHtml(alert.level || 'info')}">
                <strong>${escapeHtml(alert.title || 'Alert')}</strong><br>
                <span>${escapeHtml(alert.message || '')}</span>
            </li>
        `).join('');
    }

    function renderRecentActivity(activity) {
        const tbody = document.getElementById('recentActivityTableBody');
        if (!tbody) return;

        if (!Array.isArray(activity) || activity.length === 0) {
            renderEmptyRow('recentActivityTableBody', 4, 'No recent student activity recorded yet.');
            return;
        }

        tbody.innerHTML = activity.map((entry) => `
            <tr>
                <td>${escapeHtml(entry.studentName || 'Unknown Student')}</td>
                <td>${escapeHtml(entry.labName || 'General Workspace')}</td>
                <td>${escapeHtml(entry.action || 'Activity')}</td>
                <td title="${escapeHtml(formatDateTime(entry.time))}">${escapeHtml(formatRelativeTime(entry.time))}</td>
            </tr>
        `).join('');
    }

    function renderUsageSummary(templates) {
        const container = document.getElementById('lab-usage-summary');
        if (!container) return;

        if (!Array.isArray(templates) || templates.length === 0) {
            container.innerHTML = '<div class="empty-state">No lab environment templates have been created yet.</div>';
            return;
        }

        container.innerHTML = `
            <div class="summary-stack">
                ${templates.map((template) => `
                    <div class="summary-item">
                        <div>
                            <strong>${escapeHtml(template.name)}</strong>
                            <span>${escapeHtml(template.dockerImage || 'Docker image not configured')}</span>
                        </div>
                        <div>${formatCount(template.activeContainers)} / ${formatCount(template.totalContainers)} running</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function renderTemplateCards(templates) {
        const grid = document.getElementById('labTemplatesGrid');
        if (!grid) return;

        if (!Array.isArray(templates) || templates.length === 0) {
            grid.innerHTML = `
                <div class="col-12">
                    <div class="empty-state">
                        No lab templates found. Use "Create Lab Template" to add Python, Java, Node, or other environments.
                    </div>
                </div>
            `;
            return;
        }

        grid.innerHTML = templates.map((template) => `
            <div class="col-md-6 col-xl-4">
                <article class="template-card" data-template-id="${escapeHtml(template.id)}">
                    <div class="template-kicker">${escapeHtml(template.category || 'lab environment')}</div>
                    <div class="template-header d-flex justify-content-between align-items-start gap-3 mb-3">
                        <div>
                            <h3 class="mb-1">${escapeHtml(template.name)}</h3>
                            <p class="template-description mb-0">${escapeHtml(template.description || 'No description added yet.')}</p>
                        </div>
                        <span class="status-badge-monitor ${template.isActive ? 'running' : 'stopped'}">
                            ${template.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                    <div class="resource-grid">
                        <div class="resource-metric"><span>CPU</span><strong>${escapeHtml(String(template.cpu || 1))}</strong></div>
                        <div class="resource-metric"><span>Memory</span><strong>${escapeHtml(template.memory || '512MB')}</strong></div>
                        <div class="resource-metric"><span>Storage</span><strong>${escapeHtml(template.storage || '5GB')}</strong></div>
                    </div>
                    <div class="template-footer">
                        <div>${escapeHtml(template.dockerImage || 'Docker image not configured')}</div>
                        <div>${formatCount(template.activeContainers)} active / ${formatCount(template.totalContainers)} total</div>
                    </div>
                    <div class="template-actions">
                        <button class="btn btn-outline-primary btn-sm" type="button" data-template-action="edit" data-template-id="${escapeHtml(template.id)}">Edit</button>
                        <button class="btn btn-outline-secondary btn-sm" type="button" data-template-action="view" data-template-id="${escapeHtml(template.id)}">View Containers</button>
                        <button class="btn btn-outline-danger btn-sm" type="button" data-template-action="delete" data-template-id="${escapeHtml(template.id)}">Delete</button>
                    </div>
                </article>
            </div>
        `).join('');
    }

    function buildContainerRow(container) {
        const status = getStatus(container);
        const isRunning = status === 'running';
        const isStopped = ['stopped', 'exited', 'created'].includes(status);

        return `
            <tr>
                <td><code>${escapeHtml(shortContainerId(container.containerId))}</code></td>
                <td>
                    <div class="fw-semibold">${escapeHtml(container.labName || 'Unassigned Lab')}</div>
                    <small class="text-muted">${escapeHtml(container.dockerImage || 'Docker image unavailable')}</small>
                </td>
                <td>${escapeHtml(container.studentName || 'Unknown Student')}</td>
                <td><span class="status-badge-monitor ${escapeHtml(status)}">${escapeHtml(status)}</span></td>
                <td title="${escapeHtml(formatDateTime(container.startedAt))}">${escapeHtml(isRunning ? formatDuration(container.startedAt) : '--')}</td>
                <td title="${escapeHtml(formatDateTime(container.lastActivity))}">${escapeHtml(formatRelativeTime(container.lastActivity))}</td>
                <td>
                    <div class="table-action-group">
                        <button class="btn btn-sm btn-outline-success" type="button" data-container-action="start" data-container-id="${escapeHtml(container.containerId)}" ${isRunning ? 'disabled' : ''}>Start</button>
                        <button class="btn btn-sm btn-outline-danger" type="button" data-container-action="stop" data-container-id="${escapeHtml(container.containerId)}" ${isStopped ? 'disabled' : ''}>Stop</button>
                        <button class="btn btn-sm btn-outline-warning" type="button" data-container-action="restart" data-container-id="${escapeHtml(container.containerId)}">Restart</button>
                    </div>
                </td>
            </tr>
        `;
    }

    function renderContainerTables(containers) {
        const filtered = getFilteredContainers(containers);
        const monitoringBody = document.getElementById('monitoringContainersTableBody');
        const labBody = document.getElementById('labContainersTableBody');

        if (monitoringBody) {
            monitoringBody.innerHTML = containers.length
                ? containers.map(buildContainerRow).join('')
                : '';
            if (!containers.length) {
                renderEmptyRow('monitoringContainersTableBody', 7, 'No Docker containers detected yet.');
            }
        }

        if (labBody) {
            labBody.innerHTML = filtered.length
                ? filtered.map(buildContainerRow).join('')
                : '';
            if (!filtered.length) {
                renderEmptyRow(
                    'labContainersTableBody',
                    7,
                    state.activeTemplateFilter
                        ? `No containers found for ${state.activeTemplateFilter.name}.`
                        : 'No lab containers available yet.'
                );
            }
        }

        setLabFilterBadge();
    }

    function renderCharts(charts) {
        if (typeof Chart === 'undefined') {
            return;
        }

        const usageCanvas = document.getElementById('containerUsageChart');
        const resourceCanvas = document.getElementById('resourceUtilizationChart');
        if (!usageCanvas || !resourceCanvas) {
            return;
        }

        const usageData = {
            labels: charts?.containerUsage?.labels || [],
            datasets: [{
                label: 'Active Containers',
                data: charts?.containerUsage?.values || [],
                borderColor: '#f97316',
                backgroundColor: 'rgba(249, 115, 22, 0.18)',
                fill: true,
                tension: 0.35
            }]
        };

        const resourceData = {
            labels: charts?.resourceUtilization?.labels || [],
            datasets: [
                {
                    label: 'CPU %',
                    data: charts?.resourceUtilization?.cpuUsage || [],
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.12)',
                    tension: 0.35
                },
                {
                    label: 'Memory %',
                    data: charts?.resourceUtilization?.memoryUsage || [],
                    borderColor: '#16a34a',
                    backgroundColor: 'rgba(22, 163, 74, 0.12)',
                    tension: 0.35
                },
                {
                    label: 'Storage %',
                    data: charts?.resourceUtilization?.storageUsage || [],
                    borderColor: '#dc2626',
                    backgroundColor: 'rgba(220, 38, 38, 0.12)',
                    tension: 0.35
                }
            ]
        };

        if (state.charts.containerUsage) {
            state.charts.containerUsage.data = usageData;
            state.charts.containerUsage.update();
        } else {
            state.charts.containerUsage = new Chart(usageCanvas, {
                type: 'line',
                data: usageData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                precision: 0
                            }
                        }
                    }
                }
            });
        }

        if (state.charts.resourceUtilization) {
            state.charts.resourceUtilization.data = resourceData;
            state.charts.resourceUtilization.update();
        } else {
            state.charts.resourceUtilization = new Chart(resourceCanvas, {
                type: 'line',
                data: resourceData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100
                        }
                    }
                }
            });
        }
    }

    function applyMonitoringSnapshot(snapshot, source = 'api') {
        if (!snapshot || typeof snapshot !== 'object') {
            return;
        }

        state.snapshot = snapshot;

        const summary = snapshot.summary || {};
        const containers = Array.isArray(snapshot.containers) ? snapshot.containers : [];
        const templates = Array.isArray(snapshot.labEnvironments) ? snapshot.labEnvironments : [];

        updateSummaryCards(summary);
        updateResourceStrip(summary);
        updateLabSummary(templates, containers);
        renderTemplateCards(templates);
        renderContainerTables(containers);
        renderAlerts(snapshot.alerts || []);
        renderRecentActivity(snapshot.recentActivity || []);
        renderUsageSummary(templates);
        renderCharts(snapshot.charts || {});
        if (state.charts.containerUsage || state.charts.resourceUtilization) {
            requestAnimationFrame(() => {
                state.charts.containerUsage?.resize();
                state.charts.resourceUtilization?.resize();
            });
        }

        setLiveIndicator(
            source === 'socket' ? 'Live updates connected' : 'Real-time monitoring ready',
            'is-live'
        );
    }

    async function fetchMonitoringSnapshot(options = {}) {
        if (!options.silent) {
            setLiveIndicator('Loading monitoring data', 'is-loading');
        }

        const response = await window.api.getMonitoringOverview();
        if (!response?.success) {
            throw new Error(response?.message || 'Unable to load monitoring dashboard');
        }

        applyMonitoringSnapshot(response.data, 'api');
        return response.data;
    }

    function ensureSnapshot() {
        if (state.snapshot) {
            applyMonitoringSnapshot(state.snapshot, 'api');
            return Promise.resolve(state.snapshot);
        }

        return fetchMonitoringSnapshot({ silent: true });
    }

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.remove();
        }
    }

    function attachModalClose(selector) {
        if (typeof window.setupModalClose === 'function') {
            window.setupModalClose(selector);
            return;
        }

        const modal = document.querySelector(selector);
        if (!modal) return;

        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.remove();
            }
        });

        const closeButton = modal.querySelector('.close-modal');
        if (closeButton) {
            closeButton.addEventListener('click', () => modal.remove());
        }
    }

    function buildTemplatePayload(formData) {
        return {
            name: String(formData.get('name') || '').trim(),
            description: String(formData.get('description') || '').trim(),
            dockerImage: String(formData.get('dockerImage') || '').trim(),
            category: String(formData.get('category') || 'programming'),
            isActive: formData.get('isActive') === 'on',
            resources: {
                cpu: Math.max(1, parseInt(formData.get('cpu'), 10) || 1),
                memory: String(formData.get('memory') || '512MB').trim(),
                storage: String(formData.get('storage') || '5GB').trim()
            }
        };
    }

    function getPresetKeyForTemplate(template) {
        const dockerImage = String(template?.dockerImage || '').toLowerCase();
        const templateName = String(template?.name || '').toLowerCase();

        if (dockerImage === 'virtual-lab/python-dev:latest') return 'python';
        if (dockerImage === 'virtual-lab/node-dev:latest') return 'javascript';
        if (dockerImage === 'virtual-lab/network-minimal:latest') return 'networking';
        if (dockerImage.includes('eclipse-temurin')) return 'java';
        if (dockerImage === 'gcc:13') {
            if (templateName.includes('c++')) return 'cpp';
            if (templateName.includes('c programming')) return 'c';
        }

        return 'custom';
    }

    function getInitialTemplateValues(template, presetKey) {
        if (template) {
            return template;
        }

        const preset = TEMPLATE_PRESETS[presetKey] || TEMPLATE_PRESETS.python;
        return {
            name: preset.name,
            description: preset.description,
            dockerImage: preset.dockerImage,
            category: preset.category,
            resources: { ...preset.resources },
            isActive: true
        };
    }

    function applyPresetToForm(form, presetKey) {
        const preset = TEMPLATE_PRESETS[presetKey];
        const summary = form.querySelector('[data-preset-summary]');

        if (!preset) {
            if (summary) {
                summary.textContent = 'Custom template selected. Enter any language environment manually.';
            }
            return;
        }

        const fields = {
            name: preset.name,
            description: preset.description,
            dockerImage: preset.dockerImage,
            category: preset.category,
            cpu: String(preset.resources.cpu),
            memory: preset.resources.memory,
            storage: preset.resources.storage
        };

        Object.entries(fields).forEach(([name, value]) => {
            const field = form.elements.namedItem(name);
            if (field) {
                field.value = value;
            }
        });

        if (summary) {
            summary.textContent = `${preset.label} starter preset selected. You can adjust any field before saving.`;
        }
    }

    function openTemplateModal(template) {
        closeModal('templateManagementModal');

        const isEdit = Boolean(template?._id || template?.id);
        const initialPresetKey = isEdit ? getPresetKeyForTemplate(template) : 'python';
        const initialTemplate = getInitialTemplateValues(template, initialPresetKey);
        const modalHtml = `
            <div id="templateManagementModal" class="modal" style="display: block;">
                <div class="modal-content" style="max-width: 640px;">
                    <span class="close-modal">&times;</span>
                    <h2>${isEdit ? 'Edit Lab Template' : 'Create Lab Template'}</h2>
                    <form id="templateManagementForm" class="mt-3">
                        <div class="template-preset-panel">
                            <div class="form-group mb-0">
                                <label>Starter Preset</label>
                                <select name="presetKey" id="templatePresetSelect">
                                    <option value="python" ${initialPresetKey === 'python' ? 'selected' : ''}>Python</option>
                                    <option value="javascript" ${initialPresetKey === 'javascript' ? 'selected' : ''}>JavaScript</option>
                                    <option value="java" ${initialPresetKey === 'java' ? 'selected' : ''}>Java</option>
                                    <option value="c" ${initialPresetKey === 'c' ? 'selected' : ''}>C</option>
                                    <option value="cpp" ${initialPresetKey === 'cpp' ? 'selected' : ''}>C++</option>
                                    <option value="networking" ${initialPresetKey === 'networking' ? 'selected' : ''}>Networking</option>
                                    <option value="custom" ${initialPresetKey === 'custom' ? 'selected' : ''}>Custom</option>
                                </select>
                                <small class="template-preset-summary" data-preset-summary>
                                    ${initialPresetKey === 'custom'
                                        ? 'Custom template selected. Enter any language environment manually.'
                                        : `${escapeHtml(TEMPLATE_PRESETS[initialPresetKey].label)} starter preset selected. You can adjust any field before saving.`}
                                </small>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Template Name *</label>
                            <input type="text" name="name" value="${escapeHtml(initialTemplate.name || '')}" required>
                        </div>
                        <div class="form-group">
                            <label>Description *</label>
                            <textarea name="description" rows="4" required>${escapeHtml(initialTemplate.description || '')}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Docker Image *</label>
                            <input type="text" name="dockerImage" value="${escapeHtml(initialTemplate.dockerImage || '')}" placeholder="e.g. python:3.11" required>
                        </div>
                        <div class="row g-3">
                            <div class="col-md-6">
                                <div class="form-group">
                                    <label>Category</label>
                                    <select name="category">
                                        ${['programming', 'networking', 'database', 'machine-learning', 'web-development', 'other'].map((category) => `
                                            <option value="${category}" ${String(initialTemplate.category || 'programming') === category ? 'selected' : ''}>${category.replace(/-/g, ' ')}</option>
                                        `).join('')}
                                    </select>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-group">
                                    <label>CPU</label>
                                    <input type="number" min="1" name="cpu" value="${escapeHtml(String(initialTemplate?.resources?.cpu || initialTemplate?.cpu || 1))}">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-group">
                                    <label>Memory</label>
                                    <input type="text" name="memory" value="${escapeHtml(initialTemplate?.resources?.memory || initialTemplate?.memory || '512MB')}">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-group">
                                    <label>Storage</label>
                                    <input type="text" name="storage" value="${escapeHtml(initialTemplate?.resources?.storage || initialTemplate?.storage || '5GB')}">
                                </div>
                            </div>
                        </div>
                        <div class="form-check mt-3">
                            <input class="form-check-input" type="checkbox" name="isActive" id="templateIsActive" ${initialTemplate?.isActive === false ? '' : 'checked'}>
                            <label class="form-check-label" for="templateIsActive">Template is active</label>
                        </div>
                        <div class="d-flex justify-content-end gap-2 mt-4">
                            <button type="button" class="btn btn-outline-secondary" data-modal-close>Cancel</button>
                            <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Create Template'}</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        attachModalClose('#templateManagementModal');

        const cancelButton = document.querySelector('#templateManagementModal [data-modal-close]');
        if (cancelButton) {
            cancelButton.addEventListener('click', () => closeModal('templateManagementModal'));
        }

        const form = document.getElementById('templateManagementForm');
        if (!form) return;

        const presetSelect = document.getElementById('templatePresetSelect');
        if (presetSelect) {
            presetSelect.addEventListener('change', () => {
                applyPresetToForm(form, presetSelect.value);
            });
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            const submitButton = form.querySelector('button[type="submit"]');
            const originalText = submitButton ? submitButton.textContent : '';

            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = isEdit ? 'Saving...' : 'Creating...';
            }

            try {
                const payload = buildTemplatePayload(new FormData(form));
                const response = isEdit
                    ? await window.api.updateLabTemplate(template._id || template.id, payload)
                    : await window.api.createLabTemplate(payload);

                if (response?.success) {
                    notify(`Lab template ${isEdit ? 'updated' : 'created'} successfully.`, 'success');
                    closeModal('templateManagementModal');
                    await fetchMonitoringSnapshot({ silent: true });
                }
            } catch (error) {
                notify(`Unable to save lab template: ${error.message}`, 'error');
            } finally {
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = originalText;
                }
            }
        });
    }

    async function openEditTemplate(templateId) {
        try {
            const response = await window.api.getLabTemplate(templateId);
            if (!response?.success) {
                throw new Error(response?.message || 'Template not found');
            }

            openTemplateModal(response.data);
        } catch (error) {
            notify(`Unable to load lab template: ${error.message}`, 'error');
        }
    }

    async function deleteTemplate(templateId) {
        if (!window.confirm('Delete this lab template?')) {
            return;
        }

        try {
            const response = await window.api.deleteLabTemplate(templateId);
            if (response?.success) {
                if (state.activeTemplateFilter && String(state.activeTemplateFilter.id) === String(templateId)) {
                    state.activeTemplateFilter = null;
                }

                notify('Lab template deleted successfully.', 'success');
                await fetchMonitoringSnapshot({ silent: true });
            }
        } catch (error) {
            notify(`Unable to delete lab template: ${error.message}`, 'error');
        }
    }

    function focusTemplateContainers(templateId) {
        const templates = state.snapshot?.labEnvironments || [];
        const template = templates.find((item) => String(item.id) === String(templateId));
        if (!template) return;

        state.activeTemplateFilter = {
            id: String(template.id),
            name: template.name,
            filterValue: String(template.filterValue || template.dockerImage || ''),
            relatedLabIds: Array.isArray(template.relatedLabIds) ? template.relatedLabIds.map(String) : []
        };

        renderContainerTables(state.snapshot?.containers || []);

        const section = document.querySelector('.containers-monitor');
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    function clearTemplateFilter() {
        state.activeTemplateFilter = null;
        renderContainerTables(state.snapshot?.containers || []);
    }

    async function performContainerAction(action, containerId) {
        if (!containerId) return;

        const confirmationText = {
            start: 'Start this container?',
            stop: 'Stop this container?',
            restart: 'Restart this container?'
        };

        if (confirmationText[action] && !window.confirm(confirmationText[action])) {
            return;
        }

        const handlers = {
            start: () => window.api.adminStartContainer(containerId),
            stop: () => window.api.adminStopContainer(containerId),
            restart: () => window.api.adminRestartContainer(containerId)
        };
        const successText = {
            start: 'Container started successfully.',
            stop: 'Container stopped successfully.',
            restart: 'Container restarted successfully.'
        };

        if (!handlers[action]) {
            return;
        }

        try {
            const response = await handlers[action]();
            if (response?.success) {
                notify(successText[action] || 'Container updated successfully.', 'success');
                await fetchMonitoringSnapshot({ silent: true });
            }
        } catch (error) {
            notify(`Unable to ${action} container: ${error.message}`, 'error');
        }
    }

    function bindStaticEvents() {
        const createButton = document.getElementById('createLabTemplateBtn');
        if (createButton && !createButton.dataset.boundTemplateCreate) {
            const replacement = createButton.cloneNode(true);
            createButton.parentNode.replaceChild(replacement, createButton);
            replacement.dataset.boundTemplateCreate = 'true';
            replacement.addEventListener('click', () => openTemplateModal(null));
        }

        const templateGrid = document.getElementById('labTemplatesGrid');
        if (templateGrid && !templateGrid.dataset.bound) {
            templateGrid.dataset.bound = 'true';
            templateGrid.addEventListener('click', (event) => {
                const button = event.target.closest('button[data-template-action]');
                if (!button) return;

                const templateId = button.dataset.templateId;
                const action = button.dataset.templateAction;

                if (action === 'edit') openEditTemplate(templateId);
                if (action === 'view') focusTemplateContainers(templateId);
                if (action === 'delete') deleteTemplate(templateId);
            });
        }

        ['labContainersTableBody', 'monitoringContainersTableBody'].forEach((targetId) => {
            const target = document.getElementById(targetId);
            if (!target || target.dataset.bound) return;

            target.dataset.bound = 'true';
            target.addEventListener('click', (event) => {
                const button = event.target.closest('button[data-container-action]');
                if (!button) return;

                performContainerAction(button.dataset.containerAction, button.dataset.containerId);
            });
        });

        const clearButton = document.getElementById('clearLabContainerFilterBtn');
        if (clearButton && !clearButton.dataset.bound) {
            clearButton.dataset.bound = 'true';
            clearButton.addEventListener('click', clearTemplateFilter);
        }
    }

    function initializeSocket() {
        if (state.socket || typeof io !== 'function') {
            if (typeof io !== 'function') {
                setLiveIndicator('Socket.io unavailable', 'is-offline');
            }
            return;
        }

        state.socket = io(SOCKET_URL, {
            auth: {
                token: getToken()
            }
        });

        state.socket.on('connect', () => {
            setLiveIndicator('Connected to live monitoring', 'is-live');
            state.socket.emit('monitoring:subscribe');
        });

        state.socket.on('monitoring:update', (snapshot) => {
            applyMonitoringSnapshot(snapshot, 'socket');
        });

        state.socket.on('disconnect', () => {
            setLiveIndicator('Live connection lost', 'is-offline');
        });

        state.socket.on('connect_error', () => {
            setLiveIndicator('Live updates unavailable', 'is-offline');
        });
    }

    function exposeOverrides() {
        loadMonitoringData = window.loadMonitoringData = function () {
            return fetchMonitoringSnapshot();
        };

        loadLabs = window.loadLabs = function () {
            return ensureSnapshot();
        };

        loadContainers = window.loadContainers = function () {
            return ensureSnapshot();
        };

        showCreateLabModal = window.showCreateLabModal = function () {
            openTemplateModal(null);
        };

        openEditLabModal = window.openEditLabModal = function (templateId) {
            return openEditTemplate(templateId);
        };

        deleteLab = window.deleteLab = function (templateId) {
            return deleteTemplate(templateId);
        };

        stopContainer = window.stopContainer = function (containerId) {
            return performContainerAction('stop', containerId);
        };

        restartContainer = window.restartContainer = function (containerId) {
            return performContainerAction('restart', containerId);
        };
    }

    function initialize() {
        if (!document.getElementById('monitoring') || !document.getElementById('lab-environments')) {
            return;
        }

        if (!getToken() || sessionStorage.getItem('userType') !== 'admin') {
            return;
        }

        bindStaticEvents();
        initializeSocket();
        fetchMonitoringSnapshot({ silent: true }).catch((error) => {
            setLiveIndicator('Unable to load monitoring data', 'is-offline');
            notify(`Monitoring dashboard failed to load: ${error.message}`, 'error');
        });
    }

    // Apply the admin dashboard overrides before DOMContentLoaded fires so the
    // first lab-environments render uses the monitoring snapshot layout.
    exposeOverrides();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
