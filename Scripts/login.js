// Password Toggle Functionality
function setupPasswordToggle(passwordInputId, toggleIconId) {
    const passwordInput = document.getElementById(passwordInputId);
    const toggleIcon = document.getElementById(toggleIconId);
  
    if (passwordInput && toggleIcon) {
      // Show toggle icon when password field has value
      passwordInput.addEventListener('input', () => {
        toggleIcon.style.display = passwordInput.value.length > 0 ? 'block' : 'none';
      });
  
      // Toggle password visibility
      toggleIcon.addEventListener('click', () => {
        if (passwordInput.type === 'password') {
          passwordInput.type = 'text';
          toggleIcon.classList.remove('bx-hide');
          toggleIcon.classList.add('bx-show');
        } else {
          passwordInput.type = 'password';
          toggleIcon.classList.remove('bx-show');
          toggleIcon.classList.add('bx-hide');
        }
      });
    }
  }
  
  // Forgot Password Modal
  function setupForgotPasswordModal() {
    const modal = document.getElementById('forgotPasswordModal');
    const forgotPasswordLinks = document.querySelectorAll('#studentForgotPassword, #adminForgotPassword');
    const closeModal = document.querySelector('.close-modal');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const resetMessage = document.getElementById('resetMessage');
  
    if (!modal) return;
  
    // Open modal
    forgotPasswordLinks.forEach(link => {
      if (link) {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          modal.style.display = 'block';
        });
      }
    });
  
    // Close modal button
    if (closeModal) {
      closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
        if (resetMessage) resetMessage.style.display = 'none';
        if (forgotPasswordForm) forgotPasswordForm.reset();
      });
    }
  
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
        if (resetMessage) resetMessage.style.display = 'none';
        if (forgotPasswordForm) forgotPasswordForm.reset();
      }
    });
  
    // Handle form submission
    if (forgotPasswordForm && resetMessage) {
      forgotPasswordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('resetEmail').value;
  
        if (email) {
          // TODO: Replace with actual API call
          resetMessage.textContent = `Password reset link has been sent to ${email}. Please check your inbox.`;
          resetMessage.className = 'modal-message success';
          resetMessage.style.display = 'block';
  
          setTimeout(() => {
            forgotPasswordForm.reset();
            resetMessage.style.display = 'none';
          }, 3000);
        } else {
          resetMessage.textContent = 'Please enter a valid email address.';
          resetMessage.className = 'modal-message error';
          resetMessage.style.display = 'block';
        }
      });
    }
  }
  
  // Generic login handler for both student & admin
  async function handleLogin({ formId, usernameId, passwordId, messageId, expectedRole }) {
    const form = document.getElementById(formId);
    const usernameInput = document.getElementById(usernameId);
    const passwordInput = document.getElementById(passwordId);
    const messageEl = document.getElementById(messageId);
  
    if (!form || !usernameInput || !passwordInput || !messageEl) return;
  
    const submitBtn = form.querySelector('button[type="submit"]');
  
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
  
      const username = usernameInput.value.trim();
      const password = passwordInput.value;
  
      if (!username || !password) {
        messageEl.textContent = 'Username and password are required.';
        messageEl.className = 'form-message error';
        return;
      }
  
      if (password.length < 4) {
        messageEl.textContent = 'Password must be at least 4 characters long.';
        messageEl.className = 'form-message error';
        return;
      }
  
      if (!window.api || typeof window.api.login !== 'function') {
        messageEl.textContent = 'Login service is not available. Please try again later.';
        messageEl.className = 'form-message error';
        return;
      }
  
      submitBtn.disabled = true;
      messageEl.textContent = 'Signing you in...';
      messageEl.className = 'form-message info';
  
      try {
        const { success, user, token, message } = await window.api.login(username, password);

        if (!success || !user || !token) {
          throw new Error(message || 'Invalid username or password.');
        }

        // Enforce role-based access control
        if (expectedRole === 'admin') {
          // Admin form: Only allow admins
          if (user.role !== 'admin') {
            throw new Error('Access denied. Please use the Student Login form to access your account.');
          }
        } else if (expectedRole === 'student') {
          // Student form: Only allow students and faculty, reject admins
          if (user.role === 'admin') {
            throw new Error('Access denied. Please use the Admin Login form to access your account.');
          }
          if (user.role !== 'student' && user.role !== 'faculty') {
            throw new Error('Access denied. Invalid account type for student login.');
          }
        }

        // Save session info
        sessionStorage.setItem('token', token);
        sessionStorage.setItem('userType', user.role);
        sessionStorage.setItem('username', user.username);
        sessionStorage.setItem('userId', user.id || user._id);

        messageEl.textContent = 'Login successful. Redirecting...';
        messageEl.className = 'form-message success';

        // Redirect based on role
        if (user.role === 'admin') {
          window.location.href = 'admin-dashboard.html';
        } else {
          window.location.href = 'student-dashboard.html';
        }
      } catch (err) {
        console.error('Login error:', err);
        messageEl.textContent = err.message || 'Invalid username or password.';
        messageEl.className = 'form-message error';
      } finally {
        submitBtn.disabled = false;
      }
    });
  }
  
  document.addEventListener('DOMContentLoaded', () => {
    // Toggle between Student and Admin login forms
    const container = document.querySelector('.container');
    const adminBtn = document.querySelector('.admin-btn');
    const loginBtn = document.querySelector('.login-btn');
  
    if (container && adminBtn && loginBtn) {
      adminBtn.addEventListener('click', () => {
        container.classList.add('active');
      });
  
      loginBtn.addEventListener('click', () => {
        container.classList.remove('active');
      });
    }
  
    // Setup password toggles
    setupPasswordToggle('studentPassword', 'studentPasswordToggle');
    setupPasswordToggle('adminPassword', 'adminPasswordToggle');
  
    // Setup forgot password modal
    setupForgotPasswordModal();
  
    // Hook both forms into the same login flow
    handleLogin({
      formId: 'studentLoginForm',
      usernameId: 'studentUsername',
      passwordId: 'studentPassword',
      messageId: 'studentMessage',
      expectedRole: 'student',
    });
  
    handleLogin({
      formId: 'adminLoginForm',
      usernameId: 'adminUsername',
      passwordId: 'adminPassword',
      messageId: 'adminMessage',
      expectedRole: 'admin',
    });
  });
  