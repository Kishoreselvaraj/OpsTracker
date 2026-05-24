/* ============================================================
   Aetram OpsTracker — Team Lead Groups Page JS
   jQuery + AJAX with demo data fallback
   ============================================================ */

import { postWithAuth } from '/js/services/apiService.js';
import { unwrap } from '/js/services/apiClient.js';
import { getUser } from '/js/auth/authService.js';
import { requireAuth } from '/js/auth/routeGuard.js';
import { showToast } from '/js/utils/toast.js';

$(function () {

    /* ── API Config ───────────────────────────────────────── */
    const API = {
        subGroups: '/api/SubGroup/list',
        createSubGroup: '/api/SubGroup/create',
        updateSubGroup: '/api/SubGroup/update',
        assignMember: '/api/SubGroup/assign-member',
        teamMembers: '/api/Approval/GetTeamLeadMembersWorkLogs'
    };

    /* ── Demo Data ────────────────────────────────────────── */
    const DEMO = {
        teamLead: { userId: 2, name: "Priya Sharma", employeeCode: "EMP-00101", taskGroupId: 1, taskGroupName: "India" },
        subGroups: [
            {
                subGroupId: 1, name: "Frontend", description: "UI/UX Development", icon: "🖥️",
                memberCount: 3, members: [4, 8, 9]
            },
            {
                subGroupId: 2, name: "Backend", description: "Server-side Development", icon: "⚙️",
                memberCount: 2, members: [1, 7]
            },
            {
                subGroupId: 3, name: "Manual Testing", description: "Manual QA Testing", icon: "🧪",
                memberCount: 2, members: [3, 9]
            },
            {
                subGroupId: 4, name: "Automation", description: "Test Automation", icon: "🤖",
                memberCount: 1, members: [5]
            },
            {
                subGroupId: 5, name: "CI/CD", description: "DevOps & Deployment", icon: "🚀",
                memberCount: 1, members: [6]
            }
        ],
        allMembers: [
            { userId: 1, name: "Rahul Kumar", code: "EMP-00412" },
            { userId: 3, name: "Amit Verma", code: "EMP-00415" },
            { userId: 4, name: "Sunita Patel", code: "EMP-00420" },
            { userId: 5, name: "Vikram Rao", code: "EMP-00425" },
            { userId: 6, name: "Neha Gupta", code: "EMP-00430" },
            { userId: 7, name: "Ravi Mehta", code: "EMP-00435" },
            { userId: 8, name: "Kiran Shah", code: "EMP-00440" },
            { userId: 9, name: "Deepa Nair", code: "EMP-00445" },
            { userId: 10, name: "Arun Joshi", code: "EMP-00450" }
        ]
    };

    /* ── State ────────────────────────────────────────────── */
    let currentUser = null;
    let subGroups = [];
    let allMembers = [];
    let currentSubGroupId = null;
    let selectedAvailable = [];
    let selectedAssigned = [];
    let selectedIcon = '📁';
    let editingGroupId = null;
    let deletingGroupId = null;

    /* ── Helpers ───────────────────────────────────────────── */
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
        if (currentUser) {
            $('#nav-user-name').text(currentUser.name || 'Team Lead');
            $('#task-group-name').text(currentUser.taskGroupName || 'India');
        }
    }

    /* ── Load Sub-Groups ───────────────────────────────────── */
    async function loadSubGroups() {
        $('#groups-grid').html(
            Array(4).fill('<div class="group-card skeleton" style="height:200px"></div>').join('')
        );

        try {
            const response = await postWithAuth(API.subGroups, {});
            subGroups = (unwrap(response).data || []).map(sg => ({
                subGroupId: sg.subGroupId ?? sg.SubGroupId,
                name: sg.subGroupName ?? sg.SubGroupName,
                code: sg.subGroupCode ?? sg.SubGroupCode,
                teamName: sg.teamName ?? sg.TeamName,
                memberCount: 0
            }));
        } catch (err) {
            subGroups = [];
            showToast(err.message || 'Failed to load sub-groups', 'error');
        }
        renderSubGroups();
    }

    /* ── Load All Members ──────────────────────────────────── */
    async function loadAllMembers() {
        try {
            const response = await getWithAuth(API.teamMembers + '?teamLeadId=' + (currentUser?.userId || 2));
            allMembers = response.data || response;
        } catch (err) {
            allMembers = DEMO.allMembers;
        }
    }

    /* ── Render Sub-Groups ─────────────────────────────────── */
    function renderSubGroups() {
        const $grid = $('#groups-grid');
        const $empty = $('#empty-state');

        if (subGroups.length === 0) {
            $grid.hide();
            $empty.show();
            return;
        }

        $grid.show();
        $empty.hide();

        const html = subGroups.map((sg, index) => {
            const memberAvatars = sg.members.slice(0, 3).map(userId => {
                const member = allMembers.find(m => m.userId === userId);
                const initials = member ? getInitials(member.name) : '?';
                return `<div class="member-avatar" title="${member ? escapeHtml(member.name) : ''}">${escapeHtml(initials)}</div>`;
            }).join('');

            const extraCount = sg.members.length > 3 ? sg.members.length - 3 : 0;

            return `
                <div class="group-card" data-subgroupid="${sg.subGroupId}" style="animation-delay:${index * 0.05}s">
                    <div class="group-card-header">
                        <div class="group-icon">${sg.icon || '📁'}</div>
                        <button class="group-menu btn-edit-group" data-subgroupid="${sg.subGroupId}" title="Edit">⋯</button>
                    </div>
                    <div class="group-name">${escapeHtml(sg.name)}</div>
                    <div class="group-desc">${escapeHtml(sg.description || 'No description')}</div>
                    <div class="group-members">
                        <div class="member-avatars">
                            ${memberAvatars}
                            ${extraCount > 0 ? `<div class="member-avatar" style="background:var(--surface-3);color:var(--text-2)">+${extraCount}</div>` : ''}
                        </div>
                        <span class="member-count">${sg.memberCount} member${sg.memberCount === 1 ? '' : 's'}</span>
                    </div>
                    <div class="group-actions">
                        <button class="group-btn btn-manage" data-subgroupid="${sg.subGroupId}">Manage Members</button>
                        <button class="group-btn primary btn-view" data-subgroupid="${sg.subGroupId}">View Details</button>
                    </div>
                </div>
            `;
        }).join('');

        $grid.html(html);
    }

    /* ── Create Panel Toggle ───────────────────────────────── */
    $('#btn-create-toggle, #btn-empty-create').on('click', function () {
        $('#create-panel').slideDown(300);
        $('#create-name').focus();
    });

    $('#btn-create-close, #btn-create-cancel').on('click', function () {
        $('#create-panel').slideUp(300);
        resetCreateForm();
    });

    function resetCreateForm() {
        $('#create-name').val('');
        $('#create-desc').val('');
        selectedIcon = '📁';
        $('.icon-option').removeClass('active').first().addClass('active');
    }

    /* ── Icon Picker ───────────────────────────────────────── */
    $(document).on('click', '.icon-option', function () {
        $(this).closest('.icon-picker').find('.icon-option').removeClass('active');
        $(this).addClass('active');
        selectedIcon = $(this).data('icon');
    });

    /* ── Create Sub-Group ──────────────────────────────────── */
    $('#btn-create-save').on('click', async function () {
        const name = $('#create-name').val().trim();
        const desc = $('#create-desc').val().trim();

        if (!name) {
            showToast('Please enter a sub-group name');
            return;
        }

        const data = {
            taskGroupId: currentUser?.taskGroupId || 1,
            subGroupName: name,
            description: desc,
            icon: selectedIcon,
            createdBy: currentUser?.userId || 2
        };

        try {
            await postWithAuth(API.createSubGroup, data);
            showToast('Sub-group created successfully!');
        } catch (err) {
            const newId = Math.max(...subGroups.map(s => s.subGroupId), 0) + 1;
            subGroups.push({
                subGroupId: newId, name: name, description: desc,
                icon: selectedIcon, memberCount: 0, members: []
            });
            showToast('Sub-group created!');
            renderSubGroups();
        }

        $('#create-panel').slideUp(300);
        resetCreateForm();
        loadSubGroups();
    });

    /* ── Edit Group Modal ──────────────────────────────────── */
    $(document).on('click', '.btn-edit-group', function (e) {
        e.stopPropagation();
        const sgId = $(this).data('subgroupid');
        const group = subGroups.find(s => s.subGroupId === sgId);
        if (!group) return;

        editingGroupId = sgId;
        $('#edit-name').val(group.name);
        $('#edit-desc').val(group.description || '');

        // Set icon
        $('#edit-icon-picker .icon-option').removeClass('active');
        $(`#edit-icon-picker .icon-option[data-icon="${group.icon}"]`).addClass('active');

        $('#edit-modal').addClass('active');
        $('body').css('overflow', 'hidden');
    });

    function closeEditModal() {
        $('#edit-modal').removeClass('active');
        $('body').css('overflow', '');
        editingGroupId = null;
    }

    $('#edit-modal-close, #btn-edit-cancel').on('click', closeEditModal);
    $('#edit-modal').on('click', function (e) { if (e.target === this) closeEditModal(); });

    $('#btn-edit-save').on('click', async function () {
        if (!editingGroupId) return;
        const name = $('#edit-name').val().trim();
        const desc = $('#edit-desc').val().trim();
        const icon = $('#edit-icon-picker .icon-option.active').data('icon') || '📁';

        if (!name) {
            showToast('Please enter a sub-group name');
            return;
        }

        try {
            await postWithAuth(API.updateSubGroup, {
                subGroupId: editingGroupId,
                subGroupName: name,
                description: desc,
                icon: icon,
                updatedBy: currentUser?.userId || 2
            });
            showToast('Sub-group updated!');
        } catch (err) {
            const idx = subGroups.findIndex(s => s.subGroupId === editingGroupId);
            if (idx >= 0) {
                subGroups[idx].name = name;
                subGroups[idx].description = desc;
                subGroups[idx].icon = icon;
            }
            showToast('Sub-group updated!');
            renderSubGroups();
        }

        closeEditModal();
        loadSubGroups();
    });

    /* ── Delete Group ──────────────────────────────────────── */
    $('#btn-edit-delete').on('click', function () {
        closeEditModal();
        const group = subGroups.find(s => s.subGroupId === editingGroupId);
        if (!group) return;

        deletingGroupId = editingGroupId;
        $('#delete-group-name').text(group.name);
        $('#delete-modal').addClass('active');
        $('body').css('overflow', 'hidden');
    });

    function closeDeleteModal() {
        $('#delete-modal').removeClass('active');
        $('body').css('overflow', '');
        deletingGroupId = null;
    }

    $('#btn-delete-cancel').on('click', closeDeleteModal);
    $('#delete-modal').on('click', function (e) { if (e.target === this) closeDeleteModal(); });

    $('#btn-delete-confirm').on('click', async function () {
        if (!deletingGroupId) return;

        try {
            await deleteWithAuth(API.deleteSubGroup, { subGroupId: deletingGroupId });
            showToast('Sub-group deleted!');
        } catch (err) {
            subGroups = subGroups.filter(s => s.subGroupId !== deletingGroupId);
            showToast('Sub-group deleted!');
            renderSubGroups();
        }

        closeDeleteModal();
        loadSubGroups();
    });

    /* ── Member Assignment Modal ───────────────────────────── */
    $(document).on('click', '.btn-manage', function (e) {
        e.stopPropagation();
        const sgId = $(this).data('subgroupid');
        openAssignModal(sgId);
    });

    function openAssignModal(sgId) {
        currentSubGroupId = sgId;
        const group = subGroups.find(s => s.subGroupId === sgId);
        if (!group) return;

        $('#assign-modal-title').text(`Manage ${group.name} Members`);
        selectedAvailable = [];
        selectedAssigned = [];

        renderAssignLists(group);

        $('#assign-modal').addClass('active');
        $('body').css('overflow', 'hidden');
    }

    function renderAssignLists(group) {
        const assignedIds = group.members || [];
        const available = allMembers.filter(m => !assignedIds.includes(m.userId));
        const assigned = allMembers.filter(m => assignedIds.includes(m.userId));

        renderList('available-list', available, 'available');
        renderList('assigned-list', assigned, 'assigned');

        $('#available-count').text(available.length);
        $('#assigned-count').text(assigned.length);
    }

    function renderList(containerId, members, type) {
        const $container = $(`#${containerId}`);
        if (members.length === 0) {
            $container.html(`<div style="text-align:center;padding:20px;color:var(--text-3);font-size:var(--text-sm)">No members</div>`);
            return;
        }

        const selectedArray = type === 'available' ? selectedAvailable : selectedAssigned;

        const html = members.map(m => {
            const isSelected = selectedArray.includes(m.userId);
            return `
                <div class="assign-item ${isSelected ? 'selected' : ''}" data-userid="${m.userId}" data-type="${type}">
                    <input type="checkbox" ${isSelected ? 'checked' : ''} />
                    <label>${escapeHtml(m.name)}</label>
                    <span class="assign-item-code">${escapeHtml(m.code)}</span>
                </div>
            `;
        }).join('');

        $container.html(html);
    }

    // Checkbox selection in assign modal
    $(document).on('click', '.assign-item', function (e) {
        if (e.target.tagName === 'INPUT') return;
        $(this).find('input[type="checkbox"]').trigger('click');
    });

    $(document).on('change', '.assign-item input[type="checkbox"]', function () {
        const $item = $(this).closest('.assign-item');
        const userId = parseInt($item.data('userid'));
        const type = $item.data('type');
        const selectedArray = type === 'available' ? selectedAvailable : selectedAssigned;

        if ($(this).prop('checked')) {
            if (!selectedArray.includes(userId)) selectedArray.push(userId);
            $item.addClass('selected');
        } else {
            const idx = selectedArray.indexOf(userId);
            if (idx >= 0) selectedArray.splice(idx, 1);
            $item.removeClass('selected');
        }
    });

    // Transfer buttons
    $('#btn-add-members').on('click', function () {
        if (selectedAvailable.length === 0) {
            showToast('Select members to add');
            return;
        }

        const group = subGroups.find(s => s.subGroupId === currentSubGroupId);
        if (!group) return;

        group.members = [...new Set([...group.members, ...selectedAvailable])];
        group.memberCount = group.members.length;
        selectedAvailable = [];

        renderAssignLists(group);
        showToast(`${selectedAvailable.length} member(s) added`);
    });

    $('#btn-remove-members').on('click', function () {
        if (selectedAssigned.length === 0) {
            showToast('Select members to remove');
            return;
        }

        const group = subGroups.find(s => s.subGroupId === currentSubGroupId);
        if (!group) return;

        group.members = group.members.filter(id => !selectedAssigned.includes(id));
        group.memberCount = group.members.length;
        selectedAssigned = [];

        renderAssignLists(group);
        showToast(`${selectedAssigned.length} member(s) removed`);
    });

    // Search in assign lists
    $('#available-search').on('input', function () {
        const search = $(this).val().toLowerCase();
        $('#available-list .assign-item').each(function () {
            const text = $(this).text().toLowerCase();
            $(this).toggle(text.includes(search));
        });
    });

    $('#assigned-search').on('input', function () {
        const search = $(this).val().toLowerCase();
        $('#assigned-list .assign-item').each(function () {
            const text = $(this).text().toLowerCase();
            $(this).toggle(text.includes(search));
        });
    });

    // Save assignment
    $('#btn-assign-save').on('click', async function () {
        const group = subGroups.find(s => s.subGroupId === currentSubGroupId);
        if (!group) return;

        try {
            await postWithAuth(API.subGroupMembers, {
                subGroupId: currentSubGroupId,
                memberIds: group.members,
                updatedBy: currentUser?.userId || 2
            });
            showToast('Members updated successfully!');
        } catch (err) {
            showToast('Members updated!');
            renderSubGroups();
        }

        closeAssignModal();
    });

    function closeAssignModal() {
        $('#assign-modal').removeClass('active');
        $('body').css('overflow', '');
        currentSubGroupId = null;
        selectedAvailable = [];
        selectedAssigned = [];
    }

    $('#assign-modal-close, #btn-assign-cancel').on('click', closeAssignModal);
    $('#assign-modal').on('click', function (e) { if (e.target === this) closeAssignModal(); });

    /* ── View Details (placeholder) ────────────────────────── */
    $(document).on('click', '.btn-view', function (e) {
        e.stopPropagation();
        const sgId = $(this).data('subgroupid');
        const group = subGroups.find(s => s.subGroupId === sgId);
        showToast(`${group.name} details coming soon`);
    });

    /* ── Keyboard ──────────────────────────────────────────── */
    $(document).on('keydown', function (e) {
        if (e.key === 'Escape') {
            closeEditModal();
            closeDeleteModal();
            closeAssignModal();
        }
    });

    /* ── Bootstrap ─────────────────────────────────────────── */
    if (!requireAuth({ minRole: 'TeamLead' })) return;
    loadUser();
    loadAllMembers();
    loadSubGroups();
});