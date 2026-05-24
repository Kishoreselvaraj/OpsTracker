import { apiGet, apiPost, unwrap } from './apiClient.js';

export async function submitEod(eodId) {
    const json = await apiPost('/api/Eod/submit', { eodId });
    return unwrap(json);
}

export async function approveEod(eodId, comments = null) {
    const json = await apiPost('/api/Eod/approve', { eodId, comments });
    return unwrap(json);
}

export async function rejectEod(eodId, comments = null) {
    const json = await apiPost('/api/Eod/reject', { eodId, comments });
    return unwrap(json);
}

export async function requestEodCorrection(eodId, comments = null) {
    const json = await apiPost('/api/Eod/request-correction', { eodId, comments });
    return unwrap(json);
}

export async function listEods(filters = {}) {
    const json = await apiPost('/api/Eod/list', filters);
    const { data } = unwrap(json);
    return Array.isArray(data) ? data : [];
}

export async function getEodHistory(eodId) {
    const json = await apiGet(`/api/Eod/${eodId}/history`);
    const { data } = unwrap(json);
    return Array.isArray(data) ? data : [];
}
