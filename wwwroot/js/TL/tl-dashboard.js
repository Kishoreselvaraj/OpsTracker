/* ============================================================
   Aetram OpsTracker — Team Lead Dashboard Page JS
   jQuery + AJAX with demo data fallback
   ============================================================ */

import { getWithAuth } from '/js/services/apiService.js';
import { getUser } from '/js/auth/authService.js';
import { requireAuth } from '/js/auth/routeGuard.js';
import { getApprovalList } from '/js/services/workLogService.js';
import { showToast } from '/js/utils/toast.js';
import { hierarchyApi } from '/js/hierarchy/hierarchyApi.js';
import { loadHierarchyContext, effectiveTeamId } from '/js/hierarchy/hierarchyContext.js';
import { pick, fullName } from '/js/hierarchy/caseHelpers.js';

// Global holder for the logged-in user (populated by loadUser)
let currentUser = null;

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

    // showToast imported from /js/utils/toast.js

    /* ── Load User ─────────────────────────────────────────── */
    function loadUser() {
        try {

            const user = getUser();
            currentUser = user;


        } catch (e) {
            currentUser = null;
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
            renderStats({ pending: 0, approved: 0, rejected: 0, correction: 0 });
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
        // Existing implementation unchanged
        // In real app: GET /api/tl/alerts
        // For now use demo data
        try {
            const response = await getWithAuth('/api/tl/alerts');
            const alerts = response.data || response;
            renderAlerts(alerts);
        } catch (err) {
            renderAlerts([]);
        }
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

    // Load & render today's snapshot table (user‑specific)
    async function loadTodaySnapshot() {
        try {
            // Reuse approvals data to build today's snapshot
            const rows = await getApprovalList('ALL', null, null);
            const today = new Date().toDateString();
            const snapshot = rows.filter(r => {
                const d = new Date(r.workDate);
                return d.toDateString() === today && (r.approvalStatus || '').toUpperCase() === 'PENDING';
            }).map(r => ({
                memberName: r.employeeName || r.memberName,
                employeeCode: r.employeeCode || '',
                hoursWorked: r.hoursWorked || 0,
                approvalStatus: r.approvalStatus || 'PENDING',
                workLogId: r.workLogId
            }));
            renderTodaySnapshot(snapshot);
        } catch (err) {
            renderTodaySnapshot([]);
        }
    }
    /* ── Load & Render Team Pulse ──────────────────────────── */
    // Calls the same hierarchy API as tl-team.js but without importing that
    // module (which has top-level side-effects and DOM references for its own page).
    async function loadTeamPulse() {
        $('#pulse-list').html(
            '<div class="pulse-item skeleton" style="height:48px"></div>'.repeat(3)
        );
        try {
            // 1. Resolve teamId the same way tl-team.js init() does
            const ctx = await loadHierarchyContext();
            const teamId = effectiveTeamId(ctx);

            if (!teamId) {
                renderTeamPulse([]);
                return;
            }

            // 2. Fetch members via the same endpoint as tl-team.js loadMembers()
            const rawMembers = await hierarchyApi.listTeamMembers(teamId) ?? [];

            // 3. Optionally resolve sub-group names (mirrors getMemberSubGroupName)
            let subGroups = [];
            try {
                subGroups = await hierarchyApi.listSubGroups({ teamId }) ?? [];
            } catch { /* sub-group labels are optional */ }

            // 4. Normalise to the shape renderTeamPulse() expects
            const pulse = rawMembers.map(m => {
                const name = fullName(m);
                const code = pick(m, 'employeeCode', 'EmployeeCode') || '';
                const isLead = pick(m, 'isTeamLead', 'IsTeamLead') || false;

                const sgId = String(
                    pick(m, 'currentSubGroupId', 'CurrentSubGroupId', 'subGroupId', 'SubGroupId') ?? ''
                );
                const directSgName = pick(m, 'subGroupName', 'SubGroupName');
                let subGroup = (directSgName && directSgName !== 'null') ? directSgName : '';
                if (!subGroup && sgId) {
                    const sg = subGroups.find(
                        s => String(pick(s, 'subGroupId', 'SubGroupId')) === sgId
                    );
                    subGroup = sg ? (pick(sg, 'subGroupName', 'SubGroupName') || 'Unassigned') : 'Unassigned';
                }

                return {
                    userId: pick(m, 'userId', 'UserId'),
                    name: name || 'Unknown',
                    code,
                    subGroup: subGroup || '—',
                    isLead
                };
            });

            renderTeamPulse(pulse);
        } catch (err) {
            showToast('Could not load team pulse', 'error');
            renderTeamPulse([]);
        }
    }

    function renderTeamPulse(members) {
        const $list = $('#pulse-list');
        $('#team-pulse-count').text(`${members.length} member${members.length === 1 ? '' : 's'}`);

        if (members.length === 0) {
            $list.html('<div class="pulse-empty" style="padding:16px;color:var(--text-3);text-align:center">No team members found.</div>');
            return;
        }

        const html = members.map(m => {
            const roleClass = m.isLead ? 'lead' : 'member';
            const initials = m.name.split(' ').map(n => n[0]).join('').slice(0, 2);

            return `
                <div class="pulse-item" data-userid="${m.userId}">
                    <div class="pulse-avatar">${escapeHtml(initials)}</div>
                    <div class="pulse-info">
                        <div class="pulse-name">${escapeHtml(m.name)}</div>
                        <div class="pulse-meta">${escapeHtml(m.code)} · ${escapeHtml(m.subGroup)}</div>
                    </div>
                    <div class="pulse-status ${roleClass}"></div>
                </div>
            `;
        }).join('');

        $list.html(html);
    }

    /* ── Load & Render Weekly Trend ────────────────────────── */
    async function loadWeeklyTrend() {
        try {
            // Calculate week start (Monday) and week end (Sunday)
            const today = new Date();
            const currentDay = today.getDay();
            const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
            
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - distanceToMonday);
            weekStart.setHours(0, 0, 0, 0);

            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);

            const fromDateStr = weekStart.toISOString().split('T')[0];
            const toDateStr = weekEnd.toISOString().split('T')[0];
            
            // Reuse getApprovalList to fetch team submissions
            const rows = await getApprovalList('ALL', fromDateStr, toDateStr);

            const trendMap = new Map();
            const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            daysOfWeek.forEach(d => trendMap.set(d, { day: d, submitted: 0, pending: 0 }));

            rows.forEach(r => {
                const workDate = new Date(r.workDate);
                if (workDate >= weekStart && workDate <= weekEnd) {
                    const dayName = workDate.toLocaleDateString('en-US', { weekday: 'short' });
                    if (trendMap.has(dayName)) {
                        const dayData = trendMap.get(dayName);
                        dayData.submitted++;
                        const status = (r.approvalStatus || '').toUpperCase();
                        if (status === 'PENDING') {
                            dayData.pending++;
                        }
                    }
                }
            });

            const trend = Array.from(trendMap.values());
            renderWeeklyTrend(trend);
        } catch (err) {
            showToast('Could not load weekly trend data', 'error');
            renderWeeklyTrend([]);
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
    loadStats();          // stat cards (pending/approved/rejected/correction)
    loadAlerts();         // alert banners
    loadTodaySnapshot();  // Today's Submission — via getApprovalList()
    loadTeamPulse();      // Team Pulse — via hierarchyApi.listTeamMembers()
    loadWeeklyTrend();
});