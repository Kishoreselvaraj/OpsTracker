import { requireAuth } from '../auth/routeGuard.js';
import { hierarchyApi } from '../hierarchy/hierarchyApi.js';
import { renderBreadcrumbs } from '../hierarchy/breadcrumbs.js';
import { confirmAction } from '../hierarchy/confirm.js';
import { pick, slugCode } from '../hierarchy/caseHelpers.js';
import { showToast } from '../utils/toast.js';

if (!requireAuth({ allowRoles: ['Admin'] })) throw new Error('auth');

const state = { orgs: [], editId: null };
const modal = document.getElementById('org-modal');
const bsModal = modal ? bootstrap.Modal.getOrCreateInstance(modal) : null;

renderBreadcrumbs('hierarchy-breadcrumbs', [
    { label: 'Admin', href: '/Admin/Dashboard' },
    { label: 'Organizations' }
]);

async function load() {
    try {
        state.orgs = await hierarchyApi.listOrganizations() ?? [];
        render();
    } catch (e) {
        showToast(e.message || 'Failed to load organizations', 'error');
    }
}

function render() {
    const tbody = document.getElementById('org-table-body');
    if (!state.orgs.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="hierarchy-empty">No organizations. Create one to enable departments.</td></tr>';
        return;
    }
    tbody.innerHTML = state.orgs.map(o => {
        const id = pick(o, 'organizationId', 'OrganizationId');
        return `<tr>
            <td><strong style="color:var(--gold-2)">${pick(o, 'organizationName', 'OrganizationName')}</strong></td>
            <td>${pick(o, 'organizationCode', 'OrganizationCode')}</td>
            <td class="small text-secondary">${pick(o, 'contactEmail', 'ContactEmail') || '—'}</td>
            <td class="hierarchy-actions">
                <button type="button" class="btn-sm-icon" data-edit="${id}"><i class="fa-solid fa-pen"></i></button>
                <button type="button" class="btn-sm-icon danger" data-del="${id}"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>`;
    }).join('');
}

document.getElementById('btn-org-create')?.addEventListener('click', () => {
    state.editId = null;
    document.getElementById('org-modal-title').textContent = 'Create organization';
    document.getElementById('org-code').value = slugCode('org', 'ORG');
    document.getElementById('org-name').value = '';
    document.getElementById('org-desc').value = '';
    document.getElementById('org-email').value = '';
    document.getElementById('org-phone').value = '';
    bsModal?.show();
});

document.getElementById('org-table-body')?.addEventListener('click', async e => {
    const edit = e.target.closest('[data-edit]');
    const del = e.target.closest('[data-del]');
    if (edit) {
        const id = Number(edit.dataset.edit);
        const o = state.orgs.find(x => Number(pick(x, 'organizationId', 'OrganizationId')) === id);
        state.editId = id;
        document.getElementById('org-modal-title').textContent = 'Edit organization';
        document.getElementById('org-code').value = pick(o, 'organizationCode', 'OrganizationCode') ?? '';
        document.getElementById('org-name').value = pick(o, 'organizationName', 'OrganizationName') ?? '';
        document.getElementById('org-desc').value = pick(o, 'description', 'Description') ?? '';
        document.getElementById('org-email').value = pick(o, 'contactEmail', 'ContactEmail') ?? '';
        document.getElementById('org-phone').value = pick(o, 'contactPhone', 'ContactPhone') ?? '';
        bsModal?.show();
    }
    if (del) {
        const id = Number(del.dataset.del);
        const ok = await confirmAction({ title: 'Deactivate organization?', danger: true, confirmLabel: 'Deactivate' });
        if (!ok) return;
        try {
            await hierarchyApi.deleteOrganization(id);
            showToast('Organization deactivated', 'success');
            load();
        } catch (err) { showToast(err.message, 'error'); }
    }
});

document.getElementById('org-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const body = {
        organizationCode: document.getElementById('org-code').value.trim(),
        organizationName: document.getElementById('org-name').value.trim(),
        description: document.getElementById('org-desc').value.trim() || null,
        contactEmail: document.getElementById('org-email').value.trim() || null,
        contactPhone: document.getElementById('org-phone').value.trim() || null
    };
    try {
        if (state.editId) {
            await hierarchyApi.updateOrganization({ organizationId: state.editId, ...body });
            showToast('Organization updated', 'success');
        } else {
            await hierarchyApi.createOrganization(body);
            showToast('Organization created', 'success');
        }
        bsModal?.hide();
        load();
    } catch (err) { showToast(err.message, 'error'); }
});

load();
