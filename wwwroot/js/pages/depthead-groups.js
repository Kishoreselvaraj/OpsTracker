import { requireAuth } from '../auth/routeGuard.js';
import { hierarchyApi } from '../hierarchy/hierarchyApi.js';
import { loadHierarchyContext, effectiveDepartmentId } from '../hierarchy/hierarchyContext.js';
import { renderBreadcrumbs } from '../hierarchy/breadcrumbs.js';
import { confirmAction } from '../hierarchy/confirm.js';
import { pick, slugCode } from '../hierarchy/caseHelpers.js';
import { showToast } from '../utils/toast.js';
import { getRole } from '../utils/roleHelpers.js';
import { applyPermissionAttributes } from '../hierarchy/uiPermissions.js';

if (!requireAuth({ allowRoles: ['DepartmentHead', 'Admin'] })) throw new Error('auth');
applyPermissionAttributes();

const state = { groups: [], ctx: null, departmentId: null };
const modal = document.getElementById('group-modal');
const bsModal = modal ? bootstrap.Modal.getOrCreateInstance(modal) : null;

async function init() {
    state.ctx = await loadHierarchyContext();
    state.departmentId = effectiveDepartmentId(state.ctx);
    const role = getRole();
    const deptLabel = state.departmentId ? `Department #${state.departmentId}` : 'Your department';

    renderBreadcrumbs('hierarchy-breadcrumbs', [
        { label: role === 'Admin' ? 'Admin' : 'Department', href: role === 'Admin' ? '/Admin/Dashboard' : '/DeptHead/Dashboard' },
        { label: 'Task groups' }
    ]);

    const banner = document.getElementById('ctx-banner');
    if (banner) {
        banner.textContent = role === 'Admin'
            ? 'Admin view: scoped task groups across departments you can access.'
            : `Managing task groups for ${deptLabel}. You cannot access other departments.`;
    }

    await loadGroups();
}

async function loadGroups() {
    try {
        state.groups = await hierarchyApi.listTaskGroups(state.departmentId) ?? [];
        render();
    } catch (e) {
        showToast(e.message || 'Failed to load groups', 'error');
    }
}

function render() {
    const tbody = document.getElementById('group-table-body');
    if (!state.groups.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="hierarchy-empty">No task groups. Create one to add teams.</td></tr>';
        return;
    }
    tbody.innerHTML = state.groups.map(g => {
        const id = pick(g, 'groupId', 'GroupId');
        const name = pick(g, 'groupName', 'GroupName');
        const lead = pick(g, 'teamLeadName', 'TeamLeadName') || '—';
        return `<tr>
            <td><strong style="color:var(--gold-2)">${name}</strong></td>
            <td>${pick(g, 'departmentName', 'DepartmentName') ?? ''}</td>
            <td>${lead}</td>
            <td class="hierarchy-actions">
                <a class="btn-sm-icon" href="/DeptHead/Teams?groupId=${id}" title="Teams"><i class="fa-solid fa-people-group"></i></a>
                <button type="button" class="btn-sm-icon" data-edit="${id}"><i class="fa-solid fa-pen"></i></button>
                <button type="button" class="btn-sm-icon danger" data-del="${id}"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>`;
    }).join('');
}

document.getElementById('btn-group-create')?.addEventListener('click', () => {
    document.getElementById('group-modal-title').textContent = 'Create task group';
    document.getElementById('group-name').value = '';
    document.getElementById('group-desc').value = '';
    state.editId = null;
    bsModal?.show();
});

document.getElementById('group-table-body')?.addEventListener('click', async e => {
    const del = e.target.closest('[data-del]');
    const edit = e.target.closest('[data-edit]');
    if (del) {
        const id = Number(del.dataset.del);
        const ok = await confirmAction({ title: 'Delete task group?', message: 'Teams under this group will be deactivated.', danger: true, confirmLabel: 'Delete' });
        if (!ok) return;
        try {
            await hierarchyApi.deleteTaskGroup(id);
            showToast('Task group deleted', 'success');
            loadGroups();
        } catch (err) { showToast(err.message, 'error'); }
    }
    if (edit) {
        const id = Number(edit.dataset.edit);
        const g = state.groups.find(x => Number(pick(x, 'groupId', 'GroupId')) === id);
        state.editId = id;
        document.getElementById('group-modal-title').textContent = 'Edit task group';
        document.getElementById('group-name').value = pick(g, 'groupName', 'GroupName') ?? '';
        document.getElementById('group-desc').value = pick(g, 'description', 'Description') ?? '';
        bsModal?.show();
    }
});

document.getElementById('group-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    if (!state.departmentId && getRole() !== 'Admin') {
        showToast('No department assigned to your account', 'error');
        return;
    }
    const name = document.getElementById('group-name').value.trim();
    const desc = document.getElementById('group-desc').value.trim();
    try {
        if (state.editId) {
            await hierarchyApi.updateTaskGroup({ groupId: state.editId, groupName: name, description: desc || null });
            showToast('Task group updated', 'success');
        } else {
            await hierarchyApi.createTaskGroup({
                departmentId: state.departmentId || Number(new URLSearchParams(location.search).get('departmentId')),
                groupName: name,
                description: desc || null
            });
            showToast('Task group created', 'success');
        }
        bsModal?.hide();
        loadGroups();
    } catch (err) { showToast(err.message, 'error'); }
});

init();
