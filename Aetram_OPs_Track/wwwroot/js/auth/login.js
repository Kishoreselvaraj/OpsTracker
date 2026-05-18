// wwwroot/js/auth/login.js
import { login, storeToken } from './authService.js';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErrors();

        const username = form.username.value.trim();
        const password = form.password.value;

        let valid = true;
        if (!username) {
            showError('usernameError', 'Username is required');
            valid = false;
        }
        if (!password) {
            showError('passwordError', 'Password is required');
            valid = false;
        }
        if (!valid) return;

        try {
            setLoading(true);
            const result = await login(username, password);
            if (result.status && result.token) {
                storeToken(result.token);
                window.location.href = '/Dashboard'; // or your home page
            } else {
                showError('loginError', result.message || 'Login failed');
            }
        } catch (err) {
            if (err.status === 401) {
                showError('loginError', 'Invalid username or password');
            } else if (err.status >= 500) {
                showError('loginError', 'Server error. Please try again later.');
            } else {
                showError('loginError', 'Network error. Please check your connection.');
            }
        } finally {
            setLoading(false);
        }
    });
});

function showError(id, message) {
    document.getElementById(id).textContent = message;
}
function clearErrors() {
    showError('usernameError', '');
    showError('passwordError', '');
    showError('loginError', '');
}
function setLoading(isLoading) {
    document.getElementById('loginBtn').disabled = isLoading;
}
