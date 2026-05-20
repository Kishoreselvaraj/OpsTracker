/* ============================================================
   Aetram OpsTracker — Team Lead Dashboard JS
   EOD Approval · Team View · Sub-Group Management
   ============================================================ */

$(function () {

    /* ── Demo Data ────────────────────────────────────────── */
    const DEMO = {
        teamLead: {
            userId: 2,
            name: "Priya Sharma",
            employeeCode: "EMP-00101",
            taskGroupId: 1,
            taskGroupName: "India"
        },
        stats: {
            pending: 8,
            approved: 45,
            rejected: 3,
            correction: 2
        },
        queue: [
            {
                workLogId: 101,
                userId: 1,
                memberName: "Rahul Kumar",
                employeeCode: "EMP-00412",
                workDate: "2026-05-14",
                categoryId: 1,
                categoryName: "Development",
                subGroupId: 2,
                subGroupName: "Backend",
                hoursWorked: 8.5,
                taskCount: 2,
                approvalStatus: "PENDING",
                submittedAt: "2026-05-14T18:30:00Z",
                entries: [
                    { desc: "API integration for payment gateway", hours: 6.0, status: "Completed" },
                    { desc: "Bug fix for auth module", hours: 2.5, status: "In Progress" }
                ]
            },
            {
                workLogId: 102,
                userId: 3,
                memberName: "Amit Verma",
                employeeCode: "EMP-00415",
                workDate: "2026-05-14",
                categoryId: 2,
                categoryName: "QA",
                subGroupId: 3,
                subGroupName: "Manual Testing",
                hoursWorked: 7.0,
                taskCount: 1,
                approvalStatus: "PENDING",
                submittedAt: "2026-05-14T17:45:00Z",
                entries: [
                    { desc: "Sprint 24 test case execution", hours: 7.0, status: "In Progress" }
                ]
            },
            {
                workLogId: 103,
                userId: 4,
                memberName: "Sunita Patel",
                employeeCode: "EMP-00420",
                workDate: "2026-05-13",
                categoryId: 1,
                categoryName: "Development",
                subGroupId: 1,
                subGroupName: "Frontend",
                hoursWorked: 9.0,
                taskCount: 3,
                approvalStatus: "PENDING",
                submittedAt: "2026-05-13T19:00:00Z",
                entries: [
                    { desc: "Dashboard UI redesign", hours: 4.0, status: "Completed" },
                    { desc: "Component library update", hours: 3.5, status: "Completed" },
                    { desc: "Code review", hours: 1.5, status: "Completed" }
                ]
            }
        ],
        teamMembers: [
            { userId: 1, name: "Rahul Kumar", code: "EMP-00412", subGroup: "Backend", totalEods: 45, pending: 1, approved: 42, rejected: 2 },
            { userId: 3, name: "Amit Verma", code: "EMP-00415", subGroup: "Manual Testing", totalEods: 38, pending: 1, approved: 35, rejected: 2 },
            { userId: 4, name: "Sunita Patel", code: "EMP-00420", subGroup: "Frontend", totalEods: 50, pending: 1, approved: 47, rejected: 2 },
            { userId: 5, name: "Vikram Rao", code: "EMP-00425", subGroup: "Automation", totalEods: 30, pending: 0, approved: 28, rejected: 2 },
            { userId: 6, name: "Neha Gupta", code: "EMP-00430", subGroup: "CI/CD", totalEods: 40, pending: 0, approved: 38, rejected: 2 }
        ],
        subGroups: [
            { subGroupId: 1, name: "Frontend", description: "UI/UX Development", icon: "🖥️", memberCount: 3, members: [1, 4] },
            { subGroupId: 2, name: "Backend", description: "Server-side Development", icon: "⚙️", memberCount: 2, members: [1] },
            { subGroupId: 3, name: "Manual Testing", description: "Manual QA Testing", icon: "🧪", memberCount: 2, members: [3] },
            { subGroupId: 4, name: "Automation", description: "Test Automation", icon: "🤖", memberCount: 1, members: [5] },
            { subGroupId: 5, name: "CI/CD", description: "DevOps & Deployment", icon: "🚀", memberCount: 1, members: [6] }
        ],
        availableMembers: [
            { userId: 7, name: "Ravi Mehta", code: "EMP-00435" },
            { userId: 8, name: "Kiran Shah", code: "EMP-00440" },
            { userId: 9, name: "Deepa Nair", code: "EMP-00445" },
            { userId: 10, name: "Arun Joshi", code: "EMP-00450" }
        ]
    };

    /* ── API Config ───────────────────────────────────────── */
    const API = {
        stats: '/api/tl/stats',
        queue: '/api/tl/queue',
        approve: '/api/tl/approve',
        reject: '/api/tl/reject',
        correction: '/api/tl/correction',
        teamMembers: '/api/tl/team-members',
        subGroups: '/api/tl/subgroups',
        createSubGroup: '/api/tl/subgroups/create',
        updateSubGroup: '/api/tl/subgroups/update',
        subGroupMembers: '/api/tl/subgroups/members',
        availableMembers: '/api/tl/members/available'
    };

    /* ── State ────────────────────────────────────────────── */
    let currentFilter = 'today';
    let currentStatusFilter = 'all';
    let selectedWorkLogId = null;
    let currentSubGroupId = null;
    let selectedAvailableMembers = [];
    let selectedAssignedMembers = [];

    /* ── Helpers ───────────────────────────────────────────── */
    function formatDate(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function formatDateTime(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    function showToast(msg) {
        const $t = $('<div class="toast">').text(msg).appendTo('body');
        setTimeout(() => $t.addClass('show'), 10);
        setTimeout(() => { $t.removeClass('show'); setTimeout(() => $t.remove(), 300); }, 2800);
    }

    /* ── Tab Switching ─────────────────────────────────────── */
    $('.tl-tab').on('click', function () {
        const tab = $(this).data('tab');
        $('.tl-tab').removeClass('active');
        $(this).addClass('active');
        $('.tl-tab-content').removeClass('active');
        $(`#tab-${tab}`).addClass('active');

        if (tab === 'approval') loadStats();
        if (tab === 'team') loadTeamMembers();
        if (tab === 'subgroups') loadSubGroups();
    });

    /* ════════════════════════════════════════════════════════
       TAB 1: EOD APPROVAL QUEUE
       ════════════════════════════════════════════════════════ */

    /* ── Load Stats ────────────────────────────────────────── */
    function loadStats() {
        $.ajax({
            url: API.stats,
            method: 'GET',
            dataType: 'json',
            data: { teamLeadId: DEMO.teamLead.userId }
        }).done(function (data) {
            renderStats(data);
        }).fail(function () {
            renderStats(DEMO.stats);
        });
    }

    function renderStats(stats) {
        $('#stat-pending').text(stats.pending || 0);
        $('#stat-approved').text(stats.approved || 0);
        $('#stat-rejected').text(stats.rejected || 0);
        $('#stat-correction').text(stats.correction || 0);
    }

    /* ── Load Queue ────────────────────────────────────────── */
    function loadQueue() {
        const params = {
            teamLeadId: DEMO.teamLead.userId,
            filter: currentFilter,
            status: currentStatusFilter
        };

        $.ajax({
            url: API.queue,
            method: 'GET',
            dataType: 'json',
            data: params
        }).done(function (data) {
            renderQueue(data);
        }).fail(function () {
            // Filter demo data
            let filtered = DEMO.queue;
            if (currentStatusFilter !== 'all') {
                filtered = filtered.filter(q => q.approvalStatus === currentStatusFilter);
            }
            renderQueue(filtered);
        });
    }

    function renderQueue(queue) {
        const $tbody = $('#queue-body');
        if (queue.length === 0) {
            $tbody.html('<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text-3)">No EODs found for selected filter</td></tr>');
            return;
        }

        const html = queue.map(item => {
            const statusClass = item.approvalStatus.toLowerCase();
            const statusText = item.approvalStatus === 'CORRECTION' ? 'Need Correction' : item.approvalStatus;

            return `
                <tr data-logid="${item.workLogId}">
                    <td>
                        <div style="font-weight:600">${item.memberName}</div>
                        <div style="font-size:11px;color:var(--text-3)">${item.employeeCode}</div>
                    </td>
                    <td>${formatDate(item.workDate)}</td>
                    <td>${item.categoryName}</td>
                    <td>${item.subGroupName}</td>
                    <td style="font-family:var(--font-mono);color:var(--gold)">${item.hoursWorked.toFixed(1)}h</td>
                    <td>${item.taskCount}</td>
                    <td><span class="tl-status-badge ${statusClass}">${statusText}</span></td>
                    <td style="font-size:11px;color:var(--text-3)">${formatDateTime(item.submittedAt)}</td>
                    <td>
                        ${item.approvalStatus === 'PENDING' 
                            ? `<button class="tl-action-btn btn-review" data-logid="${item.workLogId}">Review</button>`
                            : `<button class="tl-action-btn btn-view" data-logid="${item.workLogId}">View</button>`
                        }
                    </td>
                </tr>
            `;
        }).join('');

        $tbody.html(html);
    }

    /* ── Filter Handlers ─────────────────────────────────── */
    $('.tl-filter-btn').on('click', function () {
        $('.tl-filter-btn').removeClass('active');
        $(this).addClass('active');
        currentFilter = $(this).data('filter');
        loadQueue();
    });

    $('#status-filter').on('change', function () {
        currentStatusFilter = $(this).val();
        loadQueue();
    });

    /* ── Review Modal ────────────────────────────────────── */
    $(document).on('click', '.btn-review, .btn-view', function () {
        const logId = $(this).data('logid');
        openReviewModal(logId);
    });

    function openReviewModal(logId) {
        selectedWorkLogId = logId;

        // Find in current queue (or fetch from API)
        const item = DEMO.queue.find(q => q.workLogId === logId) || DEMO.queue[0];

        $('#review-member-name').text(item.memberName);
        $('#review-date').text(`EOD for ${formatDate(item.workDate)}`);
        $('#review-category').text(item.categoryName);
        $('#review-subgroup').text(item.subGroupName);
        $('#review-hours').text(`${item.hoursWorked.toFixed(1)}h`);
        $('#review-entry-count').text(`${item.entries.length} entr${item.entries.length === 1 ? 'y' : 'ies'}`);

        // Render entries
        const entriesHtml = item.entries.map(e => `
            <div class="entry-item">
                <div class="entry-main">
                    <div class="entry-desc">${e.desc}</div>
                    <div class="entry-meta">
                        <span>⏱ ${e.hours.toFixed(1)}h</span>
                        <span>Status: ${e.status}</span>
                    </div>
                </div>
                <div class="entry-hours">${e.hours.toFixed(1)}h</div>
            </div>
        `).join('');
        $('#review-entries').html(entriesHtml);

        // Show/hide action buttons based on status
        if (item.approvalStatus === 'PENDING') {
            $('#approval-actions').show();
            $('#actioned-view').hide();
        } else {
            $('#approval-actions').hide();
            $('#actioned-view').show();
            $('#actioned-status').text(`${item.approvalStatus} by ${DEMO.teamLead.name} on ${formatDateTime(item.submittedAt)}`);
            $('#actioned-comment').text(item.approvalComment || 'No comments provided.');
        }

        $('#review-modal').addClass('active');
        $('body').css('overflow', 'hidden');
    }

    function closeReviewModal() {
        $('#review-modal').removeClass('active');
        $('body').css('overflow', '');
        selectedWorkLogId = null;
        $('#approval-comment').val('');
    }

    $('#review-modal-close, #btn-close-review').on('click', closeReviewModal);
    $('#review-modal').on('click', function (e) { if (e.target === this) closeReviewModal(); });

    /* ── Approval Actions ────────────────────────────────── */
    $('#btn-approve').on('click', function () {
        if (!selectedWorkLogId) return;

        const comment = $('#approval-comment').val().trim();

        $.ajax({
            url: API.approve,
            method: 'POST',
            dataType: 'json',
            contentType: 'application/json',
            data: JSON.stringify({
                workLogId: selectedWorkLogId,
                approvedBy: DEMO.teamLead.userId,
                comment: comment,
                approvedAt: new Date().toISOString()
            })
        }).done(function () {
            showToast('EOD Approved successfully!');
            closeReviewModal();
            loadStats();
            loadQueue();
        }).fail(function () {
            // Demo fallback
            showToast('EOD Approved!');
            closeReviewModal();
            // Update local demo data
            const idx = DEMO.queue.findIndex(q => q.workLogId === selectedWorkLogId);
            if (idx >= 0) {
                DEMO.queue[idx].approvalStatus = 'APPROVED';
                DEMO.queue[idx].approvalBy = DEMO.teamLead.name;
                DEMO.stats.pending--;
                DEMO.stats.approved++;
            }
            loadStats();
            loadQueue();
        });
    });

    $('#btn-reject').on('click', function () {
        if (!selectedWorkLogId) return;
        const comment = $('#approval-comment').val().trim();
        if (!comment) {
            showToast('Please provide a reason for rejection');
            return;
        }

        $.ajax({
            url: API.reject,
            method: 'POST',
            dataType: 'json',
            contentType: 'application/json',
            data: JSON.stringify({
                workLogId: selectedWorkLogId,
                rejectedBy: DEMO.teamLead.userId,
                reason: comment,
                rejectedAt: new Date().toISOString()
            })
        }).done(function () {
            showToast('EOD Rejected');
            closeReviewModal();
            loadStats();
            loadQueue();
        }).fail(function () {
            showToast('EOD Rejected');
            closeReviewModal();
            const idx = DEMO.queue.findIndex(q => q.workLogId === selectedWorkLogId);
            if (idx >= 0) {
                DEMO.queue[idx].approvalStatus = 'REJECTED';
                DEMO.queue[idx].reasonForReject = comment;
                DEMO.stats.pending--;
                DEMO.stats.rejected++;
            }
            loadStats();
            loadQueue();
        });
    });

    $('#btn-correction').on('click', function () {
        if (!selectedWorkLogId) return;
        const comment = $('#approval-comment').val().trim();
        if (!comment) {
            showToast('Please specify what needs correction');
            return;
        }

        $.ajax({
            url: API.correction,
            method: 'POST',
            dataType: 'json',
            contentType: 'application/json',
            data: JSON.stringify({
                workLogId: selectedWorkLogId,
                requestedBy: DEMO.teamLead.userId,
                reason: comment,
                requestedAt: new Date().toISOString()
            })
        }).done(function () {
            showToast('Correction requested');
            closeReviewModal();
            loadStats();
            loadQueue();
        }).fail(function () {
            showToast('Correction requested');
            closeReviewModal();
            const idx = DEMO.queue.findIndex(q => q.workLogId === selectedWorkLogId);
            if (idx >= 0) {
                DEMO.queue[idx].approvalStatus = 'CORRECTION';
                DEMO.queue[idx].reasonForReject = comment;
                DEMO.stats.pending--;
                DEMO.stats.correction++;
            }
            loadStats();
            loadQueue();
        });
    });

    /* ════════════════════════════════════════════════════════
       TAB 2: MY TEAM
       ════════════════════════════════════════════════════════ */

    function loadTeamMembers() {
        $.ajax({
            url: API.teamMembers,
            method: 'GET',
            dataType: 'json',
            data: { teamLeadId: DEMO.teamLead.userId }
        }).done(function (data) {
            renderTeamMembers(data);
        }).fail(function () {
            renderTeamMembers(DEMO.teamMembers);
        });
    }

    function renderTeamMembers(members) {
        $('#team-count').text(`${members.length} member${members.length === 1 ? '' : 's'}`);
        const $grid = $('#team-grid');

        const html = members.map(m => `
            <div class="tl-team-card">
                <div class="tl-team-card-header">
                    <div class="tl-team-avatar">${m.name.split(' ').map(n => n[0]).join('')}</div>
                    <div class="tl-team-info">
                        <h4>${m.name}</h4>
                        <p>${m.code} · ${m.subGroup}</p>
                    </div>
                </div>
                <div class="tl-team-stats">
                    <div class="tl-team-stat">
                        <div class="tl-team-stat-value">${m.totalEods}</div>
                        <div class="tl-team-stat-label">Total EODs</div>
                    </div>
                    <div class="tl-team-stat">
                        <div class="tl-team-stat-value" style="color:var(--amber)">${m.pending}</div>
                        <div class="tl-team-stat-label">Pending</div>
                    </div>
                    <div class="tl-team-stat">
                        <div class="tl-team-stat-value" style="color:var(--green)">${m.approved}</div>
                        <div class="tl-team-stat-label">Approved</div>
                    </div>
                </div>
            </div>
        `).join('');

        $grid.html(html);
    }

    /* ════════════════════════════════════════════════════════
       TAB 3: SUB-GROUP MANAGEMENT
       ════════════════════════════════════════════════════════ */

    /* ── Load Sub-Groups ─────────────────────────────────── */
    function loadSubGroups() {
        $.ajax({
            url: API.subGroups,
            method: 'GET',
            dataType: 'json',
            data: { taskGroupId: DEMO.teamLead.taskGroupId }
        }).done(function (data) {
            renderSubGroups(data);
        }).fail(function () {
            renderSubGroups(DEMO.subGroups);
        });
    }

    function renderSubGroups(subGroups) {
        const $grid = $('#subgroup-grid');
        if (subGroups.length === 0) {
            $grid.html('<div style="text-align:center;padding:40px;color:var(--text-3)">No sub-groups created yet</div>');
            return;
        }

        const html = subGroups.map(sg => `
            <div class="tl-subgroup-card" data-subgroupid="${sg.subGroupId}">
                <div class="tl-subgroup-card-header">
                    <div class="tl-subgroup-icon">${sg.icon || '📁'}</div>
                    <button class="tl-subgroup-menu">⋯</button>
                </div>
                <div class="tl-subgroup-name">${sg.name}</div>
                <div class="tl-subgroup-desc">${sg.description || 'No description'}</div>
                <div class="tl-subgroup-members">
                    <div class="tl-member-avatars">
                        ${sg.members.slice(0, 3).map(() => `<div class="tl-member-avatar">👤</div>`).join('')}
                    </div>
                    <span class="tl-member-count">${sg.memberCount} member${sg.memberCount === 1 ? '' : 's'}</span>
                </div>
                <div class="tl-subgroup-actions">
                    <button class="btn-outline btn-sm btn-manage-members" data-subgroupid="${sg.subGroupId}">Manage Members</button>
                    <button class="btn-gold btn-sm">View Details</button>
                </div>
            </div>
        `).join('');

        $grid.html(html);
    }

    /* ── Create Sub-Group ────────────────────────────────── */
    $('#btn-create-subgroup').on('click', function () {
        $('#create-subgroup-form').slideDown(200);
        $('#subgroup-name').focus();
    });

    $('#btn-cancel-create').on('click', function () {
        $('#create-subgroup-form').slideUp(200);
        $('#subgroup-name').val('');
        $('#subgroup-desc').val('');
    });

    $('#btn-save-subgroup').on('click', function () {
        const name = $('#subgroup-name').val().trim();
        const desc = $('#subgroup-desc').val().trim();

        if (!name) {
            showToast('Please enter sub-group name');
            return;
        }

        const data = {
            taskGroupId: DEMO.teamLead.taskGroupId,
            subGroupName: name,
            description: desc,
            createdBy: DEMO.teamLead.userId
        };

        $.ajax({
            url: API.createSubGroup,
            method: 'POST',
            dataType: 'json',
            contentType: 'application/json',
            data: JSON.stringify(data)
        }).done(function (response) {
            showToast('Sub-group created successfully!');
            $('#create-subgroup-form').slideUp(200);
            $('#subgroup-name').val('');
            $('#subgroup-desc').val('');
            loadSubGroups();
        }).fail(function () {
            // Demo fallback
            const newId = Math.max(...DEMO.subGroups.map(s => s.subGroupId), 0) + 1;
            DEMO.subGroups.push({
                subGroupId: newId,
                name: name,
                description: desc,
                icon: '📁',
                memberCount: 0,
                members: []
            });
            showToast('Sub-group created!');
            $('#create-subgroup-form').slideUp(200);
            $('#subgroup-name').val('');
            $('#subgroup-desc').val('');
            renderSubGroups(DEMO.subGroups);
        });
    });

    /* ── Manage Members Modal ────────────────────────────── */
    $(document).on('click', '.btn-manage-members', function () {
        const sgId = $(this).data('subgroupid');
        currentSubGroupId = sgId;
        const subGroup = DEMO.subGroups.find(s => s.subGroupId === sgId);

        $('#subgroup-modal-title').text(`Manage ${subGroup.name} Members`);
        $('#subgroup-modal').addClass('active');
        $('body').css('overflow', 'hidden');

        loadMemberAssignment(sgId);
    });

    function loadMemberAssignment(subGroupId) {
        // In real app: fetch from API
        // For demo: use DEMO data
        const subGroup = DEMO.subGroups.find(s => s.subGroupId === subGroupId);
        const assignedIds = subGroup.members;

        // Available = all members not in this sub-group
        const available = DEMO.availableMembers.filter(m => !assignedIds.includes(m.userId));
        const assigned = [
            ...DEMO.availableMembers.filter(m => assignedIds.includes(m.userId)),
            ...DEMO.teamMembers.filter(m => assignedIds.includes(m.userId))
        ];

        renderAssignList('available-members', available, 'available');
        renderAssignList('assigned-members', assigned, 'assigned');

        selectedAvailableMembers = [];
        selectedAssignedMembers = [];
    }

    function renderAssignList(containerId, members, type) {
        const $container = $(`#${containerId}`);
        if (members.length === 0) {
            $container.html(`<div style="text-align:center;padding:20px;color:var(--text-3);font-size:12px">No members</div>`);
            return;
        }

        const html = members.map(m => `
            <div class="tl-assign-item" data-userid="${m.userId}" data-type="${type}">
                <input type="checkbox" id="chk-${type}-${m.userId}" />
                <label for="chk-${type}-${m.userId}">${m.name} <span style="color:var(--text-3);font-size:11px">${m.code || ''}</span></label>
            </div>
        `).join('');

        $container.html(html);
    }

    // Checkbox selection
    $(document).on('change', '.tl-assign-item input[type="checkbox"]', function () {
        const $item = $(this).closest('.tl-assign-item');
        const userId = parseInt($item.data('userid'));
        const type = $item.data('type');

        if (this.checked) {
            $item.addClass('selected');
            if (type === 'available') selectedAvailableMembers.push(userId);
            else selectedAssignedMembers.push(userId);
        } else {
            $item.removeClass('selected');
            if (type === 'available') selectedAvailableMembers = selectedAvailableMembers.filter(id => id !== userId);
            else selectedAssignedMembers = selectedAssignedMembers.filter(id => id !== userId);
        }
    });

    // Add/Remove buttons
    $('#btn-add-members').on('click', function () {
        if (selectedAvailableMembers.length === 0) {
            showToast('Select members to add');
            return;
        }

        // Move from available to assigned
        const toMove = DEMO.availableMembers.filter(m => selectedAvailableMembers.includes(m.userId));
        const subGroup = DEMO.subGroups.find(s => s.subGroupId === currentSubGroupId);
        subGroup.members.push(...selectedAvailableMembers);
        subGroup.memberCount = subGroup.members.length;

        // Refresh lists
        loadMemberAssignment(currentSubGroupId);
        showToast(`${toMove.length} member(s) added`);
    });

    $('#btn-remove-members').on('click', function () {
        if (selectedAssignedMembers.length === 0) {
            showToast('Select members to remove');
            return;
        }

        const subGroup = DEMO.subGroups.find(s => s.subGroupId === currentSubGroupId);
        subGroup.members = subGroup.members.filter(id => !selectedAssignedMembers.includes(id));
        subGroup.memberCount = subGroup.members.length;

        loadMemberAssignment(currentSubGroupId);
        showToast(`${selectedAssignedMembers.length} member(s) removed`);
    });

    // Save changes
    $('#btn-save-members').on('click', function () {
        const subGroup = DEMO.subGroups.find(s => s.subGroupId === currentSubGroupId);

        $.ajax({
            url: API.subGroupMembers,
            method: 'PUT',
            dataType: 'json',
            contentType: 'application/json',
            data: JSON.stringify({
                subGroupId: currentSubGroupId,
                memberIds: subGroup.members,
                updatedBy: DEMO.teamLead.userId
            })
        }).done(function () {
            showToast('Members updated successfully!');
            closeSubGroupModal();
            loadSubGroups();
        }).fail(function () {
            showToast('Members updated!');
            closeSubGroupModal();
            renderSubGroups(DEMO.subGroups);
        });
    });

    function closeSubGroupModal() {
        $('#subgroup-modal').removeClass('active');
        $('body').css('overflow', '');
        currentSubGroupId = null;
        selectedAvailableMembers = [];
        selectedAssignedMembers = [];
    }

    $('#subgroup-modal-close, #btn-cancel-subgroup').on('click', closeSubGroupModal);
    $('#subgroup-modal').on('click', function (e) { if (e.target === this) closeSubGroupModal(); });

    /* ── Keyboard ─────────────────────────────────────────── */
    $(document).on('keydown', function (e) {
        if (e.key === 'Escape') {
            closeReviewModal();
            closeSubGroupModal();
        }
    });

    /* ── Bootstrap ────────────────────────────────────────── */
    loadStats();
    loadQueue();
});