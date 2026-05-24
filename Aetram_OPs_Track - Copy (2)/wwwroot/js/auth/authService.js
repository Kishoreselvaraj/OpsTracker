// wwwroot/js/auth/authService.js
const BASE_URL = 'http://localhost:5085';

const LOGIN_URL = BASE_URL + '/api/Login';

export async function login(email, password) {
    const response = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw { status: response.status, ...result };
    }
    return result;
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
    window.location.href = '/';
}