import { requireAuth } from '../auth/routeGuard.js';
import { getUser } from '../auth/authService.js';
import { getMonthlyCalendar } from '../services/workLogService.js';
import { listNotifications, markAllRead } from '../services/notificationService.js';
import { hierarchyApi } from '../hierarchy/hierarchyApi.js';
import { showToast } from '../utils/toast.js';

function formatDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function read(obj, camelName, pascalName, fallback = '') {
    return obj?.[camelName] ?? obj?.[pascalName] ?? fallback;
}

function dateKey(value) {
    return value ? String(value).split('T')[0] : '';
}

function prettyDate(value) {
    const key = dateKey(value);
    if (!key) return '-';

    const date = new Date(`${key}T00:00:00`);
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
    });
}

function parseHours(timeStr) {
    if (!timeStr) return 0;
    if (typeof timeStr === 'number') return timeStr;

    const value = String(timeStr);
    if (!value.includes(':')) return Number(value) || 0;

    const parts = value.split(':');
    return (parseInt(parts[0], 10) || 0) + (parseInt(parts[1], 10) || 0) / 60;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text ?? '';
    return div.innerHTML;
}

function normalizeStatus(status) {
    const raw = String(status || 'DRAFT').trim().toUpperCase();
    if (raw.includes('CORRECTION')) return 'CORRECTION';
    return raw || 'DRAFT';
}

function statusLabel(status) {
    const map = {
        APPROVED: 'Approved',
        PENDING: 'Pending',
        REJECTED: 'Rejected',
        CORRECTION: 'Correction',
        DRAFT: 'Draft'
    };
    return map[normalizeStatus(status)] || 'Draft';
}

function statusBadge(status) {
    const s = normalizeStatus(status);
    const map = {
        APPROVED: { cls: 's-approved', label: 'Approved' },
        PENDING: { cls: 's-pending', label: 'Pending' },
        REJECTED: { cls: 's-rejected', label: 'Rejected' },
        CORRECTION: { cls: 's-correction', label: 'Correction' },
        DRAFT: { cls: 's-draft', label: 'Not submitted' }
    };
    const m = map[s] || map.DRAFT;
    return `<span class="status-badge ${m.cls}"><span class="status-dot"></span>${m.label}</span>`;
}

function pillFor(key, value) {
    const numericValue = Number(value) || 0;
    const map = {
        weeklyHours: numericValue >= 40
            ? '<span class="stat-pill pill-green">On track</span>'
            : '<span class="stat-pill pill-gold">In progress</span>',
        streak: numericValue > 0
            ? '<span class="stat-pill pill-green">Active</span>'
            : '<span class="stat-pill pill-gold">Start today</span>',
        pendingReview: numericValue > 0
            ? '<span class="stat-pill pill-amber">Pending TL</span>'
            : '<span class="stat-pill pill-green">Clear</span>',
        todayStatus: normalizeStatus(value) === 'APPROVED'
            ? '<span class="stat-pill pill-green">Approved</span>'
            : normalizeStatus(value) === 'PENDING'
                ? '<span class="stat-pill pill-amber">Pending TL</span>'
                : '<span class="stat-pill pill-gold">Due today</span>'
    };
    return map[key] || '';
}

function setStat(key, value, pillValue = value) {
    $(`#stat-${key}`).text(value).removeClass('skeleton');
    $(`#pill-${key}`).html(pillFor(key, pillValue));
}

function getDayHours(day) {
    return parseHours(read(day, 'totalWorkHours', 'TotalWorkHours', '00:00'));
}

function getDayTasks(day) {
    const tasks = read(day, 'tasks', 'Tasks', []);
    return Array.isArray(tasks) ? tasks : [];
}

function getDayTaskCount(day) {
    return getDayTasks(day).length;
}

function getDayStatus(day) {
    return normalizeStatus(read(day, 'approvalStatus', 'ApprovalStatus', 'DRAFT'));
}

