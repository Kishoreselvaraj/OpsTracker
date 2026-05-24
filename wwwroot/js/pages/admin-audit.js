import { requireAuth } from '../auth/routeGuard.js';
import { hierarchyApi } from '../hierarchy/hierarchyApi.js';
import { renderBreadcrumbs } from '../hierarchy/breadcrumbs.js';
import { pick } from '../hierarchy/caseHelpers.js';
import { showToast } from '../utils/toast.js';
import { getRole } from '../utils/roleHelpers.js';

const roles = getRole() === 'Admin' ? ['Admin'] : ['Admin', 'DepartmentHead'];
if (!requireAuth({ allowRoles: roles })) throw new Error('auth');

renderBreadcrumbs('hierarchy-breadcrumbs', [
    { label: getRole() === 'Admin' ? 'Admin' : 'Department', href: getRole() === 'Admin' ? '/Admin/Dashboard' : '/DeptHead/Dashboard' },
    { label: 'Audit log' }
]);

let page = 1;
const pageSize = 50;

async function load() {
    const action = document.getElementById('audit-action')?.value || '';
    const tbody = document.getElementById('audit-table-body');
    try {
        const { items, totalCount } = await hierarchyApi.listAuditLogs({
            tableName: document.getElementById('audit-table')?.value || null,
            actionType: action || null,
            pageNumber: page,
            pageSize
        });
        document.getElementById('audit-total').textContent = `${totalCount} record(s)`;
        if (!items?.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="hierarchy-empty">No audit entries.</td></tr>';
            return;
        }
        tbody.innerHTML = items.map(row => {
            const at = pick(row, 'actionAt', 'ActionAt', 'createdAt', 'CreatedAt');
            const when = at ? new Date(at).toLocaleString() : '—';
            return `<tr>
                <td>${when}</td>
                <td>${pick(row, 'actionByName', 'ActionByName') || pick(row, 'actionBy', 'ActionBy')}</td>
                <td><code>${pick(row, 'actionType', 'ActionType')}</code></td>
                <td>${pick(row, 'tableName', 'TableName')}</td>
                <td class="small text-secondary">${pick(row, 'recordId', 'RecordId')}</td>
            </tr>`;
        }).join('');
    } catch (e) {
        showToast(e.message, 'error');
        tbody.innerHTML = `<tr><td colspan="5" class="text-danger">${e.message}</td></tr>`;
    }
}

document.getElementById('audit-filter-form')?.addEventListener('submit', e => {
    e.preventDefault();
    page = 1;
    load();
});

document.getElementById('audit-prev')?.addEventListener('click', () => { if (page > 1) { page--; load(); } });
document.getElementById('audit-next')?.addEventListener('click', () => { page++; load(); });

load();
