/**
 * Backward-compatible API helpers — delegates to apiClient.
 */
import { apiGet, apiPost, apiDelete, unwrap } from './apiClient.js';
import { getToken } from '../auth/authService.js';

export { unwrap };

export async function post(url, data, token = null) {
    const json = await apiPost(url, data, { auth: !!token, token: token || undefined });
    return json;
}

export async function postWithAuth(url, data) {
    return apiPost(url, data);
}

export async function getWithAuth(url) {
    return apiGet(url);
}

export async function get(url) {
    return apiGet(url, { auth: false });
}

export async function deleteWithAuth(url, data = null) {
    if (data) return apiDelete(url, data);
    return apiDelete(url);
}

export function ensureAuthenticated() {
    if (!getToken()) {
        window.location.href = '/Login';
        return false;
    }
    return true;
}
