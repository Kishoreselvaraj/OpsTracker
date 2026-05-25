/**
 * Team Lead — Sub-group management (wired to hierarchy API).
 */
import { apiPost, unwrap } from '/js/services/apiClient.js';
import { hierarchyApi } from '/js/hierarchy/hierarchyApi.js';
import { loadHierarchyContext, effectiveTeamId } from '/js/hierarchy/hierarchyContext.js';
import { renderBreadcrumbs } from '/js/hierarchy/breadcrumbs.js';
import { confirmAction } from '/js/hierarchy/confirm.js';
import { pick, fullName, slugCode } from '/js/hierarchy/caseHelpers.js';
import { getUser } from '/js/auth/authService.js';
import { requireAuth } from '/js/auth/routeGuard.js';
import { showToast } from '/js/utils/toast.js';

if (!requireAuth({ allowRoles: ['TeamLead', 'Admin', 'DepartmentHead'] })) throw new Error('auth');

const state = {
    ctx: null,
    teamId: null,
    teamName: '',
    inheritedGroupName: '',
    subGroups: [],
    assignable: [],
    assigned: [],
    currentSubGroupId: null,
    editingId: null
};

async function bootstrap() {
    state.ctx = await loadHierarchyContext();
    state.teamId = effectiveTeamId(state.ctx);
    const user = getUser();
    $('#nav-user-name').text(user?.name || user?.email || 'Team Lead');

    if (!state.teamId) {
        $('#groups-grid').html('<p class="hierarchy-empty">No team assigned. Contact your department head.</p>');
        $('#btn-create-toggle').prop('disabled', true);
        return;
    }

    try {
        const team = await hierarchyApi.getTeam(state.teamId);
        state.teamName = pick(team, 'teamName', 'TeamName') || 'Team';
        const groupName = pick(team, 'groupName', 'GroupName') || 'Department task group';
        $('#task-group-name').text(`${groupName} · ${state.teamName}`);
        state.inheritedGroupName = groupName;
    } catch {
        $('#task-group-name').text('Your team');
    }

    renderBreadcrumbs('hierarchy-breadcrumbs', [
        { label: 'Team Lead', href: '/tl/Dashboard' },
        { label: state.teamName },
        { label: 'Sub-groups' }
    ]);

    await loadSubGroups();
}

async function loadSubGroups() {
    $('#groups-grid').html('<div class="group-card skeleton" style="height:180px"></div>'.repeat(2));
    try {
        const list = await hierarchyApi.listSubGroups({ teamId: state.teamId });
        state.subGroups = await Promise.all((list ?? []).map(async sg => {
            const id = pick(sg, 'subGroupId', 'SubGroupId');
            let members = [];
            try { members = await hierarchyApi.listSubGroupMembers(id) ?? []; } catch { /* */ }
            return {
                subGroupId: id,
                name: pick(sg, 'subGroupName', 'SubGroupName'),
                description: pick(sg, 'description', 'Description'),
                groupName: pick(sg, 'groupName', 'GroupName') || state.inheritedGroupName,
                memberCount: members.length,
                members
            };
        }));
    } catch (err) {
        showToast(err.message || 'Failed to load sub-groups', 'error');
        state.subGroups = [];
    }
    renderGrid();
}

function renderGrid() {
    const $grid = $('#groups-grid');
    const $empty = $('#empty-state');
    if (!state.subGroups.length) {
        $grid.hide();
        $empty.show();
        return;
    }
    $grid.show();
    $empty.hide();
    $grid.html(state.subGroups.map(sg => `
        <div class="group-card" data-subgroupid="${sg.subGroupId}">
            <div class="group-card-header">
                <div class="group-icon">📁</div>
                <button class="group-menu btn-edit-group" data-subgroupid="${sg.subGroupId}">⋯</button>
            </div>
            <div class="group-name">${escapeHtml(sg.name)}</div>
                    <div class="group-desc">${escapeHtml(sg.description || '')}</div>
                    <div class="small text-secondary">Task group: ${escapeHtml(sg.groupName || state.inheritedGroupName || '')}</div>
            <div class="group-members"><span class="member-count">${sg.memberCount} member(s)</span></div>
            <div class="group-actions">
                <button class="group-btn btn-manage" data-subgroupid="${sg.subGroupId}">Manage members</button>
            </div>
        </div>`).join(''));
}

function escapeHtml(t) {
    const d = document.createElement('div');
    d.textContent = t ?? '';
    return d.innerHTML;
}

$('#btn-create-toggle, #btn-empty-create').on('click', () => {
    $('#create-panel').slideDown(200);
    $('#create-name').focus();
});

$('#btn-create-close, #btn-create-cancel').on('click', () => {
    $('#create-panel').slideUp(200);
    $('#create-name, #create-desc').val('');
});

