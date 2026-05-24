import { apiPost, unwrap } from './apiClient.js';

export async function listNotifications(unreadOnly = false, pageNumber = 1, pageSize = 20) {
    const json = await apiPost('/api/Notification/list', { unreadOnly, pageNumber, pageSize });
    const { data } = unwrap(json);
    return Array.isArray(data) ? data : [];
}

export async function markRead(notificationId) {
    const json = await apiPost('/api/Notification/mark-read', { notificationId });
    return unwrap(json);
}

export async function markAllRead() {
    const json = await apiPost('/api/Notification/mark-all-read', {});
    return unwrap(json);
}
