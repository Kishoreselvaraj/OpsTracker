// wwwroot/js/auth/authService.js
import { post } from '../services/apiService.js';

const LOGIN_URL = 'http://localhost:5085/api/Login';

export async function login(email, password) {
    return await post(LOGIN_URL, { email, password });
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