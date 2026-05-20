// wwwroot/js/auth/login.js
import { login, storeToken, storeUser } from './authService.js';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    const toggleBtn = document.getElementById('togglePassword');

    // Toggle password visibility (from login(1).js)
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function () {
            const passwordInput = document.getElementById('passwordInput');
            const isPressed = this.getAttribute('aria-pressed') === 'true';
            const type = isPressed ? 'password' : 'text';
            passwordInput.setAttribute('type', type);
            this.setAttribute('aria-pressed', !isPressed);
            const icon = this.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-eye');
                icon.classList.toggle('fa-eye-slash');
            }
        });
    }

    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErrors();

        const email = form.email.value.trim();
        const password = form.password.value;

        let valid = true;
        if (!email) {
            showError('usernameError', 'Email is required');
            valid = false;
        }
        if (!password) {
            showError('passwordError', 'Password is required');
            valid = false;
        }
        if (!valid) return;

        try {
            setLoading(true);
            const result = await login(email, password);
            if (result.statusCode === 200 && result.token) {
                storeToken(result.token);
                storeUser({
                    userId: result.userId,
                    employeeCode: result.employeeCode,
                    firstName: result.firstName,
                    lastName: result.lastName,
                    email: result.email,
                    role: result.role,
                    designation: result.designation
                });
                window.location.href = '/Dashboard/index';
            } else {
                showError('loginError', result.message || 'Login failed');
            }
        } catch (err) {
            if (err.status === 401) {
                showError('loginError', 'Invalid email or password');
            } else if (err.status >= 500) {
                showError('loginError', 'Server error. Please try again later.');
            } else {
                showError('loginError', err.message || 'Network error. Please check your connection.');
            }
        } finally {
            setLoading(false);
        }
    });
});

function showError(id, message) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = message;
        el.style.display = message ? 'block' : 'none';
    }
}

function clearErrors() {
    showError('usernameError', '');
    showError('passwordError', '');
    showError('loginError', '');
}

function setLoading(isLoading) {
    const btn = document.getElementById('loginBtn');
    const btnText = document.getElementById('btnText');
    const btnLoader = document.getElementById('btnLoader');
    if (btn) btn.disabled = isLoading;
    if (btnText) btnText.textContent = isLoading ? 'Signing in...' : 'Sign In';
    if (btnLoader) btnLoader.classList.toggle('d-none', !isLoading);
}