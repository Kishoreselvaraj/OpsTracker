/* ============================================================
   Aetram OpsTracker — Team Lead Dashboard Page JS
   jQuery + AJAX with demo data fallback
   ============================================================ */

import { getWithAuth } from '/js/services/apiService.js';
import { unwrap } from '/js/services/apiClient.js';
import { getUser } from '/js/auth/authService.js';
import { requireAuth } from '/js/auth/routeGuard.js';
import { getApprovalList } from '/js/services/workLogService.js';
import { listEods } from '/js/services/eodService.js';
import { showToast } from '/js/utils/toast.js';

$(function () {

    /* ── API Config ───────────────────────────────────────── */
    const API = {
        dashboardSummary: '/api/tl/dashboard-summary',
        todaySnapshot: '/api/tl/today-snapshot',
        teamPulse: '/api/tl/team-pulse',
        weeklyTrend: '/api/tl/weekly-trend',
        stats: '/api/tl/stats'
    };

    /* ── Demo Data ────────────────────────────────────────── */
    const DEMO = {
        teamLead: {
            userId: 2,
            name: "Priya Sharma",
            employeeCode: "EMP-00101"
        },
        stats: {
            pending: 8,
            approved: 45,
            rejected: 3,
            correction: 2
        },
        alerts: [
            {
                type: 'urgent',
                icon: '⏳',
                title: '8 EODs Pending Review',
                text: 'Submissions from Rahul K., Amit V., and 6 others awaiting approval',
                action: 'Review Now',
                link: '/tl/approvals?status=PENDING'
            },
            {
                type: 'warning',
                icon: '⚠️',
                title: '2 Corrections Requested',
                text: 'Sunita P. and Vikram R. have not resubmitted corrected EODs',
                action: 'Follow Up',
                link: '/tl/approvals?status=CORRECTION'
            },
            {
                type: 'info',
                icon: '👤',
                title: '3 Members Missing Today\'s Submission',
                text: 'Neha G., Arun J., and Deepa N. have not logged hours for May 21',
                action: 'View Team',
                link: '/tl/team'
            }
        ],
        todaySnapshot: [
            {
                workLogId: 101,
                memberName: "Rahul Kumar",
                employeeCode: "EMP-00412",
                hoursWorked: 8.5,
                approvalStatus: "PENDING",
                subGroupName: "Backend"
            },
            {
                workLogId: 102,
                memberName: "Amit Verma",
                employeeCode: "EMP-00415",
                hoursWorked: 7.0,
                approvalStatus: "PENDING",
                subGroupName: "Manual Testing"
            },
            {
                workLogId: 103,
                memberName: "Sunita Patel",
                employeeCode: "EMP-00420",
                hoursWorked: 9.0,
                approvalStatus: "APPROVED",
                subGroupName: "Frontend"
            },
            {
                workLogId: 104,
                memberName: "Vikram Rao",
                employeeCode: "EMP-00425",
                hoursWorked: 6.5,
                approvalStatus: "CORRECTION",
                subGroupName: "Automation"
            },
            {
                workLogId: 105,
                memberName: "Neha Gupta",
                employeeCode: "EMP-00430",
                hoursWorked: 8.0,
                approvalStatus: "APPROVED",
                subGroupName: "CI/CD"
            }
        ],
        teamPulse: [
            { userId: 1, name: "Rahul Kumar", code: "EMP-00412", hoursWorked: 8.5, status: "pending", subGroup: "Backend" },
            { userId: 3, name: "Amit Verma", code: "EMP-00415", hoursWorked: 7.0, status: "pending", subGroup: "Manual Testing" },
            { userId: 4, name: "Sunita Patel", code: "EMP-00420", hoursWorked: 9.0, status: "submitted", subGroup: "Frontend" },
            { userId: 5, name: "Vikram Rao", code: "EMP-00425", hoursWorked: 6.5, status: "correction", subGroup: "Automation" },
            { userId: 6, name: "Neha Gupta", code: "EMP-00430", hoursWorked: 8.0, status: "submitted", subGroup: "CI/CD" },
            { userId: 7, name: "Ravi Mehta", code: "EMP-00435", hoursWorked: 0, status: "missing", subGroup: "Backend" },
            { userId: 8, name: "Kiran Shah", code: "EMP-00440", hoursWorked: 0, status: "missing", subGroup: "Frontend" },
            { userId: 9, name: "Deepa Nair", code: "EMP-00445", hoursWorked: 8.5, status: "submitted", subGroup: "Manual Testing" }
        ],
        weeklyTrend: [
            { day: 'Mon', date: '05-15', submitted: 6, pending: 2 },
            { day: 'Tue', date: '05-16', submitted: 7, pending: 1 },
            { day: 'Wed', date: '05-17', submitted: 5, pending: 3 },
            { day: 'Thu', date: '05-18', submitted: 8, pending: 0 },
            { day: 'Fri', date: '05-19', submitted: 7, pending: 1 },
            { day: 'Sat', date: '05-20', submitted: 4, pending: 0 },
            { day: 'Sun', date: '05-21', submitted: 5, pending: 3 }
        ]
    };

    let currentUser = null;

    /* ── Helpers ───────────────────────────────────────────── */
    function formatDate(date) {
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }

    function getGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    }

    function statusLabel(status) {
        const map = {
            'PENDING': 'Pending',
            'APPROVED': 'Approved',
            'REJECTED': 'Rejected',
            'CORRECTION': 'Correction',
            'SUBMITTED': 'Submitted',
            'MISSING': 'Missing'
        };
        return map[status] || status;
    }

    function statusBadgeClass(status) {
        const map = {
            'PENDING': 'pending',
            'APPROVED': 'approved',
            'REJECTED': 'rejected',
            'CORRECTION': 'correction',
            'SUBMITTED': 'submitted',
            'MISSING': 'missing'
        };
        return map[status] || 'pending';
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showToast(msg) {
        $('.toast').remove();
        const $t = $('<div class="toast">').text(msg).appendTo('body');
        setTimeout(() => $t.addClass('show'), 10);
        setTimeout(() => { $t.removeClass('show'); setTimeout(() => $t.remove(), 300); }, 2500);
    }

    /* ── Load User ─────────────────────────────────────────── */
    function loadUser() {
        try {
            currentUser = getUser();
        } catch (e) {
            currentUser = DEMO.teamLead;
        }
        if (currentUser) {
            $('#nav-user-name').text(currentUser.name || 'Team Lead');
        }
    }

    /* ── Set Greeting & Date ───────────────────────────────── */
    function setHeaderInfo() {
        $('#tl-greeting').text(getGreeting());
        $('#current-date').text(formatDate(new Date()));
    }

    /* ── Load & Render Stats ───────────────────────────────── */
    async function loadStats() {
        try {
            const rows = await getApprovalList('ALL', null, null);
            const pending = rows.filter(r => (r.approvalStatus || '').toUpperCase() === 'PENDING').length;
            const approved = rows.filter(r => (r.approvalStatus || '').toUpperCase() === 'APPROVED').length;
            const rejected = rows.filter(r => (r.approvalStatus || '').toUpperCase() === 'REJECTED').length;
            const correction = rows.filter(r => (r.approvalStatus || '').toUpperCase().includes('CORRECTION')).length;
            renderStats({ pending, approved, rejected, correction });
        } catch (err) {
            showToast('Dashboard stats unavailable', 'error');
            renderStats(DEMO.stats);
        }
    }

    function renderStats(stats) {
        $('#stat-pending').text(stats.pending || 0);
        $('#stat-approved').text(stats.approved || 0);
        $('#stat-rejected').text(stats.rejected || 0);
        $('#stat-correction').text(stats.correction || 0);
        $('#quick-pending').text(stats.pending || 0);
    }

    /* ── Load & Render Alerts ──────────────────────────────── */
    async function loadAlerts() {
        // In real app: GET /api/tl/alerts
        // For now use demo data
        renderAlerts(DEMO.alerts);
    }

    function renderAlerts(alerts) {
        const $container = $('#alerts-container');
        if (!alerts || alerts.length === 0) {
            $container.hide();
            return;
        }

        const html = alerts.map(alert => `
            <a href="${escapeHtml(alert.link)}" class="alert-banner ${alert.type}">
                <div class="alert-icon">${alert.icon}</div>
                <div class="alert-content">
                    <div class="alert-title">${escapeHtml(alert.title)}</div>
                    <div class="alert-text">${escapeHtml(alert.text)}</div>
                </div>
                <div class="alert-action">${escapeHtml(alert.action)} →</div>
            </a>
        `).join('');

        $container.html(html).show();
    }

    /* ── Load & Render Today's Snapshot ────────────────────── */
    async function loadTodaySnapshot() {
        try {
            const response = await getWithAuth(API.todaySnapshot);
            const snapshot = response.data || response;
            renderTodaySnapshot(snapshot);
        } catch (err) {
            renderTodaySnapshot(DEMO.todaySnapshot);
        }
    }

    function renderTodaySnapshot(snapshot) {
        const $tbody = $('#snapshot-body');
        const $empty = $('#snapshot-empty');
        const $table = $('#snapshot-table');

        if (!snapshot || snapshot.length === 0) {
            $table.hide();
            $empty.show();
            return;
        }

        $table.show();
        $empty.hide();

        const html = snapshot.map(item => {
            const statusClass = statusBadgeClass(item.approvalStatus);
            const statusText = statusLabel(item.approvalStatus);
            const actionHtml = item.approvalStatus === 'PENDING'
                ? `<a href="/tl/approvals?review=${item.workLogId}" class="snapshot-action">Review</a>`
                : `<span style="font-size:var(--text-xs);color:var(--text-3)">—</span>`;

            return `
                <tr>
                    <td>
                        <div class="snapshot-member">
                            <span class="snapshot-member-name">${escapeHtml(item.memberName)}</span>
                            <span class="snapshot-member-code">${escapeHtml(item.employeeCode)}</span>
                        </div>
                    </td>
                    <td class="snapshot-hours">${item.hoursWorked.toFixed(1)}h</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td>${actionHtml}</td>
                </tr>
            `;
        }).join('');

        $tbody.html(html);
    }

    /* ── Load & Render Team Pulse ──────────────────────────── */
    async function loadTeamPulse() {
        try {
            const response = await getWithAuth(API.teamPulse);
            const pulse = response.data || response;
            renderTeamPulse(pulse);
        } catch (err) {
            renderTeamPulse(DEMO.teamPulse);
        }
    }

    function renderTeamPulse(members) {
        const $list = $('#pulse-list');
        $('#team-pulse-count').text(`${members.length} member${members.length === 1 ? '' : 's'}`);

        const html = members.map(m => {
            const statusClass = m.status.toLowerCase();
            const hoursText = m.hoursWorked > 0 ? `${m.hoursWorked.toFixed(1)}h` : '—';
            const initials = m.name.split(' ').map(n => n[0]).join('');

            return `
                <div class="pulse-item" data-userid="${m.userId}">
                    <div class="pulse-avatar">${escapeHtml(initials)}</div>
                    <div class="pulse-info">
                        <div class="pulse-name">${escapeHtml(m.name)}</div>
                        <div class="pulse-meta">${escapeHtml(m.code)} · ${escapeHtml(m.subGroup)}</div>
                    </div>
                    <div class="pulse-hours">${hoursText}</div>
                    <div class="pulse-status ${statusClass}"></div>
                </div>
            `;
        }).join('');

        $list.html(html);
    }

    /* ── Load & Render Weekly Trend ────────────────────────── */
    async function loadWeeklyTrend() {
        try {
            const response = await getWithAuth(API.weeklyTrend);
            const trend = response.data || response;
            renderWeeklyTrend(trend);
        } catch (err) {
            renderWeeklyTrend(DEMO.weeklyTrend);
        }
    }

    function renderWeeklyTrend(trend) {
        const $chart = $('#trend-chart');
        if (!trend || trend.length === 0) {
            $chart.html('<div style="text-align:center;color:var(--text-3);padding:20px">No trend data</div>');
            return;
        }

        const maxSubmitted = Math.max(...trend.map(d => d.submitted), 1);
        const maxPending = Math.max(...trend.map(d => d.pending), 1);
        const maxTotal = Math.max(maxSubmitted, maxPending);

        const html = trend.map(day => {
            const submittedPct = (day.submitted / maxTotal) * 100;
            const pendingPct = (day.pending / maxTotal) * 100;
            const isToday = day.day === 'Sun'; // simplified

            return `
                <div class="trend-bar-group">
                    <div class="trend-bar-track">
                        <div class="trend-bar submitted" style="height:${submittedPct}%"></div>
                        ${day.pending > 0 ? `<div class="trend-bar pending" style="height:${pendingPct}%"></div>` : ''}
                        ${day.submitted > 0 ? `<div class="trend-bar-value">${day.submitted}</div>` : ''}
                    </div>
                    <div class="trend-bar-label">${escapeHtml(day.day)}</div>
                </div>
            `;
        }).join('');

        $chart.html(html);
    }

    /* ── Stat Card Click ───────────────────────────────────── */
    $(document).on('click', '.stat-card', function () {
        const filter = $(this).data('filter');
        if (filter) {
            window.location.href = `/tl/approvals?status=${filter}`;
        }
    });

    /* ── Bootstrap ─────────────────────────────────────────── */
    if (!requireAuth({ minRole: 'TeamLead' })) return;
    loadUser();
    setHeaderInfo();
    loadStats();
    loadAlerts();
    loadTodaySnapshot();
    loadTeamPulse();
    loadWeeklyTrend();
});