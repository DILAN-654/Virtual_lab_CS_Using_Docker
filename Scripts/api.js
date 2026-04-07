// Scripts/api.js
// API Service for Frontend
// Backend API is on localhost:5000, Frontend on localhost:8000
const API_BASE_URL = 'http://localhost:5000/api';

console.log('API initialized. Backend URL:', API_BASE_URL);

class APIService {
  constructor() {
    // Try to restore token from storage (session preferred)
    this.token =
      sessionStorage.getItem('token') ||
      localStorage.getItem('token') ||
      null;
  }

  // Set authentication token
  // persist=true will also store in localStorage
  setToken(token, persist = true) {
    this.token = token;

    // Always keep sessionStorage for current tab usage
    sessionStorage.setItem('token', token);

    if (persist) {
      localStorage.setItem('token', token);
    }
  }

  // Clear token from storage
  clearToken() {
    this.token = null;
    sessionStorage.removeItem('token');
    localStorage.removeItem('token');
  }

  // Get headers with auth
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  // Generic request method
  async request(endpoint, options = {}) {
    // Always re-check token from storage (in case it was set after API initialization)
    this.token = sessionStorage.getItem('token') || localStorage.getItem('token') || this.token;
    
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...(options.headers || {}),
      },
    };

    try {
      console.log(`[API] ${config.method || 'GET'} ${url}`);
      const response = await fetch(url, config);

      // Try to parse JSON, but avoid crashing on empty body
      let data = null;
      const text = await response.text();
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          // not JSON, ignore
          data = { message: text };
        }
      } else {
        data = {};
      }

      if (!response.ok) {
        console.error(`[API Error] ${response.status}:`, data);
        throw new Error(
          (data && data.message) || `Request failed: ${response.status}`
        );
      }

      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // 🔐 Authentication

  // This is what login.js calls: window.api.login(username, password)
  async login(username, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    // Expect backend to return { success, user, token, message? }
    if (data.token) {
      this.setToken(data.token, true);
    }

    // Normalize shape a bit in case backend omits "success"
    if (typeof data.success === 'undefined') {
      data.success = !!data.token && !!data.user;
    }

    return data;
  }

  async register(userData) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    if (data.token) {
      this.setToken(data.token, true);
    }
    return data;
  }

  async getCurrentUser() {
    return await this.request('/auth/me');
  }

  // 🧪 Labs
  async getLabs() {
    return await this.request('/labs');
  }

  async getLab(id) {
    return await this.request(`/labs/${id}`);
  }

  // 🐳 Containers
  async getContainers() {
    return await this.request('/containers');
  }

  async startContainer(labId) {
    // legacy container start; prefer startLab
    return await this.request('/containers/start', {
      method: 'POST',
      body: JSON.stringify({ labId }),
    });
  }

  async stopContainer(containerId) {
    return await this.request(`/containers/${containerId}/stop`, {
      method: 'POST',
    });
  }

  async pauseContainer(containerId) {
    return await this.request(`/containers/${containerId}/pause`, {
      method: 'POST',
    });
  }

  async resumeContainer(containerId) {
    return await this.request(`/containers/${containerId}/resume`, {
      method: 'POST',
    });
  }

  // 🤖 AI Assistant
  async sendAIMessage(message, context) {
    return await this.request('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, context }),
    });
  }

  async debugCode(code, language) {
    return await this.request('/ai/debug', {
      method: 'POST',
      body: JSON.stringify({ code, language }),
    });
  }

  async getAIStatus(test) {
    const url = test ? '/ai/status?test=1' : '/ai/status';
    return await this.request(url);
  }

  // ---- Additional helpers matching current backend routes ----
  // Start a lab (backend route: POST /api/labs/:id/start)
  async startLab(labId) {
    return await this.request(`/labs/${labId}/start`, {
      method: 'POST'
    });
  }

  // Stop/pause/resume container via labs route (backend uses /api/labs/:containerId/stop etc)
  async stopLab(containerId) {
    return await this.request(`/labs/${containerId}/stop`, { method: 'POST' });
  }

  async pauseLab(containerId) {
    return await this.request(`/labs/${containerId}/pause`, { method: 'POST' });
  }

  async resumeLab(containerId) {
    return await this.request(`/labs/${containerId}/resume`, { method: 'POST' });
  }

  async getContainerLogs(containerId) {
    return await this.request(`/labs/${containerId}/logs`);
  }

  async getContainerStatus(containerId) {
    return await this.request(`/labs/${containerId}/status`);
  }

  // Get single task
  async getTask(id) {
    return await this.request(`/tasks/${id}`);
  }

  // Submit task with FormData (files). The backend expects multipart/form-data.
  async submitTaskForm(taskId, formData) {
    const url = `${API_BASE_URL}/tasks/${taskId}/submit`;
    const headers = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok) throw new Error(data.message || `Request failed: ${response.status}`);

    return data;
  }

  // ✅ Tasks
  async getTasks() {
    return await this.request('/tasks?assignedToMe=true');
  }

  async submitTask(taskId, files) {
    return await this.request(`/tasks/${taskId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ files }),
    });
  }

  // 📊 Analytics
  async getAnalytics() {
    return await this.request('/analytics');
  }

  async getStats() {
    return await this.request('/analytics/stats');
  }

  async trackAnalytics(payload) {
    return await this.request('/analytics/track', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getStudentAnalyticsSummary(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    return await this.request(`/analytics/student-summary${queryParams ? '?' + queryParams : ''}`);
  }

  // 🏆 Gamification
  async getGamification() {
    return await this.request('/gamification');
  }

  async addXP(points, reason) {
    return await this.request('/gamification/xp', {
      method: 'POST',
      body: JSON.stringify({ points, reason }),
    });
  }

  async awardPoints(event, payload = {}) {
    return await this.request('/gamification/award', {
      method: 'POST',
      body: JSON.stringify({ event, ...payload }),
    });
  }

  // 👥 Admin - User Management
  async getUsers(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return await this.request(`/users${queryParams ? '?' + queryParams : ''}`);
  }

  async getUser(id) {
    return await this.request(`/users/${id}`);
  }

  async createUser(userData) {
    return await this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id, userData) {
    return await this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(id) {
    return await this.request(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  async bulkUploadUsers(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    const url = `${API_BASE_URL}/users/bulk-upload`;
    const headers = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok) {
      throw new Error(data.message || `Request failed: ${response.status}`);
    }

    return data;
  }

  async resetUserPassword(id, newPassword) {
    return await this.request(`/users/${id}/reset-password`, {
      method: 'PUT',
      body: JSON.stringify({ newPassword }),
    });
  }

  // 🧪 Admin - Lab Management
  async createLab(labData) {
    return await this.request('/labs', {
      method: 'POST',
      body: JSON.stringify(labData),
    });
  }

  async updateLab(id, labData) {
    return await this.request(`/labs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(labData),
    });
  }

  async deleteLab(id) {
    return await this.request(`/labs/${id}`, {
      method: 'DELETE',
    });
  }

  // ✅ Admin - Task Management
  async getAllTasks(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return await this.request(`/tasks${queryParams ? '?' + queryParams : ''}`);
  }

  async createTask(taskData) {
    return await this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  }

  async updateTask(id, taskData) {
    return await this.request(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(taskData),
    });
  }

  async deleteTask(id) {
    return await this.request(`/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  async getTaskSubmissions(taskId) {
    return await this.request(`/tasks/${taskId}/submissions`);
  }

  async getAssignedTaskSubmissionsAdmin(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return await this.request(`/assigned-tasks/admin/submissions${queryParams ? '?' + queryParams : ''}`);
  }

  // ✅ Assigned Tasks (Student-specific tasks assigned by admin)
  async getAssignedTasks(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return await this.request(`/assigned-tasks${queryParams ? '?' + queryParams : ''}`);
  }

  async getAssignedTask(id) {
    return await this.request(`/assigned-tasks/${id}`);
  }

  async startAssignedTask(id) {
    return await this.request(`/assigned-tasks/${id}/start`, {
      method: 'PUT'
    });
  }

  async submitAssignedTask(id, submissionData) {
    return await this.request(`/assigned-tasks/${id}/submit`, {
      method: 'PUT',
      body: JSON.stringify(submissionData)
    });
  }

  // Submit assigned task with files (FormData)
  async submitAssignedTaskForm(id, formData) {
    const url = `${API_BASE_URL}/assigned-tasks/${id}/submit`;
    const headers = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: formData
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    if (!response.ok) throw new Error(data.message || `Request failed: ${response.status}`);
    return data;
  }

  async runAssignedTask(id, formDataOrJson) {
    const url = `${API_BASE_URL}/assigned-tasks/${id}/run`;

    // If formData provided, send as POST without content-type override.
    if (formDataOrJson instanceof FormData) {
      const headers = {};
      if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
      
      try {
        const response = await fetch(url, { method: 'POST', headers, body: formDataOrJson });
        const text = await response.text();
        const data = text ? JSON.parse(text) : {};
        
        if (!response.ok) {
          console.error(`[runAssignedTask] Error: ${response.status}`, data);
          throw new Error(data.message || `Request failed: ${response.status}`);
        }
        
        console.log(`[runAssignedTask] Success:`, data);
        return data;
      } catch (error) {
        console.error(`[runAssignedTask] Exception:`, error);
        throw error;
      }
    }

    // Otherwise assume JSON - use the standard request method
    try {
      const result = await this.request(`/assigned-tasks/${id}/run`, {
        method: 'POST',
        body: JSON.stringify(formDataOrJson)
      });
      console.log(`[runAssignedTask] Success:`, result);
      return result;
    } catch (error) {
      console.error(`[runAssignedTask] Exception:`, error);
      throw error;
    }
  }

  async assignTaskToStudent(taskId, studentIds, labId, deadline) {
    return await this.request('/assigned-tasks', {
      method: 'POST',
      body: JSON.stringify({ taskId, studentIds, labId, deadline })
    });
  }

  async gradeAssignedTask(id, grade, feedback, decision) {
    return await this.request(`/assigned-tasks/${id}/grade`, {
      method: 'PUT',
      body: JSON.stringify({ grade, feedback, decision })
    });
  }

  async deleteAssignedTask(id) {
    return await this.request(`/assigned-tasks/${id}`, {
      method: 'DELETE'
    });
  }

  // 🐳 Admin - Container Management (get all containers)
  async getAllContainers() {
    return await this.request('/containers/all');
  }

  async adminStopContainer(containerId) {
    return await this.request(`/containers/${containerId}/admin/stop`, { method: 'POST' });
  }

  async adminStartContainer(containerId) {
    return await this.request(`/containers/${containerId}/admin/start`, { method: 'POST' });
  }

  async adminRestartContainer(containerId) {
    return await this.request(`/containers/${containerId}/admin/restart`, { method: 'POST' });
  }

  async adminRemoveContainer(containerId) {
    return await this.request(`/containers/${containerId}/admin`, { method: 'DELETE' });
  }

  async adminGetContainerLogs(containerId, tail = 200) {
    const qs = tail ? `?tail=${encodeURIComponent(String(tail))}` : '';
    return await this.request(`/containers/${containerId}/admin/logs${qs}`);
  }

  async removeContainerAdmin(containerId) {
    return await this.request(`/containers/${containerId}`, {
      method: 'DELETE',
    });
  }

  async getContainerLogsAdmin(containerId) {
    return await this.request(`/containers/${containerId}/logs`);
  }

  // 🧪 Lab Templates (catalog of available container images)
  async getLabTemplates() {
    return await this.request('/lab-templates');
  }

  async getLabTemplate(id) {
    return await this.request(`/lab-templates/${id}`);
  }

  async createLabTemplate(templateData) {
    return await this.request('/lab-templates', {
      method: 'POST',
      body: JSON.stringify(templateData),
    });
  }

  async updateLabTemplate(id, templateData) {
    return await this.request(`/lab-templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(templateData),
    });
  }

  async deleteLabTemplate(id) {
    return await this.request(`/lab-templates/${id}`, {
      method: 'DELETE',
    });
  }

  // 📈 Admin Monitoring
  async getMonitoringOverview() {
    return await this.request('/monitoring/overview');
  }

  // ---- Language Detection Tools ----
  
  async detectLanguage(filename, code = '') {
    return await this.request('/tools/detect-language', {
      method: 'POST',
      body: JSON.stringify({ filename, code })
    });
  }

  async getSupportedLanguages() {
    return await this.request('/tools/supported-languages');
  }

  async validateLanguage(language) {
    return await this.request('/tools/validate-language', {
      method: 'POST',
      body: JSON.stringify({ language })
    });
  }

  // 📁 My Lab Files
  async getMyLabFiles(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return await this.request(`/my-lab-files${queryParams ? '?' + queryParams : ''}`);
  }

  async getMyLabFile(id) {
    return await this.request(`/my-lab-files/${id}`);
  }

  async createMyLabFile(fileData) {
    return await this.request('/my-lab-files', {
      method: 'POST',
      body: JSON.stringify(fileData)
    });
  }

  async updateMyLabFile(id, fileData) {
    return await this.request(`/my-lab-files/${id}`, {
      method: 'PUT',
      body: JSON.stringify(fileData)
    });
  }

  async deleteMyLabFile(id) {
    return await this.request(`/my-lab-files/${id}`, {
      method: 'DELETE'
    });
  }

  async getFilesByTopic(topic) {
    return await this.request(`/my-lab-files/topic/${topic}`);
  }

  async downloadFile(fileId) {
    return await this.request(`/my-lab-files/${fileId}/download`);
  }

  async deleteFile(fileId) {
    return await this.request(`/my-lab-files/${fileId}`, {
      method: 'DELETE'
    });
  }

  // 🔔 Notifications
  async getNotifications(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    return await this.request(`/notifications${queryParams ? '?' + queryParams : ''}`);
  }

  async markNotificationRead(notificationId) {
    return await this.request(`/notifications/${notificationId}/read`, {
      method: 'POST'
    });
  }

  async markAllNotificationsRead() {
    return await this.request('/notifications/read-all', {
      method: 'POST'
    });
  }
}

// Export singleton instance
const api = new APIService();
window.api = api; // Make available globally
