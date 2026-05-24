import { requireAuth } from '../auth/routeGuard.js';
import { getUser } from '../auth/authService.js';
import { getMonthlyCalendar } from '../services/workLogService.js';
import { listEods } from '../services/eodService.js';
import { listNotifications, markAllRead } from '../services/notificationService.js';
import { showToast } from '../utils/toast.js';

function parseHours(timeStr) {
    if (!timeStr) return 0;
    if (typeof timeStr === 'number') return timeStr;
    const parts = String(timeStr).split(':');
    return (parseInt(parts[0], 10) || 0) + (parseInt(parts[1], 10) || 0) / 60;
}

function statusBadge(status) {
    const s = (status || 'draft').toLowerCase();
    const map = {
        approved: { cls: 's-approved', label: 'Approved' },
        pending: { cls: 's-pending', label: 'Pending' },
        rejected: { cls: 's-rejected', label: 'Rejected' },
        'correction required': { cls: 's-correction', label: 'Correction' },
        correction: { cls: 's-correction', label: 'Correction' },
        draft: { cls: 's-draft', label: 'Not submitted' }
    };
    const m = map[s] || map.draft;
    return `<span class="status-badge ${m.cls}"><span class="status-dot"></span>${m.label}</span>`;
}

$(function () {
    if (!requireAuth({ allowRoles: ['Member', 'TeamLead', 'DepartmentHead', 'Admin'] })) return;

    const user = getUser();
    const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User';
    $('#user-name').text(name);
    $('#user-empcode').text(user?.employeeCode || '—');
    $('#dash-date').text(new Date().toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }));

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    async function loadStats() {
        try {
            const cal = await getMonthlyCalendar(today.getMonth() + 1, today.getFullYear());
            let weekHours = 0;
            let streak = 0;
            let pending = 0;
            let todayStatus = 'Draft';

            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay() + 1);

            (cal || []).forEach(day => {
                const d = (day.workDate || day.WorkDate || '').toString().split('T')[0];
                const hours = parseHours(day.totalWorkHours || day.TotalWorkHours);
                const appr = (day.approvalStatus || day.ApprovalStatus || '').toUpperCase();
                if (d === todayStr) todayStatus = appr || 'DRAFT';
                if (appr === 'PENDING') pending++;
                const dayDate = new Date(d);
                if (dayDate >= weekStart && dayDate <= today) weekHours += hours;
                if (hours > 0 && dayDate <= today) streak++;
            });

            $('#stat-weeklyHours').text(weekHours.toFixed(1));
            $('#stat-streak').text(streak);
            $('#stat-pendingReview').text(pending);
            $('#stat-todayStatus').text(todayStatus);
            $('#eod-status').html(statusBadge(todayStatus));
        } catch (e) {
            showToast('Could not load dashboard stats', 'error');
        }
    }

    async function loadTodayEod() {
        try {
            const cal = await getMonthlyCalendar(today.getMonth() + 1, today.getFullYear());
            const day = (cal || []).find(d => (d.workDate || d.WorkDate || '').toString().startsWith(todayStr));
            const tasks = day?.tasks || day?.Tasks || [];
            $('#eod-date').text(`Today's EOD — ${today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`);

            if (!tasks.length) {
                $('#task-list').html('<div class="task-row" style="color:var(--text-3)">No tasks logged today. <a href="/EodCalander">Open calendar</a></div>');
                $('#eod-total-hours').text('0.0 h');
                return;
            }

            let total = 0;
            const html = tasks.map(t => {
                const h = parseHours(t.taskDuration || t.TaskDuration);
                total += h;
                const desc = (t.workDescription || t.WorkDescription || '').replace(/^\*\*(.+?)\*\*\s*\n\n/, '');
                return `<div class="task-row"><span class="task-tag">${t.groupName || t.GroupName || 'Work'}</span><span class="task-name">${desc.substring(0, 80)}</span><span class="task-hours">${h.toFixed(1)}h</span></div>`;
            }).join('');
            $('#task-list').html(html);
            $('#eod-total-hours').text(`${total.toFixed(1)} h`);
        } catch {
            $('#task-list').html('<div class="task-row">Unable to load today\'s tasks</div>');
        }
    }

    async function loadRecentEods() {
        try {
            const from = new Date();
            from.setDate(from.getDate() - 14);
            const list = await listEods({
                userId: user?.userId,
                fromDate: from.toISOString().split('T')[0],
                toDate: todayStr
            });
            if (!list.length) {
                $('#submissions-list').html('<div class="history-row" style="color:var(--text-3)">No recent submissions</div>');
                return;
            }
            $('#submissions-list').html(list.slice(0, 5).map(e => {
                const d = (e.eodDate || e.EodDate || '').toString().split('T')[0];
                const st = (e.approvalStatus || e.ApprovalStatus || 'draft').toLowerCase();
                return `<div class="history-row"><span>${d}</span><span>${(e.totalHours || 0)}h</span>${statusBadge(st)}</div>`;
            }).join(''));
        } catch {
            $('#submissions-list').html('<div class="history-row">Unable to load submissions</div>');
        }
    }

    async function loadNotifications() {
        try {
            const items = await listNotifications(true, 1, 8);
            if (!items.length) {
                $('#notif-list').html('<div class="notif-item" style="color:var(--text-3)">No new notifications</div>');
                return;
            }
            $('#notif-list').html(items.map(n => {
                const title = n.title ?? n.Title ?? '';
                const msg = n.message ?? n.Message ?? '';
                return `<div class="notif-item"><div class="notif-msg"><strong>${title}</strong> ${msg}</div></div>`;
            }).join(''));
        } catch {
            $('#notif-list').html('<div class="notif-item">Unable to load notifications</div>');
        }
    }

    async function loadWeek() {
        try {
            const cal = await getMonthlyCalendar(today.getMonth() + 1, today.getFullYear());
            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            const weekBars = days.map((label, i) => {
                const d = new Date(today);
                const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay();
                d.setDate(d.getDate() - (dayOfWeek - 1) + i);
                const ds = d.toISOString().split('T')[0];
                const day = (cal || []).find(x => (x.workDate || x.WorkDate || '').toString().startsWith(ds));
                const hours = day ? parseHours(day.totalWorkHours || day.TotalWorkHours) : null;
                const state = ds === todayStr ? 'today' : hours ? 'done' : d < today ? 'missing' : 'missing';
                const h = hours != null ? hours.toFixed(1) : '—';
                return `<div class="week-bar ${state}"><div class="wb-fill" style="height:${hours ? Math.min(hours / 8 * 100, 100) : 4}%"></div><div class="wb-label">${label}</div><div class="wb-hours">${h}</div></div>`;
            }).join('');
            $('#week-bars').html(weekBars);
        } catch {
            $('#week-bars').html('');
        }
    }

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

    loadStats();
    loadTodayEod();
    loadRecentEods();
    loadNotifications();
    loadWeek();
});
