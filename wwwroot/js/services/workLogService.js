import { apiPost, unwrap } from './apiClient.js';

function pick(obj, camelName, pascalName, fallback = null) {
    return obj?.[camelName] ?? obj?.[pascalName] ?? fallback;
}

function toDateKey(value) {
    if (!value) return '';
    return String(value).split('T')[0];
}

function hasTaskData(row) {
    return !!(
        pick(row, 'workLogId', 'WorkLogId', 0) ||
        pick(row, 'workDescription', 'WorkDescription', '') ||
        pick(row, 'taskDuration', 'TaskDuration', '') ||
        pick(row, 'groupId', 'GroupId', 0)
    );
}

function normalizeTask(task, dayApprovalStatus = 'DRAFT') {
    return {
        workLogId: pick(task, 'workLogId', 'WorkLogId', 0),
        groupId: pick(task, 'groupId', 'GroupId', 0),
        groupName: pick(task, 'groupName', 'GroupName', ''),
        subGroupId: pick(task, 'subGroupId', 'SubGroupId', null),
        subGroupName: pick(task, 'subGroupName', 'SubGroupName', ''),
        taskDuration: pick(task, 'taskDuration', 'TaskDuration', '00:00'),
        hoursWorked: pick(task, 'hoursWorked', 'HoursWorked', pick(task, 'taskDuration', 'TaskDuration', '00:00')),
        workStatus: pick(task, 'workStatus', 'WorkStatus', ''),
        approvalStatus: pick(task, 'approvalStatus', 'ApprovalStatus', dayApprovalStatus),
        workDescription: pick(task, 'workDescription', 'WorkDescription', '')
    };
}

function normalizeMonthlyCalendar(rows) {
    if (!Array.isArray(rows)) return [];

    const daysByDate = new Map();

    rows.forEach(row => {
        const workDate = pick(row, 'workDate', 'WorkDate', '');
        const dateKey = toDateKey(workDate);
        if (!dateKey) return;

        if (!daysByDate.has(dateKey)) {
            const tasks = pick(row, 'tasks', 'Tasks', []);
            const approvalStatus = pick(row, 'approvalStatus', 'ApprovalStatus', 'DRAFT');

            daysByDate.set(dateKey, {
                workflowLogDateId: pick(row, 'workflowLogDateId', 'WorkflowLogDateId', 0),
                workDate,
                day: pick(row, 'day', 'Day', null),
                dayName: pick(row, 'dayName', 'DayName', ''),
                isCurrentMonth: pick(row, 'isCurrentMonth', 'IsCurrentMonth', true),
                totalWorkHours: pick(row, 'totalWorkHours', 'TotalWorkHours', '00:00'),
                standardHours: pick(row, 'standardHours', 'StandardHours', '00:00'),
                extraHours: pick(row, 'extraHours', 'ExtraHours', '00:00'),
                entryStatus: pick(row, 'entryStatus', 'EntryStatus', ''),
                approvalStatus,
                approvalBy: pick(row, 'approvalBy', 'ApprovalBy', null),
                reasonForReject: pick(row, 'reasonForReject', 'ReasonForReject', null),
                tasks: Array.isArray(tasks) ? tasks.map(task => normalizeTask(task, approvalStatus)) : []
            });
        }

        const day = daysByDate.get(dateKey);
        if (!hasTaskData(row) || Array.isArray(pick(row, 'tasks', 'Tasks'))) return;

        day.tasks.push(normalizeTask({
            ...row,
            approvalStatus: pick(row, 'taskApprovalStatus', 'TaskApprovalStatus', pick(row, 'approvalStatus', 'ApprovalStatus', 'DRAFT'))
        }, day.approvalStatus));
    });

    return [...daysByDate.values()].sort((a, b) => toDateKey(a.workDate).localeCompare(toDateKey(b.workDate)));
}

export async function getMonthlyCalendar(month, year) {
    const json = await apiPost('/api/WorkLog/monthly-calendar', { month, year });
    const { data } = unwrap(json);
    const rows = Array.isArray(data) ? data : data?.calendarData ?? data?.CalendarData ?? [];
    return normalizeMonthlyCalendar(rows);
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