$('#btn-create-save').on('click', async () => {
    const name = $('#create-name').val().trim();
    if (!name) { showToast('Enter a sub-group name', 'error'); return; }
    try {
        const user = getUser();
        const userId = user?.userId;
        await hierarchyApi.createSubGroup({
            teamId: state.teamId,
            subGroupCode: slugCode(name, 'SG'),
          
            subGroupName: name,
            description: $('#create-desc').val().trim() || null,
            subGroupLeadId:userId,
        });
        showToast('Sub-group created', 'success');
        $('#create-panel').slideUp(200);
        loadSubGroups();
    } catch (err) { showToast(err.message, 'error'); }
});

$(document).on('click', '.btn-edit-group', function () {
    const id = Number($(this).data('subgroupid'));
    const sg = state.subGroups.find(s => s.subGroupId === id);
    if (!sg) return;
    state.editingId = id;
    $('#edit-name').val(sg.name);
    $('#edit-desc').val(sg.description || '');
    $('#edit-modal').addClass('active');
});

$('#btn-edit-save').on('click', async () => {
    if (!state.editingId) return;
    try {
        await hierarchyApi.updateSubGroup({
            subGroupId: state.editingId,
            subGroupName: $('#edit-name').val().trim(),
            description: $('#edit-desc').val().trim() || null
        });
        showToast('Updated', 'success');
        $('#edit-modal').removeClass('active');
        loadSubGroups();
    } catch (err) { showToast(err.message, 'error'); }
});

$('#btn-edit-delete').on('click', async () => {
    const id = state.editingId;
    $('#edit-modal').removeClass('active');
    const sg = state.subGroups.find(s => s.subGroupId === id);
    $('#delete-group-name').text(sg?.name || '');
    state.deletingId = id;
    $('#delete-modal').addClass('active');
});

$('#btn-delete-confirm').on('click', async () => {
    try {
        await hierarchyApi.deleteSubGroup(state.deletingId);
        showToast('Sub-group deleted', 'success');
        $('#delete-modal').removeClass('active');
        loadSubGroups();
    } catch (err) { showToast(err.message, 'error'); }
});

$('.modal-close, #btn-edit-cancel, #btn-delete-cancel, #btn-assign-cancel').on('click', () => {
    $('.modal-overlay').removeClass('active');
});

$(document).on('click', '.btn-manage', async function () {
    state.currentSubGroupId = Number($(this).data('subgroupid'));
    const sg = state.subGroups.find(s => s.subGroupId === state.currentSubGroupId);
    $('#assign-modal-title').text(`Members — ${sg?.name || ''}`);
    try {
        state.assignable = await hierarchyApi.listAssignableMembers(state.teamId, state.currentSubGroupId) ?? [];
        state.assigned = sg?.members ?? [];
        renderAssignLists();
        $('#assign-modal').addClass('active');
    } catch (err) { showToast(err.message, 'error'); }
});

function renderAssignLists() {
    const assignedIds = new Set(state.assigned.map(m => pick(m, 'userId', 'UserId')));
    const available = state.assignable.filter(m => !assignedIds.has(pick(m, 'userId', 'UserId')));
    $('#available-list').html(listHtml(available, 'avail'));
    $('#assigned-list').html(listHtml(state.assigned, 'asgn'));
    $('#available-count').text(available.length);
    $('#assigned-count').text(state.assigned.length);
}

function listHtml(members, type) {
    if (!members.length) return '<div class="text-secondary p-3">None</div>';
    return members.map(m => {
        const id = pick(m, 'userId', 'UserId');
        return `<label class="assign-item d-block p-2"><input type="checkbox" data-type="${type}" data-id="${id}" />
            ${escapeHtml(fullName(m))} <span class="text-secondary small">${pick(m, 'employeeCode', 'EmployeeCode') || ''}</span></label>`;
    }).join('');
}

$('#btn-add-members').on('click', async () => {
    const ids = $('#available-list input:checked').map((_, el) => Number(el.dataset.id)).get();
    for (const userId of ids) {
        try {
            await hierarchyApi.assignSubGroupMember({ subGroupId: state.currentSubGroupId, userId });
        } catch (err) { showToast(err.message, 'error'); return; }
    }
    showToast('Members assigned', 'success');
    await loadSubGroups();
    const sg = state.subGroups.find(s => s.subGroupId === state.currentSubGroupId);
    state.assigned = sg?.members ?? [];
    state.assignable = await hierarchyApi.listAssignableMembers(state.teamId, state.currentSubGroupId);
    renderAssignLists();
});

$('#btn-remove-members').on('click', () => showToast('Unassign via admin or reassign to another sub-group', 'info'));

$('#btn-assign-save').on('click', () => {
    $('#assign-modal').removeClass('active');
    loadSubGroups();
});

$(function () { bootstrap(); });
