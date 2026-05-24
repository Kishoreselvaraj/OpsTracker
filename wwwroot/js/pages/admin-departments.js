import { requireAuth } from '../auth/routeGuard.js';
import { hierarchyApi } from '../hierarchy/hierarchyApi.js';
import { renderBreadcrumbs } from '../hierarchy/breadcrumbs.js';
import { confirmAction } from '../hierarchy/confirm.js';
import { pick, fullName, slugCode } from '../hierarchy/caseHelpers.js';
import { showToast } from '../utils/toast.js';

if (!requireAuth({ allowRoles: ['Admin'] })) throw new Error('auth');

const state = { departments: [], organizations: [], users: [], editingId: null, mode: 'create', assignDeptId: null };
const modalEl = document.getElementById('dept-modal');
const bsModal = modalEl ? bootstrap.Modal.getOrCreateInstance(modalEl) : null;

renderBreadcrumbs('hierarchy-breadcrumbs', [
    { label: 'Admin', href: '/Admin/Dashboard' },
    { label: 'Departments' }
]);

async function load() {
    try {
        const [orgs, depts, users] = await Promise.all([
            hierarchyApi.listOrganizations(),
            hierarchyApi.listDepartments(),
            hierarchyApi.listUsers({})
        ]);
        state.organizations = orgs ?? [];
        state.departments = depts ?? [];
        state.users = users ?? [];
        fillOrgSelect();
        renderTable();
    } catch (e) {
        showToast(e.message || 'Failed to load departments', 'error');
        document.getElementById('dept-table-body').innerHTML =
            `<tr><td colspan="5" class="text-danger">${e.message}</td></tr>`;
    }
}

function fillOrgSelect() {
    const sel = document.getElementById('dept-org-id');
    const btnCreate = document.getElementById('btn-dept-create');
    if (!sel) return;
    if (!state.organizations.length) {
        sel.innerHTML = '<option value="">No organization — add one under Organizations first</option>';
        sel.removeAttribute('required');
        if (btnCreate) btnCreate.disabled = true;
        return;
    }
    if (btnCreate) btnCreate.disabled = false;
    sel.setAttribute('required', 'required');
    sel.innerHTML = state.organizations.map(o => {
        const id = pick(o, 'organizationId', 'OrganizationId');
        const name = pick(o, 'organizationName', 'OrganizationName');
        return `<option value="${id}">${name}</option>`;
    }).join('');
}

function deptHeadCandidates() {
    return state.users.filter(u => {
        const role = String(pick(u, 'role', 'Role') ?? '');
        return /department\s*head|departmenthead|admin/i.test(role) || !role;
    });
}

function renderTable() {
    const tbody = document.getElementById('dept-table-body');
    if (!state.departments.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="hierarchy-empty">No departments yet. Create one to assign a department head.</td></tr>';
        return;
    }
    tbody.innerHTML = state.departments.map(d => {
        const id = pick(d, 'departmentId', 'DepartmentId');
        const name = pick(d, 'departmentName', 'DepartmentName');
        const code = pick(d, 'departmentCode', 'DepartmentCode');
        const head = pick(d, 'departmentHeadName', 'DepartmentHeadName') || '—';
        return `<tr>
            <td><strong style="color:var(--gold-2)">${name}</strong><div class="small text-secondary">${code}</div></td>
            <td>${head}</td>
            <td><span class="badge" style="background:var(--gold-gradient-soft);color:var(--gold-2)">Active</span></td>
            <td class="hierarchy-actions">
                <button type="button" class="btn-sm-icon" data-action="assign" data-id="${id}" title="Assign head"><i class="fa-solid fa-user-tie"></i></button>
                <button type="button" class="btn-sm-icon" data-action="edit" data-id="${id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
                <button type="button" class="btn-sm-icon danger" data-action="delete" data-id="${id}" title="Deactivate"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>`;
    }).join('');
}

function setDeptFormRequired(mode) {
    document.querySelectorAll('#dept-form [required]').forEach(el => el.removeAttribute('required'));
    if (mode === 'create') {
        ['dept-org-id', 'dept-code', 'dept-name'].forEach(id => document.getElementById(id)?.setAttribute('required', 'required'));
    } else if (mode === 'edit') {
        document.getElementById('dept-edit-name')?.setAttribute('required', 'required');
    } else if (mode === 'assign') {
        document.getElementById('dept-head-id')?.setAttribute('required', 'required');
    }
}