function calculateCurrentStreak(daysByDate, today) {
    let streak = 0;
    const cursor = new Date(today);

    while (cursor.getMonth() === today.getMonth()) {
        const day = daysByDate.get(formatDateKey(cursor));
        if (!day || getDayHours(day) <= 0) break;

        streak++;
        cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
}

function renderStats(calendarDays, today) {
    const todayStr = formatDateKey(today);
    const daysByDate = new Map(calendarDays.map(day => [dateKey(read(day, 'workDate', 'WorkDate')), day]));
    const weekStart = new Date(today);
    const dayOfWeek = weekStart.getDay() === 0 ? 7 : weekStart.getDay();
    weekStart.setDate(today.getDate() - (dayOfWeek - 1));

    let weekHours = 0;
    let pending = 0;

    calendarDays.forEach(day => {
        const key = dateKey(read(day, 'workDate', 'WorkDate'));
        if (!key) return;

        const dayDate = new Date(`${key}T00:00:00`);
        const status = getDayStatus(day);

        if (status === 'PENDING' || status === 'CORRECTION') pending++;
        if (dayDate >= weekStart && dayDate <= today) weekHours += getDayHours(day);
    });

    const todayStatus = getDayStatus(daysByDate.get(todayStr));
    const streak = calculateCurrentStreak(daysByDate, today);

    setStat('weeklyHours', weekHours.toFixed(1), weekHours);
    setStat('streak', streak, streak);
    setStat('pendingReview', pending, pending);
    setStat('todayStatus', statusLabel(todayStatus), todayStatus);
    $('#eod-status').html(statusBadge(todayStatus));
}

function renderTodayEod(calendarDays, today) {
    const todayStr = formatDateKey(today);
    const day = calendarDays.find(d => dateKey(read(d, 'workDate', 'WorkDate')) === todayStr);
    const tasks = getDayTasks(day);

    $('#eod-date').text(`Today's EOD - ${today.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    })}`);

    if (!tasks.length) {
        $('#task-list').html('<div class="task-row" style="color:var(--text-3)">No tasks logged today. <a href="/EodCalander">Open calendar</a></div>');
        $('#eod-total-hours').text('0.0 h');
        return;
    }

    let total = 0;
    const html = tasks.map(task => {
        const hours = parseHours(read(task, 'taskDuration', 'TaskDuration', read(task, 'hoursWorked', 'HoursWorked', '00:00')));
        const desc = String(read(task, 'workDescription', 'WorkDescription', '')).replace(/^\*\*(.+?)\*\*\s*\n\n/, '');
        total += hours;

        return `
            <div class="task-row">
                <span class="task-tag">${escapeHtml(read(task, 'groupName', 'GroupName', 'Work'))}</span>
                <span class="task-name">${escapeHtml(desc.substring(0, 80))}</span>
                <span class="task-hours">${hours.toFixed(1)}h</span>
            </div>`;
    }).join('');

    $('#task-list').html(html);
    $('#eod-total-hours').text(`${total.toFixed(1)} h`);
}

function renderWeek(calendarDays, today) {
    const todayStr = formatDateKey(today);
    const daysByDate = new Map(calendarDays.map(day => [dateKey(read(day, 'workDate', 'WorkDate')), day]));
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay();

    const weekBars = labels.map((label, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (dayOfWeek - 1) + i);

        const key = formatDateKey(d);
        const day = daysByDate.get(key);
        const hours = day ? getDayHours(day) : null;
        const state = key === todayStr ? 'today' : hours ? 'done' : 'missing';
        const displayHours = hours != null ? hours.toFixed(1) : '-';
        const fillHeight = hours ? Math.min((hours / 8) * 100, 100) : 4;

        return `
            <div class="week-bar ${state}">
                <div class="wb-fill" style="height:${fillHeight}%"></div>
                <div class="wb-label">${label}</div>
                <div class="wb-hours">${displayHours}</div>
            </div>`;
    }).join('');

    $('#week-bars').html(weekBars);
}

