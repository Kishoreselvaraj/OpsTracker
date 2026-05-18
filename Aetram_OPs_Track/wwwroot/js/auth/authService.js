// wwwroot/js/auth/authService.js
import { post } from '../services/apiService.js';

const LOGIN_URL = '/api/auth/login';

export async function login(username, password) {
    return await post(LOGIN_URL, { username, password });
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
