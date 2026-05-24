import { apiPost, unwrap } from './apiClient.js';

export async function getMonthlyCalendar(month, year) {
    const json = await apiPost('/api/WorkLog/monthly-calendar', { month, year });
    const { data } = unwrap(json);
    if (Array.isArray(data)) return data;
    return data?.calendarData ?? data?.CalendarData ?? [];
}

export async function saveWorkLog(payload) {
    const json = await apiPost('/api/WorkLog/save', payload);
    return { ...unwrap(json), raw: json };
}

export async function deleteWorkLog(workLogId) {
    const json = await apiPost('/api/WorkLog/delete', { workLogId });
    return unwrap(json);
}

export async function getApprovalList(filterType = 'PENDING', fromDate = null, toDate = null) {
    const json = await apiPost('/api/WorkLog/approval-list', {
        filterType,
        fromDate,
        toDate
    });
    const { data } = unwrap(json);
    return Array.isArray(data) ? data : [];
}

export async function approveRejectTask(workLogId, approvalStatus, rejectReason = '') {
    const json = await apiPost('/api/WorkLog/approve-reject-task', {
        workLogId,
        approvalStatus,
        rejectReason
    });
    return unwrap(json);
}
