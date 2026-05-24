/**
 * Team Lead — My Team (roster from UserTeams via hierarchy API)
 */
import { hierarchyApi } from '/js/hierarchy/hierarchyApi.js';
import { loadHierarchyContext, effectiveTeamId } from '/js/hierarchy/hierarchyContext.js';
import { pick, fullName } from '/js/hierarchy/caseHelpers.js';
import { getUser } from '/js/auth/authService.js';
import { requireAuth } from '/js/auth/routeGuard.js';
import { showToast } from '/js/utils/toast.js';

if (!requireAuth({ allowRoles: ['TeamLead', 'Admin', 'DepartmentHead'] })) throw new Error('auth');

let teamId = null;
let teamName = '';
let allMembers = [];
let subGroups = [];

function escapeHtml(t) {
    const d = document.createElement('div');
    d.textContent = t ?? '';
    return d.innerHTML;
}

async function init() {
    const user = getUser();
    $('#nav-user-name').text(user?.name || user?.email || 'Team Lead');

    const ctx = await loadHierarchyContext();
    teamId = effectiveTeamId(ctx);

    if (!teamId) {
        $('#team-grid').html('<p class="hierarchy-empty">No team is assigned to your account. Ask your department head to assign you as team lead.</p>');
        $('#team-count').text('0 members');
        return;
    }

    try {
        const team = await hierarchyApi.getTeam(teamId);
        teamName = pick(team, 'teamName', 'TeamName') || 'Team';
        $('#tl-team-name')?.text(teamName);
    } catch { /* */ }

    await Promise.all([loadSubGroups(), loadMembers()]);
}

async function loadSubGroups() {
    try {
        subGroups = await hierarchyApi.listSubGroups({ teamId }) ?? [];
        const $sel = $('#subgroup-filter');
        $sel.html('<option value="">All Sub-Groups</option>');
        subGroups.forEach(sg => {
            const id = pick(sg, 'subGroupId', 'SubGroupId');
            const name = pick(sg, 'subGroupName', 'SubGroupName');
            $sel.append(`<option value="${id}">${escapeHtml(name)}</option>`);
        });
    } catch {
        subGroups = [];
    }
}

async function loadMembers() {
    $('#team-grid').html('<div class="team-card skeleton" style="height:160px"></div>'.repeat(3));
    try {
        allMembers = await hierarchyApi.listTeamMembers(teamId) ?? [];
        renderMembers();
    } catch (err) {
        showToast(err.message || 'Failed to load team members', 'error');
        $('#team-grid').html(`<p class="text-danger">${escapeHtml(err.message)}</p>`);
    }
}

function renderMembers() {
    const search = ($('#search-input').val() || '').toLowerCase();
    const sgFilter = $('#subgroup-filter').val();
    let list = allMembers.filter(m => {
        const name = fullName(m).toLowerCase();
        const code = (pick(m, 'employeeCode', 'EmployeeCode') || '').toLowerCase();
        if (search && !name.includes(search) && !code.includes(search)) return false;
        if (sgFilter && String(pick(m, 'subGroupId', 'SubGroupId')) !== sgFilter) return false;
        return true;
    });

    $('#team-count').text(`${list.length} member${list.length === 1 ? '' : 's'}`);

    if (!list.length) {
        $('#team-grid').hide();
        $('#empty-state').show();
        return;
    }
    $('#empty-state').hide();
    $('#team-grid').show().html(list.map(m => {
        const lead = pick(m, 'isTeamLead', 'IsTeamLead');
        return `<div class="team-card">
            <div class="team-card-avatar">${escapeHtml(fullName(m).split(' ').map(x => x[0]).join('').slice(0, 2))}</div>
            <div class="team-card-name">${escapeHtml(fullName(m))}</div>
            <div class="team-card-meta">${escapeHtml(pick(m, 'employeeCode', 'EmployeeCode') || '')} · ${escapeHtml(pick(m, 'subGroupName', 'SubGroupName') || 'Unassigned')}</div>
            ${lead ? '<span class="badge" style="color:var(--gold-2)">Team Lead</span>' : ''}
        </div>`;
    }).join(''));
}

$('#search-input').on('input', renderMembers);
$('#subgroup-filter').on('change', renderMembers);
$('#btn-reset-filters').on('click', () => {
    $('#search-input').val('');
    $('#subgroup-filter').val('');
    renderMembers();
});

$(init);
