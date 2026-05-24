import { getApiBaseUrl } from '../config.js';
import { apiPost } from '../services/apiClient.js';
import { homePathForRole } from '../utils/roleHelpers.js';

export async function login(email, password) {
    return apiPost('/api/Login', { email, password }, { auth: false });
}

export function storeToken(token) {
    sessionStorage.setItem('jwtToken', token);
}

export function getToken() {
    return sessionStorage.getItem('jwtToken');
}

export function clearToken() {
    sessionStorage.removeItem('jwtToken');
}

export function storeUser(user) {
    sessionStorage.setItem('userData', JSON.stringify(user));
}

export function getUser() {
    const data = sessionStorage.getItem('userData');
    return data ? JSON.parse(data) : null;
}

export function clearUser() {
    sessionStorage.removeItem('userData');
}

export function logout() {
    clearToken();
    clearUser();
    window.location.href = '/Login';
}

export function redirectAfterLogin(user, returnUrl) {
    if (returnUrl && !returnUrl.toLowerCase().includes('/login')) {
        window.location.href = returnUrl;
        return;
    }
    window.location.href = homePathForRole(user?.role);
}