function getLatestTask(calendarDays) {
    return [...calendarDays]
        .sort((a, b) => dateKey(read(b, 'workDate', 'WorkDate')).localeCompare(dateKey(read(a, 'workDate', 'WorkDate'))))
        .flatMap(day => getDayTasks(day))
        .find(task => read(task, 'groupId', 'GroupId', 0) || read(task, 'groupName', 'GroupName', ''));
}

async function resolveUserDetails(user, calendarDays) {
    const latestTask = getLatestTask(calendarDays);
    const groupId = read(latestTask, 'groupId', 'GroupId', user?.groupId ?? user?.GroupId ?? null);
    const subGroupId = read(latestTask, 'subGroupId', 'SubGroupId', user?.subGroupId ?? user?.SubGroupId ?? null);

    const details = {
        department: user?.departmentName || user?.DepartmentName || user?.department || '-',
        taskGroup: user?.groupName || user?.GroupName || user?.taskGroup || read(latestTask, 'groupName', 'GroupName', ''),
        subGroup: user?.subGroupName || user?.SubGroupName || user?.subGroup || read(latestTask, 'subGroupName', 'SubGroupName', ''),
        teamLead: user?.teamLeadName || user?.TeamLeadName || user?.teamLead || '-'
    };

    try {
        const [groups, subGroup] = await Promise.all([
            hierarchyApi.listTaskGroups(user?.departmentId || user?.DepartmentId || null).catch(() => []),
            subGroupId ? hierarchyApi.getSubGroup(subGroupId).catch(() => null) : Promise.resolve(null)
        ]);

        const group = (groups || []).find(item => {
            const itemId = read(item, 'groupId', 'GroupId', null);
            const itemName = read(item, 'groupName', 'GroupName', '');
            return (groupId && Number(itemId) === Number(groupId)) ||
                (details.taskGroup && itemName === details.taskGroup);
        });

        if (group) {
            details.department = read(group, 'departmentName', 'DepartmentName', details.department) || details.department;
            details.taskGroup = read(group, 'groupName', 'GroupName', details.taskGroup) || details.taskGroup;
            details.teamLead = read(group, 'teamLeadName', 'TeamLeadName', details.teamLead) || details.teamLead;
        }

        if (subGroup) {
            details.subGroup = read(subGroup, 'subGroupName', 'SubGroupName', details.subGroup) || details.subGroup;
        }
    } catch {
        // Calendar/user data still gives us useful assignment details when hierarchy APIs are unavailable.
    }

    return details;
}

function renderMonthlySubmissionRate(calendarDays, today) {
    const elapsedWorkDays = [];
    const submittedDays = [];

    for (let d = new Date(today.getFullYear(), today.getMonth(), 1); d <= today; d.setDate(d.getDate() + 1)) {
        const day = d.getDay();
        if (day !== 0 && day !== 6) elapsedWorkDays.push(formatDateKey(d));
    }

    const submitted = new Set(
        calendarDays
            .filter(day => getDayHours(day) > 0 || getDayTaskCount(day) > 0)
            .map(day => dateKey(read(day, 'workDate', 'WorkDate')))
    );

    elapsedWorkDays.forEach(key => {
        if (submitted.has(key)) submittedDays.push(key);
    });

    const rate = elapsedWorkDays.length
        ? Math.round((submittedDays.length / elapsedWorkDays.length) * 100)
        : 0;

    $('#submission-rate-pct').text(`${rate}%`);
    $('#submission-rate-bar').css('width', `${rate}%`);
}