function openModal(mode, dept = null) {
    state.mode = mode;
    state.editingId = mode === 'edit' ? pick(dept, 'departmentId', 'DepartmentId') : null;
    state.assignDeptId = mode === 'assign' ? pick(dept, 'departmentId', 'DepartmentId') : null;
    document.getElementById('dept-modal-title').textContent =
        mode === 'edit' ? 'Edit department' : mode === 'assign' ? 'Assign department head' : 'Create department';
    document.getElementById('dept-form-create').classList.toggle('d-none', mode !== 'create');
    document.getElementById('dept-form-edit').classList.toggle('d-none', mode !== 'edit');
    document.getElementById('dept-form-assign').classList.toggle('d-none', mode !== 'assign');
    setDeptFormRequired(mode);

    if (mode === 'create') {
        document.getElementById('dept-name').value = '';
        document.getElementById('dept-code').value = slugCode('dept', 'DEPT').slice(0, 20);
        document.getElementById('dept-desc').value = '';
    }
    if (mode === 'edit' && dept) {
        document.getElementById('dept-edit-name').value = pick(dept, 'departmentName', 'DepartmentName') ?? '';
        document.getElementById('dept-edit-desc').value = pick(dept, 'description', 'Description') ?? '';
    }
    if (mode === 'assign') {
        const sel = document.getElementById('dept-head-id');
        sel.innerHTML = '<option value="">Select user…</option>' + deptHeadCandidates().map(u => {
            const id = pick(u, 'userId', 'UserId');
            return `<option value="${id}">${fullName(u)} (${pick(u, 'email', 'Email')})</option>`;
        }).join('');
        if (dept) {
            const hid = pick(dept, 'departmentHeadId', 'DepartmentHeadId');
            if (hid) sel.value = String(hid);
        }
    }
    bsModal?.show();
}

document.getElementById('btn-dept-create')?.addEventListener('click', () => openModal('create'));

document.getElementById('dept-table-body')?.addEventListener('click', async e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    const dept = state.departments.find(d => Number(pick(d, 'departmentId', 'DepartmentId')) === id);
    const action = btn.dataset.action;
    if (action === 'edit') openModal('edit', dept);
    if (action === 'assign') { state.assignDeptId = id; openModal('assign', dept); }
    if (action === 'delete') {
        const ok = await confirmAction({
            title: 'Deactivate department?',
            message: 'This soft-deletes the department and related active flags. Continue?',
            confirmLabel: 'Deactivate',
            danger: true
        });
        if (!ok) return;
        try {
            const r = await hierarchyApi.deleteDepartment(id);
            showToast(r.message || 'Department deactivated', 'success');
            load();
        } catch (err) {
            showToast(err.message || 'Delete failed', 'error');
        }
    }
});

document.getElementById('dept-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    try {
        if (state.mode === 'create') {
            const orgId = Number(document.getElementById('dept-org-id').value);
            if (!orgId || Number.isNaN(orgId)) {
                showToast('Select an organization first (Admin → Organizations).', 'error');
                return;
            }
            const code = document.getElementById('dept-code').value.trim()
                || slugCode(document.getElementById('dept-name').value.trim(), 'DEPT');
            const r = await hierarchyApi.createDepartment({
                organizationId: orgId,
                departmentCode: code,
                departmentName: document.getElementById('dept-name').value.trim(),
                description: document.getElementById('dept-desc').value.trim() || null
            });
            showToast(r.message || 'Department created', 'success');
        } else if (state.mode === 'edit') {
            const r = await hierarchyApi.updateDepartment({
                departmentId: state.editingId,
                departmentName: document.getElementById('dept-edit-name').value.trim(),
                description: document.getElementById('dept-edit-desc').value.trim() || null
            });
            showToast(r.message || 'Updated', 'success');
        } else if (state.mode === 'assign') {
            const r = await hierarchyApi.assignDepartmentHead({
                departmentId: state.assignDeptId,
                departmentHeadId: Number(document.getElementById('dept-head-id').value)
            });
            showToast(r.message || 'Department head assigned', 'success');
        }
        bsModal?.hide();
        load();
    } catch (err) {
        const msg = err?.message || err?.Message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
        showToast(msg || 'Save failed', 'error');
        console.error('Department save error:', err);
    }
});

load();
