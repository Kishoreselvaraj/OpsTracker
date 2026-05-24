import { getApiBaseUrl } from '../config.js';
import { getToken, clearToken, clearUser } from '../auth/authService.js';

function buildUrl(path) {
    if (path.startsWith('http')) return path;
    const base = getApiBaseUrl();
    return `${base}${path.startsWith('/') ? path : '/' + path}`;
}

function authHeaders(extra = {}) {
    const headers = { 'Content-Type': 'application/json', ...extra };
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

/** Normalize API envelope (PascalCase / camelCase). */
export function unwrap(json) {
    if (json == null) return json;
    const data = json.Data ?? json.data ?? json;
    const statusCode = json.StatusCode ?? json.statusCode ?? 200;
    const message = json.Message ?? json.message ?? '';
    return { data, statusCode, message, raw: json };
}

async function parseResponse(response) {
    const json = await response.json().catch(() => ({}));
    if (response.status === 401) {
        clearToken();
        clearUser();
        const path = window.location.pathname.toLowerCase();
        if (!path.includes('/login')) {
            window.location.href = '/Login';
        }
    }
    if (!response.ok) {
        const { message, statusCode } = unwrap(json);
        throw {
            status: response.status,
            statusCode: statusCode || response.status,
            message: message || response.statusText,
            ...json
        };
    }
    return json;
}

export async function apiGet(path, { auth = true } = {}) {
    const headers = auth ? authHeaders() : { 'Content-Type': 'application/json' };
    const response = await fetch(buildUrl(path), { method: 'GET', headers });
    return parseResponse(response);
}

export async function apiPost(path, body, { auth = true, token = null } = {}) {
    const headers = auth
        ? authHeaders(token ? { Authorization: `Bearer ${token}` } : {})
        : { 'Content-Type': 'application/json' };
    const response = await fetch(buildUrl(path), {
        method: 'POST',
        headers,
        body: JSON.stringify(body ?? {})
    });
    return parseResponse(response);
}

export async function apiDelete(path, body = null, { auth = true } = {}) {
    const opts = { method: 'DELETE', headers: auth ? authHeaders() : { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const response = await fetch(buildUrl(path), opts);
    return parseResponse(response);
}
