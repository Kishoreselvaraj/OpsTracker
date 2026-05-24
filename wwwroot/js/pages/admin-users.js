import { requireAuth } from '../auth/routeGuard.js';
import { hierarchyApi } from '../hierarchy/hierarchyApi.js';
import { renderBreadcrumbs } from '../hierarchy/breadcrumbs.js';
import { confirmAction } from '../hierarchy/confirm.js';
import { pick, fullName } from '../hierarchy/caseHelpers.js';
import { showToast } from '../utils/toast.js';

if (!requireAuth({ allowRoles: ['Admin'] })) throw new Error('auth');

const state = { users: [], editId: null };
const modal = document.getElementById('user-modal');
const bsModal = modal ? bootstrap.Modal.getOrCreateInstance(modal) : null;

renderBreadcrumbs('hierarchy-breadcrumbs', [
    { label: 'Admin', href: '/Admin/Dashboard' },
    { label: 'Users' }
]);

async function load() {
    try {
        state.users = await hierarchyApi.listUsers({}) ?? [];
        render();
    } catch (e) {
        showToast(e.message || 'Failed to load users', 'error');
    }
}

function render() {
    const tbody = document.getElementById('user-table-body');
    if (!state.users.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="hierarchy-empty">No users found.</td></tr>';
        return;
    }
    tbody.innerHTML = state.users.map(u => {
        const id = pick(u, 'userId', 'UserId');
        const active = pick(u, 'isActive', 'IsActive') !== false;
        return `<tr>
            <td><strong>${fullName(u)}</strong><div class="small text-secondary">${pick(u, 'email', 'Email')}</div></td>
            <td><span class="badge" style="background:var(--gold-gradient-soft);color:var(--gold-2)">${pick(u, 'role', 'Role')}</span></td>
            <td class="small">${pick(u, 'departmentName', 'DepartmentName') || '—'} / ${pick(u, 'teamName', 'TeamName') || '—'}</td>
            <td>${active ? 'Active' : 'Inactive'}</td>
            <td class="hierarchy-actions">
                <button type="button" class="btn-sm-icon" data-edit="${id}"><i class="fa-solid fa-pen"></i></button>
                <button type="button" class="btn-sm-icon danger" data-del="${id}"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>`;
    }).join('');
}

function openCreate() {
    state.editId = null;
    document.getElementById('user-modal-title').textContent = 'Create user';
    document.getElementById('user-first').value = '';
    document.getElementById('user-last').value = '';
    document.getElementById('user-email').value = '';
    document.getElementById('user-role').value = 'Member';
    document.getElementById('user-password').value = '';
    document.getElementById('user-password').required = true;
    document.getElementById('user-code').value = '';
    document.getElementById('user-dept').value = '';
    document.getElementById('user-group').value = '';
    document.getElementById('user-team').value = '';
    document.getElementById('user-subgroup').value = '';
    bsModal?.show();
}

function openEdit(u) {
    state.editId = pick(u, 'userId', 'UserId');
    document.getElementById('user-modal-title').textContent = 'Edit user';
    document.getElementById('user-first').value = pick(u, 'firstName', 'FirstName') ?? '';
    document.getElementById('user-last').value = pick(u, 'lastName', 'LastName') ?? '';
    document.getElementById('user-email').value = pick(u, 'email', 'Email') ?? '';
    document.getElementById('user-role').value = pick(u, 'role', 'Role') ?? 'Member';
    document.getElementById('user-password').value = '';
    document.getElementById('user-password').required = false;
    document.getElementById('user-code').value = pick(u, 'employeeCode', 'EmployeeCode') ?? '';
    document.getElementById('user-dept').value = pick(u, 'departmentId', 'DepartmentId') ?? '';
    document.getElementById('user-group').value = pick(u, 'groupId', 'GroupId') ?? '';
    document.getElementById('user-team').value = pick(u, 'teamId', 'TeamId') ?? '';
    document.getElementById('user-subgroup').value = pick(u, 'subGroupId', 'SubGroupId') ?? '';
    bsModal?.show();
}

function numOrNull(id) {
    const v = document.getElementById(id).value;
    return v === '' ? null : Number(v);
}

document.getElementById('btn-user-create')?.addEventListener('click', openCreate);

document.getElementById('user-table-body')?.addEventListener('click', async e => {
    const edit = e.target.closest('[data-edit]');
    const del = e.target.closest('[data-del]');
    if (edit) {
        const u = state.users.find(x => Number(pick(x, 'userId', 'UserId')) === Number(edit.dataset.edit));
        if (u) openEdit(u);
    }
    if (del) {
        const id = Number(del.dataset.del);
        const ok = await confirmAction({ title: 'Deactivate user?', danger: true, confirmLabel: 'Deactivate' });
        if (!ok) return;
        try {
            await hierarchyApi.deleteUser(id);
            showToast('User deactivated', 'success');
            load();
        } catch (err) { showToast(err.message, 'error'); }
    }
});

document.getElementById('user-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    try {
        if (state.editId) {
            const pwd = document.getElementById('user-password').value;
            await hierarchyApi.updateUser({
                userId: state.editId,
                firstName: document.getElementById('user-first').value.trim(),
                lastName: document.getElementById('user-last').value.trim() || null,
                email: document.getElementById('user-email').value.trim(),
                role: document.getElementById('user-role').value,
                employeeCode: document.getElementById('user-code').value.trim() || null,
                password: pwd || null,
                departmentId: numOrNull('user-dept'),
                groupId: numOrNull('user-group'),
                teamId: numOrNull('user-team'),
                subGroupId: numOrNull('user-subgroup')
            });
            showToast('User updated', 'success');
        } else {
            const pwd = document.getElementById('user-password').value;
            if (!pwd || pwd.length < 6) {
                showToast('Password must be at least 6 characters', 'error');
                return;
            }
            await hierarchyApi.createUser({
                firstName: document.getElementById('user-first').value.trim(),
                lastName: document.getElementById('user-last').value.trim() || null,
                email: document.getElementById('user-email').value.trim(),
                password: pwd,
                role: document.getElementById('user-role').value,
                employeeCode: document.getElementById('user-code').value.trim() || null,
                departmentId: numOrNull('user-dept'),
                groupId: numOrNull('user-group'),
                teamId: numOrNull('user-team'),
                subGroupId: numOrNull('user-subgroup')
            });
            showToast('User created', 'success');
        }
        bsModal?.hide();
        load();
    } catch (err) {
        showToast(err.message || 'Save failed', 'error');
    }
});

load();