async function renderUserDetails(user, calendarDays, today) {
    const details = await resolveUserDetails(user, calendarDays);

    $('#user-dept').text(details.department || '-');
    $('#user-taskgroup').text(details.taskGroup || '-');
    $('#user-subgroup').text(details.subGroup || '-');
    $('#user-lead').text(details.teamLead || '-');
    $('#user-empcode').text(user?.employeeCode || user?.EmployeeCode || '-');
    renderMonthlySubmissionRate(calendarDays, today);
}

function renderRecentSubmissions(calendarDays) {
    const submissions = [...calendarDays]
        .filter(day => getDayHours(day) > 0 || getDayTaskCount(day) > 0)
        .sort((a, b) => dateKey(read(b, 'workDate', 'WorkDate')).localeCompare(dateKey(read(a, 'workDate', 'WorkDate'))))
        .slice(0, 5);

    if (!submissions.length) {
        $('#submissions-list').html('<div class="history-row" style="color:var(--text-3)">No recent submissions</div>');
        return;
    }

    $('#submissions-list').html(submissions.map(day => {
        const taskCount = getDayTaskCount(day);
        const hours = getDayHours(day);
        const status = getDayStatus(day);
        const taskLabel = `${taskCount} task${taskCount === 1 ? '' : 's'}`;

        return `
            <div class="history-row">
                <span class="history-date">${escapeHtml(prettyDate(read(day, 'workDate', 'WorkDate')))}</span>
                <span class="history-desc">${escapeHtml(taskLabel)}</span>
                <span class="history-hours">${hours.toFixed(1)}h</span>
                ${statusBadge(status)}
            </div>`;
    }).join(''));
}

async function loadNotifications() {
    try {
        const items = await listNotifications(true, 1, 8);
        if (!items.length) {
            $('#notif-list').html('<div class="notif-item" style="color:var(--text-3)">No new notifications</div>');
            return;
        }

        $('#notif-list').html(items.map(n => {
            const title = read(n, 'title', 'Title', '');
            const msg = read(n, 'message', 'Message', '');
            return `<div class="notif-item"><div class="notif-msg"><strong>${escapeHtml(title)}</strong> ${escapeHtml(msg)}</div></div>`;
        }).join(''));
    } catch {
        $('#notif-list').html('<div class="notif-item">Unable to load notifications</div>');
    }
}

$(async function () {
    if (!requireAuth({ allowRoles: ['Member', 'TeamLead', 'DepartmentHead', 'Admin'] })) return;

    const user = getUser();
    const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User';
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    $('#user-name').text(name);
    $('#user-empcode').text(user?.employeeCode || '-');
    $('#dash-date').text(today.toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    }));

    // One live calendar request drives the KPI cards, today's task list, and week chart.
    // getMonthlyCalendar normalizes the API's flat task rows into day objects with tasks[].
    try {
        const calendarDays = await getMonthlyCalendar(today.getMonth() + 1, today.getFullYear());
        renderStats(calendarDays, today);
        renderTodayEod(calendarDays, today);
        renderWeek(calendarDays, today);
        renderRecentSubmissions(calendarDays);
        renderUserDetails(user, calendarDays, today);
    } catch (e) {
        ['weeklyHours', 'streak', 'pendingReview', 'todayStatus'].forEach(key => setStat(key, '-'));
        $('#task-list').html('<div class="task-row">Unable to load today\'s tasks</div>');
        $('#week-bars').html('');
        $('#submissions-list').html('<div class="history-row">Unable to load submissions</div>');
        showToast('Could not load dashboard stats', 'error');
    }

    loadNotifications();

    $('#btn-submit-eod').on('click', () => { window.location.href = '/EodCalander'; });
    $('#btn-save-draft').on('click', () => { window.location.href = '/EodCalander'; });
    $('.panel-action').first().on('click', () => { window.location.href = '/EodCalander'; });

    $('#btn-mark-all-read').on('click', async () => {
        try {
            await markAllRead();
            showToast('All notifications marked read', 'success');
            loadNotifications();
        } catch {
            showToast('Failed to mark notifications', 'error');
        }
    });
});
