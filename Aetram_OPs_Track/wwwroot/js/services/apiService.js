// wwwroot/js/services/apiService.js
import { getToken } from '../auth/authService.js';

const BASE_URL = 'http://localhost:5085';

// Generic POST (no auth by default)
export async function post(url, data, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(url.startsWith('http') ? url : `${BASE_URL}${url}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw { status: response.status, ...result };
    }
    return result;
}

// Authenticated POST — auto-attaches JWT from sessionStorage
export async function postWithAuth(url, data) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(url.startsWith('http') ? url : `${BASE_URL}${url}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw { status: response.status, ...result };
    }
    return result;
}

// Authenticated GET — auto-attaches JWT from sessionStorage
export async function getWithAuth(url) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(url.startsWith('http') ? url : `${BASE_URL}${url}`, {
        method: 'GET',
        headers
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw { status: response.status, ...result };
    }
    return result;
}

// Generic GET (no auth)
export async function get(url) {
    const response = await fetch(url.startsWith('http') ? url : `${BASE_URL}${url}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw { status: response.status, ...result };
    }
    return result;
}