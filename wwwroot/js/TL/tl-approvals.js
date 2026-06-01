/* ============================================================
   Aetram OpsTracker — Team Lead Approvals Page JS
   jQuery + AJAX with demo data fallback
   Features: Filters, Search, Bulk Actions, Review Modal
   ============================================================ */

import { getWithAuth, postWithAuth } from '/js/services/apiService.js';
import { unwrap } from '/js/services/apiClient.js';
import { getUser } from '/js/auth/authService.js';
import { requireAuth } from '/js/auth/routeGuard.js';
import { getApprovalList, approveRejectTask } from '/js/services/workLogService.js';
import { approveEod, rejectEod, requestEodCorrection } from '/js/services/eodService.js';
import { showToast } from '/js/utils/toast.js';


$(function () {

    /* ── API Config ───────────────────────────────────────── */
    const API = {
        teams: '/api/Team/list',
        groups: '/api/Approval/GetTaskGroupsByDepartment',
        subGroups: '/api/SubGroup/list',
        teamMembers: '/api/Approval/GetTeamLeadMembersWorkLogs'
    };

    function mapQueueRow(row) {
        const status = (row.approvalStatus || 'PENDING').toUpperCase();
        return {
            workLogId: row.workLogId,
            workflowLogDateId: row.workflowLogDateId,
            userId: row.userId,
            memberName: row.employeeName || 'Unknown',
            employeeCode: '',
            workDate: row.workDate,
            groupId: row.groupId,
            groupName: row.groupName || '',
            subGroupId: row.subGroupId,
            subGroupName: row.subGroupName || '',
            hoursWorked: 1,
            taskCount: 1,
            approvalStatus: status,
            submittedAt: row.submittedAt,
            categoryName: row.groupName || '',
            entries: [{
                desc: row.workDescription || '',
                hours: 1,
                status: row.workStatus || 'In Progress'
            }],
            approvalComment: row.rejectReason || '',
            reasonForReject: row.rejectReason || ''
        };
    }

    /* ── Demo Data ────────────────────────────────────────── */
    const DEMO = {
        teamLead: { userId: 2, name: "Priya Sharma", employeeCode: "EMP-00101" },
        groups: [
            { teamId: 1, name: "Aetram India" },
            { teamId: 2, name: "Aetram Bullion" },
            { teamId: 3, name: "Aetram International - Mobile" },
            { teamId: 4, name: "Aetram International - Web" },
            { teamId: 5, name: "Aetram International - Terminal" },
            { teamId: 6, name: "Aetram - Internal" },
            { teamId: 7, name: "Aetram - Finserv" }
        ],
        teams: [
            { groupId: 1, name: "Development - Support" },
            { groupId: 2, name: "QA - International" },
            { groupId: 3, name: "QA - TV" },
            { groupId: 4, name: "Development - International" },
            { groupId: 5, name: "Development - UI" },
            { groupId: 6, name: "IT - Infra" }
        ],
        subGroups: [
            { subGroupId: 1, groupId: 1, name: "Frontend" },
            { subGroupId: 2, groupId: 1, name: "Backend" },
            { subGroupId: 3, groupId: 2, name: "Manual Testing" },
            { subGroupId: 4, groupId: 2, name: "Automation" },
            { subGroupId: 5, groupId: 3, name: "UAT Testing" },
            { subGroupId: 6, groupId: 3, name: "Live Testing" },
            { subGroupId: 7, groupId: 4, name: "API Development" },
            { subGroupId: 8, groupId: 4, name: "Mobile Dev" },
            { subGroupId: 9, groupId: 5, name: "UI/UX" },
            { subGroupId: 10, groupId: 5, name: "Theming" },
            { subGroupId: 11, groupId: 6, name: "Server Admin" },
            { subGroupId: 12, groupId: 6, name: "Database Admin" }
        ],
        teamMembers: [
            { userId: 1, name: "Rahul Kumar", code: "EMP-00412" },
            { userId: 3, name: "Amit Verma", code: "EMP-00415" },
            { userId: 4, name: "Sunita Patel", code: "EMP-00420" },
            { userId: 5, name: "Vikram Rao", code: "EMP-00425" },
            { userId: 6, name: "Neha Gupta", code: "EMP-00430" }
        ],
        queue: [
            {
                workLogId: 101, userId: 1, memberName: "Rahul Kumar", employeeCode: "EMP-00412",
                workDate: "2026-05-21", categoryId: 1, categoryName: "Development",
                groupId: 1, groupName: "Development - Support", subGroupId: 2, subGroupName: "Backend", hoursWorked: 8.5, taskCount: 2,
                approvalStatus: "PENDING", submittedAt: "2026-05-21T18:30:00Z",
                entries: [
                    { desc: "API integration for payment gateway", hours: 6.0, status: "Completed" },
                    { desc: "Bug fix for auth module", hours: 2.5, status: "In Progress" }
                ]
            },
            {
                workLogId: 102, userId: 3, memberName: "Amit Verma", employeeCode: "EMP-00415",
                workDate: "2026-05-21", categoryId: 2, categoryName: "QA",
                groupId: 2, groupName: "QA - International", subGroupId: 4, subGroupName: "Automation", hoursWorked: 7.0, taskCount: 1,
                approvalStatus: "PENDING", submittedAt: "2026-05-21T17:45:00Z",
                entries: [
                    { desc: "Sprint 24 test case execution", hours: 7.0, status: "In Progress" }
                ]
            },
            {
                workLogId: 103, userId: 4, memberName: "Sunita Patel", employeeCode: "EMP-00420",
                workDate: "2026-05-20", categoryId: 1, categoryName: "Development",
                groupId: 1, groupName: "Development - Support", subGroupId: 1, subGroupName: "Frontend", hoursWorked: 9.0, taskCount: 3,
                approvalStatus: "APPROVED", submittedAt: "2026-05-20T19:00:00Z",
                entries: [
                    { desc: "Dashboard UI redesign", hours: 4.0, status: "Completed" },
                    { desc: "Component library update", hours: 3.5, status: "Completed" },
                    { desc: "Code review", hours: 1.5, status: "Completed" }
                ]
            },
            {
                workLogId: 104, userId: 5, memberName: "Vikram Rao", employeeCode: "EMP-00425",
                workDate: "2026-05-20", categoryId: 2, categoryName: "QA",
                groupId: 3, groupName: "QA - TV", subGroupId: 5, subGroupName: "UAT Testing", hoursWorked: 6.5, taskCount: 1,
                approvalStatus: "CORRECTION", submittedAt: "2026-05-20T16:30:00Z",
                entries: [
                    { desc: "Test automation script for login flow", hours: 6.5, status: "Completed" }
                ]
            },
            {
                workLogId: 105, userId: 6, memberName: "Neha Gupta", employeeCode: "EMP-00430",
                workDate: "2026-05-19", categoryId: 3, categoryName: "DevOps",
                groupId: 6, groupName: "IT - Infra", subGroupId: 12, subGroupName: "Database Admin", hoursWorked: 8.0, taskCount: 2,
                approvalStatus: "REJECTED", submittedAt: "2026-05-19T18:15:00Z",
                entries: [
                    { desc: "Pipeline optimization", hours: 5.0, status: "Completed" },
                    { desc: "Deployment script update", hours: 3.0, status: "Completed" }
                ]
            },
            {
                workLogId: 106, userId: 1, memberName: "Rahul Kumar", employeeCode: "EMP-00412",
                workDate: "2026-05-19", categoryId: 1, categoryName: "Development",
                groupId: 1, groupName: "Development - Support", subGroupId: 2, subGroupName: "Backend", hoursWorked: 7.5, taskCount: 2,
                approvalStatus: "APPROVED", submittedAt: "2026-05-19T17:30:00Z",
                entries: [
                    { desc: "Database schema migration", hours: 4.0, status: "Completed" },
                    { desc: "Query optimization", hours: 3.5, status: "Completed" }
                ]
            },
            {
                workLogId: 107, userId: 3, memberName: "Amit Verma", employeeCode: "EMP-00415",
                workDate: "2026-05-18", categoryId: 2, categoryName: "QA",
                groupId: 2, groupName: "QA - International", subGroupId: 3, subGroupName: "Manual Testing", hoursWorked: 8.0, taskCount: 2,
                approvalStatus: "PENDING", submittedAt: "2026-05-18T18:45:00Z",
                entries: [
                    { desc: "Regression testing for release 3.2", hours: 5.0, status: "Completed" },
                    { desc: "Bug verification", hours: 3.0, status: "In Progress" }
                ]
            },
            {
                workLogId: 108, userId: 4, memberName: "Sunita Patel", employeeCode: "EMP-00420",
                workDate: "2026-05-18", categoryId: 1, categoryName: "Development",
                groupId: 1, groupName: "Development - Support", subGroupId: 1, subGroupName: "Frontend", hoursWorked: 7.0, taskCount: 1,
                approvalStatus: "PENDING", submittedAt: "2026-05-18T17:00:00Z",
                entries: [
                    { desc: "Responsive layout fixes", hours: 7.0, status: "Completed" }
                ]
            }
        ]
    };

    /* ── State ────────────────────────────────────────────── */
    let currentUser = null;
    let allQueueData = [];
    let filteredQueue = [];
    let selectedIds = [];
    let currentPage = 1;
    let pageSize = 10;
    let currentDateFilter = 'today';
    let currentStatusFilter = 'all';
    let currentTeamFilter = '';
    let currentGroupFilter = '';
    let currentSubGroupFilter = '';
    let currentMemberFilter = '';
    let currentSearch = '';
    let selectedWorkLogId = null;
    let bulkActionType = null;

    /* ── Helpers ───────────────────────────────────────────── */
    function formatDate(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function formatDateTime(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    function statusLabel(status) {
        const map = { 'PENDING': 'Pending', 'APPROVED': 'Approved', 'REJECTED': 'Rejected', 'CORRECTION': 'Need Correction' };
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

    function isToday(dateStr) {
        const d = new Date(dateStr);
        const today = new Date();
        return d.toDateString() === today.toDateString();
    }

    function isThisWeek(dateStr) {
        const d = new Date(dateStr);
        const today = new Date();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return d >= weekStart && d <= today;
    }

    function isThisMonth(dateStr) {
        const d = new Date(dateStr);
        const today = new Date();
        return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    }

    /* ── Load User ─────────────────────────────────────────── */
    function loadUser() {
        try { currentUser = getUser(); } catch (e) { currentUser = null; }
        if (currentUser) {
            const name = [currentUser.firstName, currentUser.lastName].filter(Boolean).join(' ') || currentUser.name;
            $('#nav-user-name').text(name || 'Team Lead');
        }
    }

    /* ── Load Filters ──────────────────────────────────────── */
    async function loadFilters() {
        try {
            const [teamsRes, groupsRes, subGroupsRes, membersRes] = await Promise.all([
                postWithAuth(API.teams, {}),
                getWithAuth(API.groups),
                postWithAuth(API.subGroups, {}),
                getWithAuth(API.teamMembers)
            ]);
            const teams = unwrap(teamsRes).data || [];
            const groups = unwrap(groupsRes).data || groupsRes.data || [];
            const subGroups = unwrap(subGroupsRes).data || [];
            const membersRaw = unwrap(membersRes).data || membersRes.data || [];
            const members = membersRaw.map(m => ({
                userId: m.userId ?? m.UserId,
                name: m.employeeName ?? m.EmployeeName ?? m.name,
                code: m.employeeCode ?? ''
            }));
            populateTeamFilter(teams.map(t => ({ teamId: t.teamId ?? t.TeamId, name: t.teamName ?? t.TeamName })));
            populateGroupFilter(groups.map(g => ({ groupId: g.groupId ?? g.GroupId, name: g.groupName ?? g.GroupName })));
            populateSubGroupFilter(subGroups.map(sg => ({
                subGroupId: sg.subGroupId ?? sg.SubGroupId,
                name: sg.subGroupName ?? sg.SubGroupName
            })));
            populateMemberFilter(members);
        } catch (err) {
            showToast('Some filters could not be loaded', 'error');
        }
    }

    function populateTeamFilter(teams) {
        const $select = $('#team-filter');
        $select.html('<option value="">All Teams</option>');
        teams.forEach(team => {
            $select.append(`<option value="${team.teamId}">${escapeHtml(team.name)}</option>`);
        });
    }

    function populateGroupFilter(groups) {
        const $select = $('#group-filter');
        $select.html('<option value="">All Groups</option>');
        groups.forEach(group => {
            $select.append(`<option value="${group.groupId}">${escapeHtml(group.name)}</option>`);
        });
    }

    function populateSubGroupFilter(subGroups) {
        const $select = $('#subgroup-filter');
        $select.html('<option value="">All Sub-Groups</option>');
        subGroups.forEach(sg => {
            $select.append(`<option value="${sg.subGroupId}">${escapeHtml(sg.name)}</option>`);
        });
    }

    function populateMemberFilter(members) {
        const $select = $('#member-filter');
        $select.html('<option value="">All Members</option>');
        members.forEach(m => {
            $select.append(`<option value="${m.userId}">${escapeHtml(m.name)}</option>`);
        });
    }

    /* ── Load Queue ────────────────────────────────────────── */
    async function loadQueue() {
        $('#queue-body').html('<tr><td colspan="9" class="skeleton-row"><div class="skeleton" style="height:40px;width:100%"></div></td></tr>');

        try {
            const rows = await getApprovalList('ALL', null, null);
            allQueueData = rows.map(mapQueueRow);
        } catch (err) {
            allQueueData = [];
            showToast(err.message || 'Failed to load approval queue', 'error');
        }
        applyFilters();
    }

    /* ── Apply Filters ─────────────────────────────────────── */
    function applyFilters() {
        filteredQueue = allQueueData.filter(item => {
            // Date filter
            if (currentDateFilter === 'today' && !isToday(item.workDate)) return false;
            if (currentDateFilter === 'week' && !isThisWeek(item.workDate)) return false;
            if (currentDateFilter === 'month' && !isThisMonth(item.workDate)) return false;

            // Status filter
            if (currentStatusFilter !== 'all' && item.approvalStatus !== currentStatusFilter) return false;

            // Group filter
            if (currentGroupFilter && item.groupId != currentGroupFilter) return false;

            // Sub-group filter
            if (currentSubGroupFilter && item.subGroupId != currentSubGroupFilter) return false;

            // Member filter
            if (currentMemberFilter && item.userId != currentMemberFilter) return false;

            // Search
            if (currentSearch) {
                const searchLower = currentSearch.toLowerCase();
                const match = (item.memberName && item.memberName.toLowerCase().includes(searchLower)) ||
                              (item.employeeCode && item.employeeCode.toLowerCase().includes(searchLower)) ||
                              (item.entries && item.entries.some(e => e.desc.toLowerCase().includes(searchLower)));
                if (!match) return false;
            }

            return true;
        });

        currentPage = 1;
        selectedIds = [];
        updateBulkBar();
        renderQueue();
        renderPagination();
    }

    /* ── Render Queue Table ────────────────────────────────── */
    function renderQueue() {
        const $tbody = $('#queue-body');
        const $empty = $('#empty-state');
        const $table = $('#queue-table');

        if (filteredQueue.length === 0) {
            $table.hide();
            $empty.show();
            $('#pagination-bar').hide();
            return;
        }

        $table.show();
        $empty.hide();
        $('#pagination-bar').show();

        const start = (currentPage - 1) * pageSize;
        const end = Math.min(start + pageSize, filteredQueue.length);
        const pageItems = filteredQueue.slice(start, end);

        const html = pageItems.map(item => {
            const isSelected = selectedIds.includes(item.workLogId);
            const statusClass = statusBadgeClass(item.approvalStatus);
            const statusText = statusLabel(item.approvalStatus);
            const isPending = item.approvalStatus === 'PENDING';

            return `
                <tr data-logid="${item.workLogId}" class="${isSelected ? 'selected' : ''}">
                    <td class="col-check">
                        <div class="checkbox-wrap">
                            <input type="checkbox" class="row-checkbox" data-logid="${item.workLogId}" ${isSelected ? 'checked' : ''} />
                            <span class="check-custom"></span>
                        </div>
                    </td>
                    <td class="col-member">
                        <div class="member-cell">
                            <span class="member-name">${escapeHtml(item.memberName)}</span>
                            <span class="member-code">${escapeHtml(item.employeeCode)}</span>
                        </div>
                    </td>
                    <td class="col-date">${formatDate(item.workDate)}</td>
                    <td class="col-subgroup">${escapeHtml(item.groupName)}</td>
                    <td class="col-hours hours-cell">${item.hoursWorked.toFixed(1)}h</td>
                    <td class="col-tasks">${item.taskCount}</td>
                    <td class="col-status"><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td class="col-submitted">${formatDateTime(item.submittedAt)}</td>
                    <td class="col-action">
                        ${isPending
                            ? `<button class="action-btn btn-review" data-logid="${item.workLogId}">Review</button>`
                            : `<button class="action-btn view btn-view" data-logid="${item.workLogId}">View</button>`
                        }
                    </td>
                </tr>
            `;
        }).join('');

        $tbody.html(html);
        $('#page-start').text(start + 1);
        $('#page-end').text(end);
        $('#page-total').text(filteredQueue.length);
    }

    /* ── Render Pagination ─────────────────────────────────── */
    function renderPagination() {
        const totalPages = Math.ceil(filteredQueue.length / pageSize) || 1;
        const $numbers = $('#page-numbers');
        $('#btn-prev').prop('disabled', currentPage === 1);
        $('#btn-next').prop('disabled', currentPage === totalPages);

        let html = '';
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                html += `<button class="page-number ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
            } else if (i === currentPage - 2 || i === currentPage + 2) {
                html += `<span style="color:var(--text-3);padding:0 4px">…</span>`;
            }
        }
        $numbers.html(html);
    }

    /* ── Update Bulk Bar ───────────────────────────────────── */
    function updateBulkBar() {
        const $bar = $('#bulk-bar');
        if (selectedIds.length > 0) {
            $('#bulk-count').text(selectedIds.length);
            $bar.slideDown(200);
        } else {
            $bar.slideUp(200);
        }
    }

    /* ── Filter Handlers ───────────────────────────────────── */
    $(document).on('click', '.filter-pill', function () {
        $('.filter-pill').removeClass('active');
        $(this).addClass('active');
        currentDateFilter = $(this).data('date-filter');
        if (currentDateFilter === 'custom') {
            $('#date-range-panel').slideDown(200);
        } else {
            $('#date-range-panel').slideUp(200);
        }
        applyFilters();
    });

    $('#status-filter').on('change', function () {
        currentStatusFilter = $(this).val();
        applyFilters();
    });

    $('#group-filter, #subgroup-filter, #member-filter').on('change', function () {
        currentGroupFilter = $('#group-filter').val();
        currentSubGroupFilter = $('#subgroup-filter').val();
        currentMemberFilter = $('#member-filter').val();
        applyFilters();
    });

    $('#search-input').on('input', function () {
        currentSearch = $(this).val().trim();
        applyFilters();
    });

    $('#btn-apply-date').on('click', function () {
        applyFilters();
    });

    $('#btn-reset-filters').on('click', function () {
        currentDateFilter = 'today';
        currentStatusFilter = 'all';
        currentGroupFilter = '';
        currentSubGroupFilter = '';
        currentMemberFilter = '';
        currentSearch = '';
        $('#search-input').val('');
        $('#status-filter').val('all');
        $('#group-filter').val('');
        $('#subgroup-filter').val('');
        $('#member-filter').val('');
        $('.filter-pill').removeClass('active').first().addClass('active');
        $('#date-range-panel').hide();
        applyFilters();
    });

    /* ── Pagination Handlers ───────────────────────────────── */
    $(document).on('click', '.page-number', function () {
        currentPage = parseInt($(this).data('page'));
        renderQueue();
        renderPagination();
    });

    $('#btn-prev').on('click', function () {
        if (currentPage > 1) {
            currentPage--;
            renderQueue();
            renderPagination();
        }
    });

    $('#btn-next').on('click', function () {
        const totalPages = Math.ceil(filteredQueue.length / pageSize);
        if (currentPage < totalPages) {
            currentPage++;
            renderQueue();
            renderPagination();
        }
    });

    $('#page-size').on('change', function () {
        pageSize = parseInt($(this).val());
        currentPage = 1;
        renderQueue();
        renderPagination();
    });

    /* ── Checkbox Handlers ─────────────────────────────────── */
    $(document).on('change', '#master-checkbox', function () {
        const checked = $(this).prop('checked');
        if (checked) {
            const pageItems = getCurrentPageItems();
            const pendingItems = pageItems.filter(i => i.approvalStatus === 'PENDING');
            selectedIds = pendingItems.map(i => i.workLogId);
        } else {
            selectedIds = [];
        }
        renderQueue();
        updateBulkBar();
    });

    $(document).on('change', '.row-checkbox', function () {
        const logId = parseInt($(this).data('logid'));
        if ($(this).prop('checked')) {
            if (!selectedIds.includes(logId)) selectedIds.push(logId);
        } else {
            selectedIds = selectedIds.filter(id => id !== logId);
        }
        updateBulkBar();
        $(this).closest('tr').toggleClass('selected', $(this).prop('checked'));
    });

    function getCurrentPageItems() {
        const start = (currentPage - 1) * pageSize;
        const end = start + pageSize;
        return filteredQueue.slice(start, end);
    }

    /* ── Bulk Actions ──────────────────────────────────────── */
    $('#bulk-approve').on('click', function () { openBulkModal('approve'); });
    $('#bulk-reject').on('click', function () { openBulkModal('reject'); });
    $('#bulk-correction').on('click', function () { openBulkModal('correction'); });
    $('#bulk-cancel').on('click', function () { selectedIds = []; updateBulkBar(); renderQueue(); });

    function openBulkModal(action) {
        bulkActionType = action;
        const titles = { approve: 'Bulk Approve', reject: 'Bulk Reject', correction: 'Bulk Request Correction' };
        const subtitles = { approve: 'approve', reject: 'reject', correction: 'request correction for' };
        $('#bulk-modal-title').text(titles[action]);
        $('#bulk-modal-subtitle').text(`You are about to ${subtitles[action]} ${selectedIds.length} EOD submission${selectedIds.length > 1 ? 's' : ''}`);
        $('#bulk-comment').val('');
        $('#bulk-modal').addClass('active');
        $('body').css('overflow', 'hidden');
    }

    function closeBulkModal() {
        $('#bulk-modal').removeClass('active');
        $('body').css('overflow', '');
        bulkActionType = null;
    }

    $('#bulk-modal-close, #bulk-modal-cancel').on('click', closeBulkModal);
    $('#bulk-modal').on('click', function (e) { if (e.target === this) closeBulkModal(); });

    $('#bulk-modal-confirm').on('click', async function () {
        const comment = $('#bulk-comment').val().trim();
        if ((bulkActionType === 'reject' || bulkActionType === 'correction') && !comment) {
            showToast('Please provide a comment', 'error');
            return;
        }

        try {
            for (const id of selectedIds) {
                await runApprovalAction(id, bulkActionType, comment);
            }
            showToast(`Bulk ${bulkActionType} completed`, 'success');
            await loadQueue();
        } catch (err) {
            showToast(err.message || 'Bulk action failed', 'error');
        }

        selectedIds = [];
        updateBulkBar();
        closeBulkModal();
    });

    /* ── Review Modal ────────────────────────────────────────── */
    $(document).on('click', '.btn-review, .btn-view', function () {
        const logId = $(this).data('logid');
        openReviewModal(logId);
    });

    function openReviewModal(logId) {
        selectedWorkLogId = logId;
        const item = allQueueData.find(q => q.workLogId === logId);
        if (!item) return;

        $('#review-avatar').text(getInitials(item.memberName));
        $('#review-name').text(item.memberName);
        $('#review-meta').text(`${item.employeeCode} · ${item.groupName} - ${item.subGroupName} · EOD for ${formatDate(item.workDate)}`);
        $('#review-status-badge').html(`<span class="status-badge ${statusBadgeClass(item.approvalStatus)}">${statusLabel(item.approvalStatus)}</span>`);
        $('#review-hours').text(`${item.hoursWorked.toFixed(1)}h`);
        $('#review-tasks').text(`${item.taskCount} entr${item.taskCount === 1 ? 'y' : 'ies'}`);
        $('#review-category').text(item.categoryName);
        $('#review-submitted').text(formatDateTime(item.submittedAt));
        $('#review-entry-count').text(`${item.taskCount} entr${item.taskCount === 1 ? 'y' : 'ies'}`);

        const entriesHtml = item.entries.map(e => `
            <div class="entry-item">
                <div class="entry-main">
                    <div class="entry-desc">${escapeHtml(e.desc)}</div>
                    <div class="entry-meta">
                        <span>⏱ ${e.hours.toFixed(1)}h</span>
                        <span>Status: ${e.status}</span>
                    </div>
                </div>
                <div class="entry-hours">${e.hours.toFixed(1)}h</div>
            </div>
        `).join('');
        $('#review-entries').html(entriesHtml);

        if (item.approvalStatus === 'PENDING') {
            $('#action-section').show();
            $('#actioned-view').hide();
            $('#approval-comment').val('');
        } else {
            $('#action-section').hide();
            $('#actioned-view').show();
            $('#actioned-status').text(`${statusLabel(item.approvalStatus)} on ${formatDateTime(item.submittedAt)}`);
            $('#actioned-comment').text(item.approvalComment || item.reasonForReject || 'No comments provided.');
        }

        $('#review-modal').addClass('active');
        $('body').css('overflow', 'hidden');
    }

    function closeReviewModal() {
        $('#review-modal').removeClass('active');
        $('body').css('overflow', '');
        selectedWorkLogId = null;
    }

    $('#modal-close, #btn-close-review').on('click', closeReviewModal);
    $('#review-modal').on('click', function (e) { if (e.target === this) closeReviewModal(); });

    /* ── Single Actions ────────────────────────────────────── */
    $('#btn-approve').on('click', function () { submitAction('approve'); });
    $('#btn-reject').on('click', function () { submitAction('reject'); });
    $('#btn-correction').on('click', function () { submitAction('correction'); });

    async function runApprovalAction(workLogId, action, comment) {
        const item = allQueueData.find(q => q.workLogId === workLogId);
        const eodId = item?.workflowLogDateId;

        if (action === 'approve') {
            await approveRejectTask(workLogId, 'APPROVED', '');
            if (eodId) await approveEod(eodId, comment || null);
        } else if (action === 'reject') {
            await approveRejectTask(workLogId, 'REJECTED', comment);
            if (eodId) await rejectEod(eodId, comment);
        } else if (action === 'correction') {
            await approveRejectTask(workLogId, 'CORRECTION', comment);
            if (eodId) await requestEodCorrection(eodId, comment);
        }
    }

    async function submitAction(action) {
        if (!selectedWorkLogId) return;
        const comment = $('#approval-comment').val().trim();

        if ((action === 'reject' || action === 'correction') && !comment) {
            showToast('Please provide a reason', 'error');
            return;
        }

        try {
            await runApprovalAction(selectedWorkLogId, action, comment);
            showToast(`EOD ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'correction requested'}`, 'success');
            await loadQueue();
        } catch (err) {
            showToast(err.message || 'Action failed', 'error');
        }

        closeReviewModal();
    }

    /* ── Keyboard ──────────────────────────────────────────── */
    $(document).on('keydown', function (e) {
        if (e.key === 'Escape') {
            closeReviewModal();
            closeBulkModal();
        }
    });

    /* ── Bootstrap ─────────────────────────────────────────── */
    if (!requireAuth({ minRole: 'TeamLead' })) return;
    loadUser();
    loadFilters();
    loadQueue();
});