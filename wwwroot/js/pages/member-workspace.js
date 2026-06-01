import { requireAuth } from '../auth/routeGuard.js';
import { loadHierarchyContext } from '../hierarchy/hierarchyContext.js';
import { hierarchyApi } from '../hierarchy/hierarchyApi.js';
import { renderBreadcrumbs } from '../hierarchy/breadcrumbs.js';
import { pick, fullName } from '../hierarchy/caseHelpers.js';
import { getUser } from '../auth/authService.js';
import { showToast } from '../utils/toast.js';

if (!requireAuth({ allowRoles: ['Member', 'TeamLead', 'DepartmentHead', 'Admin'] })) throw new Error('auth');

async function init() {
    const user = getUser();
    const ctx = await loadHierarchyContext();
    const name = user?.name || user?.email || 'Member';

    document.getElementById('member-greeting')?.replaceChildren(document.createTextNode(name));

    renderBreadcrumbs('hierarchy-breadcrumbs', [
        { label: 'Workspace' },
        { label: 'My assignment' }
    ]);

    const teamId = ctx.teamId ?? ctx.ledTeamId;
    const subGroupId = ctx.subGroupId;

    let team = null;
    let subGroup = null;
    let members = [];

    if (teamId) {
        try { team = await hierarchyApi.getTeam(teamId); } catch { /* scoped */ }
    }
    if (subGroupId) {
        try {
            subGroup = await hierarchyApi.getSubGroup(subGroupId);
            members = await hierarchyApi.listSubGroupMembers(subGroupId) ?? [];
        } catch { /* */ }
    }

    document.getElementById('ctx-team').textContent =
        team ? `${pick(team, 'teamName', 'TeamName')} (${pick(team, 'groupName', 'GroupName')})` : 'Not assigned to a team';
    // document.getElementById('ctx-subgroup').textContent =
    //     subGroup ? pick(subGroup, 'subGroupName', 'SubGroupName') : 'No sub-group';
    document.getElementById('ctx-dept').textContent =
        pick(team, 'departmentName', 'DepartmentName') || (ctx.departmentId ? `Department #${ctx.departmentId}` : '—');

    const roster = document.getElementById('member-roster');
    if (roster) {
        roster.innerHTML = members.length
            ? members.map(m => `<span class="member-chip">${fullName(m)}</span>`).join('')
            : '<span class="text-secondary">No sub-group roster (assign via team lead).</span>';
    }
}

init().catch(e => showToast(e.message, 'error'));
