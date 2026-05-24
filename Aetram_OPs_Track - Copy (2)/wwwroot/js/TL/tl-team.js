/* ============================================================
   Aetram OpsTracker — Team Lead My Team Page JS
   jQuery + AJAX with demo data fallback
   ============================================================ */

import { getWithAuth } from '/js/services/apiService.js';
import { getUser } from '/js/auth/authService.js';

$(function () {

    /* ── API Config ───────────────────────────────────────── */
    const API = {
        teamMembers: '/api/tl/team-members',
        memberProfile: '/api/tl/member-profile',
        memberSubmissions: '/api/tl/member-submissions',
        subGroups: '/api/tl/subgroups'
    };

    /* ── Demo Data ────────────────────────────────────────── */
    const DEMO = {
        teamLead: { userId: 2, name: "Priya Sharma", employeeCode: "EMP-00101" },
        subGroups: [
            { subGroupId: 1, name: "Frontend" },
            { subGroupId: 2, name: "Backend" },
            { subGroupId: 3, name: "Manual Testing" },
            { subGroupId: 4, name: "Automation" },
            { subGroupId: 5, name: "CI/CD" }
        ],
        teamMembers: [
            {
                userId: 1, name: "Rahul Kumar", code: "EMP-00412", subGroup: "Backend",
                subGroupId: 2, totalEods: 45, totalHours: 342.5, avgHours: 7.6,
                pending: 1, approved: 42, rejected: 2, approvalRate: 94,
                joinedDate: "2024-01-15", role: "Developer",
                recentSubmissions: [
                    { date: "2026-05-21", hours: 8.5, status: "PENDING", tasks: 2 },
                    { date: "2026-05-20", hours: 7.0, status: "APPROVED", tasks: 1 },
                    { date: "2026-05-19", hours: 7.5, status: "APPROVED", tasks: 2 },
                    { date: "2026-05-18", hours: 6.0, status: "APPROVED", tasks: 1 },
                    { date: "2026-05-17", hours: 8.0, status: "APPROVED", tasks: 2 }
                ],
                monthlyHours: [
                    { month: "Dec", hours: 145 },
                    { month: "Jan", hours: 152 },
                    { month: "Feb", hours: 138 },
                    { month: "Mar", hours: 160 },
                    { month: "Apr", hours: 155 },
                    { month: "May", hours: 142 }
                ]
            },
            {
                userId: 3, name: "Amit Verma", code: "EMP-00415", subGroup: "Manual Testing",
                subGroupId: 3, totalEods: 38, totalHours: 285.0, avgHours: 7.5,
                pending: 1, approved: 35, rejected: 2, approvalRate: 92,
                joinedDate: "2024-03-10", role: "QA Engineer",
                recentSubmissions: [
                    { date: "2026-05-21", hours: 7.0, status: "PENDING", tasks: 1 },
                    { date: "2026-05-20", hours: 8.0, status: "APPROVED", tasks: 2 },
                    { date: "2026-05-19", hours: 6.5, status: "APPROVED", tasks: 1 }
                ],
                monthlyHours: [
                    { month: "Dec", hours: 130 },
                    { month: "Jan", hours: 140 },
                    { month: "Feb", hours: 125 },
                    { month: "Mar", hours: 148 },
                    { month: "Apr", hours: 142 },
                    { month: "May", hours: 130 }
                ]
            },
            {
                userId: 4, name: "Sunita Patel", code: "EMP-00420", subGroup: "Frontend",
                subGroupId: 1, totalEods: 50, totalHours: 380.0, avgHours: 7.6,
                pending: 0, approved: 47, rejected: 3, approvalRate: 94,
                joinedDate: "2023-08-20", role: "Senior Developer",
                recentSubmissions: [
                    { date: "2026-05-20", hours: 9.0, status: "APPROVED", tasks: 3 },
                    { date: "2026-05-19", hours: 7.5, status: "APPROVED", tasks: 2 },
                    { date: "2026-05-18", hours: 8.0, status: "APPROVED", tasks: 2 }
                ],
                monthlyHours: [
                    { month: "Dec", hours: 155 },
                    { month: "Jan", hours: 162 },
                    { month: "Feb", hours: 150 },
                    { month: "Mar", hours: 168 },
                    { month: "Apr", hours: 160 },
                    { month: "May", hours: 155 }
                ]
            },
            {
                userId: 5, name: "Vikram Rao", code: "EMP-00425", subGroup: "Automation",
                subGroupId: 4, totalEods: 30, totalHours: 225.0, avgHours: 7.5,
                pending: 0, approved: 28, rejected: 2, approvalRate: 93,
                joinedDate: "2024-06-01", role: "QA Engineer",
                recentSubmissions: [
                    { date: "2026-05-20", hours: 6.5, status: "CORRECTION", tasks: 1 },
                    { date: "2026-05-19", hours: 7.0, status: "APPROVED", tasks: 1 },
                    { date: "2026-05-18", hours: 8.0, status: "APPROVED", tasks: 2 }
                ],
                monthlyHours: [
                    { month: "Dec", hours: 120 },
                    { month: "Jan", hours: 128 },
                    { month: "Feb", hours: 115 },
                    { month: "Mar", hours: 135 },
                    { month: "Apr", hours: 130 },
                    { month: "May", hours: 125 }
                ]
            },
            {
                userId: 6, name: "Neha Gupta", code: "EMP-00430", subGroup: "CI/CD",
                subGroupId: 5, totalEods: 40, totalHours: 300.0, avgHours: 7.5,
                pending: 0, approved: 38, rejected: 2, approvalRate: 95,
                joinedDate: "2024-02-15", role: "DevOps Engineer",
                recentSubmissions: [
                    { date: "2026-05-19", hours: 8.0, status: "REJECTED", tasks: 2 },
                    { date: "2026-05-18", hours: 7.5, status: "APPROVED", tasks: 1 },
                    { date: "2026-05-17", hours: 8.0, status: "APPROVED", tasks: 2 }
                ],
                monthlyHours: [
                    { month: "Dec", hours: 140 },
                    { month: "Jan", hours: 148 },
                    { month: "Feb", hours: 135 },
                    { month: "Mar", hours: 150 },
                    { month: "Apr", hours: 145 },
                    { month: "May", hours: 140 }
                ]
            }
        ]
    };

    /* ── State ────────────────────────────────────────────── */
    let currentUser = null;
    let allMembers = [];
    let filteredMembers = [];
    let currentSearch = '';
    let currentSubGroupFilter = '';
    let currentSort = 'name';
    let selectedMember = null;

    /* ── Helpers ───────────────────────────────────────────── */
    function formatDate(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function formatDateShort(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    function statusLabel(status) {
        const map = { 'PENDING': 'Pending', 'APPROVED': 'Approved', 'REJECTED': 'Rejected', 'CORRECTION': 'Correction' };
        return map[status] || status;
    }

    function statusBadgeClass(status) {
        return status.toLowerCase();
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

    function getInitials(name) {
        return name.split(' ').map(n => n[0]).join('');
    }

    /* ── Load User ─────────────────────────────────────────── */
    function loadUser() {
        try { currentUser = getUser(); } catch (e) { currentUser = DEMO.teamLead; }
        if (currentUser) $('#nav-user-name').text(currentUser.name || 'Team Lead');
    }

    /* ── Load Sub-Groups for Filter ────────────────────────── */
    async function loadSubGroups() {
        try {
            const response = await getWithAuth(API.subGroups + '?taskGroupId=' + (currentUser?.taskGroupId || 1));
            populateSubGroupFilter(response.data || response);
        } catch (err) {
            populateSubGroupFilter(DEMO.subGroups);
        }
    }

    function populateSubGroupFilter(subGroups) {
        const $select = $('#subgroup-filter');
        $select.html('<option value="">All Sub-Groups</option>');
        subGroups.forEach(sg => {
            $select.append(`<option value="${sg.subGroupId}">${escapeHtml(sg.name)}</option>`);
        });
    }

    /* ── Load Team Members ─────────────────────────────────── */
    async function loadTeamMembers() {
        $('#team-grid').html(
            Array(4).fill('<div class="team-card skeleton" style="height:180px"></div>').join('')
        );

        try {
            const response = await getWithAuth(API.teamMembers + '?teamLeadId=' + (currentUser?.userId || 2));
            allMembers = response.data || response;
        } catch (err) {
            allMembers = DEMO.teamMembers;
        }
        applyFilters();
    }

    /* ── Apply Filters & Sort ────────────────────────────────── */
    function applyFilters() {
        filteredMembers = allMembers.filter(m => {
            if (currentSubGroupFilter && m.subGroupId != currentSubGroupFilter) return false;
            if (currentSearch) {
                const searchLower = currentSearch.toLowerCase();
                return (m.name && m.name.toLowerCase().includes(searchLower)) ||
                       (m.code && m.code.toLowerCase().includes(searchLower));
            }
            return true;
        });

        // Sort
        filteredMembers.sort((a, b) => {
            if (currentSort === 'name') return a.name.localeCompare(b.name);
            if (currentSort === 'hours') return b.totalHours - a.totalHours;
            if (currentSort === 'approval') return b.approvalRate - a.approvalRate;
            if (currentSort === 'recent') {
                const aDate = a.recentSubmissions && a.recentSubmissions[0] ? new Date(a.recentSubmissions[0].date) : new Date(0);
                const bDate = b.recentSubmissions && b.recentSubmissions[0] ? new Date(b.recentSubmissions[0].date) : new Date(0);
                return bDate - aDate;
            }
            return 0;
        });

        renderTeamGrid();
    }

    /* ── Render Team Grid ──────────────────────────────────── */
    function renderTeamGrid() {
        const $grid = $('#team-grid');
        const $empty = $('#empty-state');

        $('#team-count').text(`${filteredMembers.length} member${filteredMembers.length === 1 ? '' : 's'}`);

        if (filteredMembers.length === 0) {
            $grid.hide();
            $empty.show();
            return;
        }

        $grid.show();
        $empty.hide();

        const html = filteredMembers.map((m, index) => {
            const initials = getInitials(m.name);
            const pendingClass = m.pending > 0 ? 'pending' : '';
            const rejectedClass = m.rejected > 0 ? 'rejected' : '';

            return `
                <div class="team-card" data-userid="${m.userId}" style="animation-delay:${index * 0.05}s">
                    <div class="team-card-header">
                        <div class="team-avatar">${escapeHtml(initials)}</div>
                        <div class="team-info">
                            <div class="team-name">${escapeHtml(m.name)}</div>
                            <div class="team-code">${escapeHtml(m.code)}</div>
                            <div class="team-subgroup">${escapeHtml(m.subGroup)}</div>
                        </div>
                    </div>
                    <div class="team-stats">
                        <div class="team-stat">
                            <div class="team-stat-value">${m.totalEods}</div>
                            <div class="team-stat-label">Total</div>
                        </div>
                        <div class="team-stat">
                            <div class="team-stat-value ${pendingClass}">${m.pending}</div>
                            <div class="team-stat-label">Pending</div>
                        </div>
                        <div class="team-stat">
                            <div class="team-stat-value">${m.approvalRate}%</div>
                            <div class="team-stat-label">Approval</div>
                        </div>
                        <div class="team-stat">
                            <div class="team-stat-value ${rejectedClass}">${m.rejected}</div>
                            <div class="team-stat-label">Rejected</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        $grid.html(html);
    }

    /* ── Open Profile Modal ────────────────────────────────── */
    $(document).on('click', '.team-card', function () {
        const userId = $(this).data('userid');
        const member = allMembers.find(m => m.userId === userId);
        if (member) openProfileModal(member);
    });

    function openProfileModal(member) {
        selectedMember = member;

        $('#profile-avatar').text(getInitials(member.name));
        $('#profile-name').text(member.name);
        $('#profile-meta').text(`${member.code} · ${member.subGroup} · Joined ${formatDate(member.joinedDate)}`);
        $('#profile-badges').html(`<span class="profile-badge">${escapeHtml(member.role)}</span>`);

        $('#profile-total-eods').text(member.totalEods);
        $('#profile-total-hours').text(`${member.totalHours.toFixed(1)}h`);
        $('#profile-avg-hours').text(`${member.avgHours}h`);
        $('#profile-approval-rate').text(`${member.approvalRate}%`);
        $('#profile-view-all').attr('href', `/tl/approvals?member=${member.userId}`);

        // Recent submissions
        const submissionsHtml = member.recentSubmissions.map(s => {
            const statusClass = statusBadgeClass(s.status);
            const statusText = statusLabel(s.status);
            return `
                <div class="submission-item">
                    <div class="submission-info">
                        <div class="submission-date">${formatDateShort(s.date)}</div>
                        <div class="submission-meta">${s.tasks} task${s.tasks === 1 ? '' : 's'}</div>
                    </div>
                    <div class="submission-hours">${s.hours.toFixed(1)}h</div>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
            `;
        }).join('');
        $('#profile-submissions').html(submissionsHtml);

        // Monthly chart
        const maxHours = Math.max(...member.monthlyHours.map(m => m.hours), 1);
        const chartHtml = member.monthlyHours.map(m => {
            const pct = (m.hours / maxHours) * 100;
            return `
                <div class="chart-bar-group">
                    <div class="chart-bar-track">
                        <div class="chart-bar" style="height:${pct}%"></div>
                        <div class="chart-bar-value">${m.hours}</div>
                    </div>
                    <div class="chart-bar-label">${m.month}</div>
                </div>
            `;
        }).join('');
        $('#profile-chart').html(chartHtml);

        $('#profile-modal').addClass('active');
        $('body').css('overflow', 'hidden');
    }

    function closeProfileModal() {
        $('#profile-modal').removeClass('active');
        $('body').css('overflow', '');
        selectedMember = null;
    }

    $('#modal-close, #btn-close-profile').on('click', closeProfileModal);
    $('#profile-modal').on('click', function (e) { if (e.target === this) closeProfileModal(); });

    /* ── Filter Handlers ───────────────────────────────────── */
    $('#search-input').on('input', function () {
        currentSearch = $(this).val().trim();
        applyFilters();
    });

    $('#subgroup-filter').on('change', function () {
        currentSubGroupFilter = $(this).val();
        applyFilters();
    });

    $('#sort-filter').on('change', function () {
        currentSort = $(this).val();
        applyFilters();
    });

    $('#btn-reset-filters').on('click', function () {
        currentSearch = '';
        currentSubGroupFilter = '';
        currentSort = 'name';
        $('#search-input').val('');
        $('#subgroup-filter').val('');
        $('#sort-filter').val('name');
        applyFilters();
    });

    /* ── Keyboard ──────────────────────────────────────────── */
    $(document).on('keydown', function (e) {
        if (e.key === 'Escape') closeProfileModal();
    });

    /* ── Bootstrap ─────────────────────────────────────────── */
    loadUser();
    loadSubGroups();
    loadTeamMembers();
});