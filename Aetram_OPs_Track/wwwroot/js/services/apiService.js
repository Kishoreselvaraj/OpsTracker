// wwwroot/js/services/apiService.js
import { getToken } from '/js/auth/authService.js';

// const BASE_URL = 'http://localhost:5085';
const BASE_URL = 'http://10.107.20.246:5000';

// Generic POST (no auth by default)
export async function post(url, data, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
    const response = await fetch(fullUrl, {
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
    const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
    const response = await fetch(fullUrl, {
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
    const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
    const response = await fetch(fullUrl, {
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
    const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
    const response = await fetch(fullUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw { status: response.status, ...result };
    }
    return result;
}

// Authenticated DELETE
export async function deleteWithAuth(url, data = null) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const opts = {
        method: 'DELETE',
        headers
    };
    if (data) opts.body = JSON.stringify(data);
    const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
    const response = await fetch(fullUrl, opts);
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw { status: response.status, ...result };
    }
    return result;
}