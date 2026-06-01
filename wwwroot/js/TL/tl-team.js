/**
 * Team Lead - My Team
 * Loads the current TL hierarchy context, fetches team members/sub-groups,
 * and binds the roster, filters, sorting, and profile modal.
 */
import { hierarchyApi } from '/js/hierarchy/hierarchyApi.js';
import { loadHierarchyContext, effectiveTeamId } from '/js/hierarchy/hierarchyContext.js';
import { pick, fullName } from '/js/hierarchy/caseHelpers.js';
import { getUser } from '/js/auth/authService.js';
import { requireAuth } from '/js/auth/routeGuard.js';
import { getWithAuth, postWithAuth, unwrap } from '/js/services/apiService.js';
import { showToast } from '/js/utils/toast.js';

if (!requireAuth({ allowRoles: ['TeamLead', 'Admin', 'DepartmentHead'] })) {
    throw new Error('auth');
}

let teamId = null;
let teamName = '';
let allMembers = [];
let subGroups = [];
let subGroupMembers = [];
let memberStats = new Map();

function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value ?? '';
    return div.innerHTML;
}

function getMemberId(member) {
    return String(pick(member, 'userId', 'UserId', 'id', 'Id') ?? '');
}

function getInitials(name) {
    return String(name || 'User')
        .split(/\s+/)
        .filter(Boolean)
        .map(part => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
}

function getNumber(member, ...keys) {
    const value = pick(member, ...keys);
    return Number(value ?? 0) || 0;
}

function parseHours(value) {
    if (!value) return 0;
    if (typeof value === 'number') return value;

    const text = String(value);
    if (!text.includes(':')) return Number(text) || 0;

    const [hours, minutes] = text.split(':');
    return (parseInt(hours, 10) || 0) + (parseInt(minutes, 10) || 0) / 60;
}

function dateKey(value) {
    return value ? String(value).split('T')[0] : '';
}

function buildMemberStats(members) {
    const stats = new Map();

    members.forEach(member => {
        const totalEods = getNumber(member, 'totalEods', 'TotalEods', 'eodCount', 'EodCount');
        const totalHours = getNumber(member, 'totalHours', 'TotalHours', 'hoursWorked', 'HoursWorked');
        const pending = getNumber(member, 'pendingCount', 'PendingCount', 'pendingEods', 'PendingEods');
        const approvalRate = getNumber(member, 'approvalRate', 'ApprovalRate');

        stats.set(getMemberId(member), {
            totalEods,
            totalHours,
            avgHours: totalEods ? totalHours / totalEods : 0,
            approvalRate,
            pending,
            recent: pick(member, 'lastActivityAt', 'LastActivityAt', 'lastSubmissionDate', 'LastSubmissionDate') || ''
        });
    });

    return stats;
}

function aggregateStatsFromWorkLogs(rows) {
    const stats = new Map();
    const monthBuckets = new Map();

    rows.forEach(row => {
        const userId = String(pick(row, 'userId', 'UserId') ?? '');
        if (!userId) return;

        const date = dateKey(pick(row, 'workDate', 'WorkDate', 'eodDate', 'EodDate', 'submittedAt', 'SubmittedAt'));
        const status = String(pick(row, 'approvalStatus', 'ApprovalStatus', 'taskApprovalStatus', 'TaskApprovalStatus') || 'DRAFT').toUpperCase();
        const hours = parseHours(pick(row, 'hoursWorked', 'HoursWorked', 'taskDuration', 'TaskDuration', 'totalHours', 'TotalHours'));
        const taskCount = Number(pick(row, 'taskCount', 'TaskCount') || 1);

        if (!stats.has(userId)) {
            stats.set(userId, {
                totalEods: 0,
                totalHours: 0,
                avgHours: 0,
                approvalRate: 0,
                pending: 0,
                recent: '',
                recentSubmissions: [],
                _approvedDays: new Set(),
                _submittedDays: new Set()
            });
        }

        const item = stats.get(userId);
        const dayKey = date || `${pick(row, 'workflowLogDateId', 'WorkflowLogDateId', '')}`;
        if (dayKey) item._submittedDays.add(dayKey);
        if (dayKey && status === 'APPROVED') item._approvedDays.add(dayKey);
        if (status === 'PENDING' || status.includes('CORRECTION')) item.pending += 1;

        item.totalHours += hours;
        if (date && (!item.recent || date > item.recent)) item.recent = date;
        item.recentSubmissions.push({ workDate: date, hours, taskCount, approvalStatus: status });

        if (date) {
            const month = date.slice(0, 7);
            const bucketKey = `${userId}|${month}`;
            monthBuckets.set(bucketKey, (monthBuckets.get(bucketKey) || 0) + hours);
        }
    });

    stats.forEach((item, userId) => {
        item.totalEods = item._submittedDays.size;
        item.avgHours = item.totalEods ? item.totalHours / item.totalEods : 0;
        item.approvalRate = item.totalEods ? Math.round((item._approvedDays.size / item.totalEods) * 100) : 0;
        item.recentSubmissions = item.recentSubmissions
            .sort((a, b) => String(b.workDate).localeCompare(String(a.workDate)))
            .slice(0, 5);
        item.monthlyHours = [...monthBuckets.entries()]
            .filter(([key]) => key.startsWith(`${userId}|`))
            .map(([key, hours]) => ({ month: key.split('|')[1].slice(5), hours }))
            .sort((a, b) => a.month.localeCompare(b.month))
            .slice(-6);
        delete item._approvedDays;
        delete item._submittedDays;
    });

    return stats;
}

async function loadWorkLogStats() {
    const attempts = [
        () => getWithAuth('/api/Approval/GetTeamLeadMembersWorkLogs'),
        () => postWithAuth('/api/WorkLog/approval-list', { filterType: 'ALL' })
    ];

    for (const attempt of attempts) {
        try {
            const response = await attempt();
            const data = unwrap(response).data;
            if (Array.isArray(data)) return aggregateStatsFromWorkLogs(data);
        } catch {
            // Try the next compatible endpoint; deployments differ here.
        }
    }

    return new Map();
}

function getMemberStats(member) {
    return memberStats.get(getMemberId(member)) ?? {
        totalEods: 0,
        totalHours: 0,
        avgHours: 0,
        approvalRate: 0,
        pending: 0,
        recent: ''
    };
}

function getMemberSubGroupId(member) {
    const value = pick(member, 'currentSubGroupId', 'CurrentSubGroupId', 'subGroupId', 'SubGroupId');
    return value == null ? '' : String(value);
}

function getMemberSubGroupName(member) {
    const directName = pick(member, 'subGroupName', 'SubGroupName', 'currentSubGroupName', 'CurrentSubGroupName');
    if (directName && directName !== 'null') return directName;

    const subGroupId = getMemberSubGroupId(member);
    if (!subGroupId) return 'Unassigned';

    const subGroup = subGroups.find(item => String(pick(item, 'subGroupId', 'SubGroupId')) === subGroupId);
    return subGroup ? pick(subGroup, 'subGroupName', 'SubGroupName') : 'Unassigned';
}

function statusBadge(status) {
    const raw = String(status || 'draft').toLowerCase();
    const key = raw.includes('correction')
        ? 'correction'
        : ['approved', 'pending', 'rejected', 'draft'].includes(raw)
            ? raw
            : 'draft';

    const labels = {
        approved: 'Approved',
        pending: 'Pending',
        rejected: 'Rejected',
        correction: 'Correction',
        draft: 'Draft'
    };

    return `<span class="status-badge ${key}">${labels[key]}</span>`;
}

async function init() {
    const user = getUser();
    $('#nav-user-name').text(fullName(user) || user?.email || 'Team Lead');

    try {
        const ctx = await loadHierarchyContext();
        teamId = effectiveTeamId(ctx);
    } catch (err) {
        showToast(err.message || 'Could not load team context', 'error');
        $('#team-grid').html('<p class="hierarchy-empty">Unable to load your team context. Please refresh or sign in again.</p>');
        $('#team-count').text('0 members');
        return;
    }

    if (!teamId) {
        $('#team-grid').html('<p class="hierarchy-empty">No team is assigned to your account. Ask your department head to assign you as team lead.</p>');
        $('#team-count').text('0 members');
        return;
    }

    try {
        const team = await hierarchyApi.getTeam(teamId);
        teamName = pick(team, 'teamName', 'TeamName') || 'Team';
        $('#tl-team-name').text(teamName);
    } catch {
        $('#tl-team-name').text('Team');
    }

    await loadSubGroups();
    await loadMembers();
}

async function loadSubGroups() {
    try {
        const loadedSubGroups = await hierarchyApi.listSubGroups({ teamId }) ?? [];
        subGroupMembers = [];

        subGroups = await Promise.all(loadedSubGroups.map(async subGroup => {
            const id = pick(subGroup, 'subGroupId', 'SubGroupId');
            const name = pick(subGroup, 'subGroupName', 'SubGroupName') || `Sub-group ${id}`;
            let members = [];

            try {
                members = await hierarchyApi.listSubGroupMembers(id) ?? [];
            } catch {
                members = [];
            }

            members.forEach(member => {
                subGroupMembers.push({
                    ...member,
                    currentSubGroupId: pick(member, 'currentSubGroupId', 'CurrentSubGroupId', 'subGroupId', 'SubGroupId') ?? id,
                    subGroupId: pick(member, 'subGroupId', 'SubGroupId') ?? id,
                    subGroupName: pick(member, 'subGroupName', 'SubGroupName') || name
                });
            });

            return {
                ...subGroup,
                subGroupId: id,
                subGroupName: name,
                members
            };
        }));

        const $select = $('#subgroup-filter');
        $select.html('<option value="">All Sub-Groups</option>');

        subGroups.forEach(subGroup => {
            const id = pick(subGroup, 'subGroupId', 'SubGroupId');
            const name = pick(subGroup, 'subGroupName', 'SubGroupName') || `Sub-group ${id}`;
            $select.append(`<option value="${escapeHtml(id)}">${escapeHtml(name)}</option>`);
        });
    } catch (err) {
        console.error('[TLTeam] Failed to load sub-groups:', err);
        subGroups = [];
        subGroupMembers = [];
    }
}

async function loadMembers() {
    $('#team-grid').show().html('<div class="team-card skeleton" style="height:160px"></div>'.repeat(3));
    $('#empty-state').hide();

    try {
        allMembers = await hierarchyApi.listTeamMembers(teamId) ?? [];
        memberStats = buildMemberStats(allMembers);
        renderMembers();
    } catch (err) {
        console.error('[TLTeam] Failed to load members:', err);
        showToast(err.message || 'Failed to load team members', 'error');
        $('#team-grid').html(`<p class="text-danger">${escapeHtml(err.message || 'Failed to load team members')}</p>`);
        $('#team-count').text('0 members');
    }
}

function filteredMembers() {
    const search = ($('#search-input').val() || '').toLowerCase().trim();
    const subGroupFilter = $('#subgroup-filter').val() || '';
    const sort = $('#sort-filter').val() || 'name';

    const list = allMembers.filter(member => {
        const name = fullName(member).toLowerCase();
        const code = String(pick(member, 'employeeCode', 'EmployeeCode') || '').toLowerCase();

        if (search && !name.includes(search) && !code.includes(search)) return false;
        if (subGroupFilter && getMemberSubGroupId(member) !== subGroupFilter) return false;

        return true;
    });

    list.sort((a, b) => {
        const aStats = getMemberStats(a);
        const bStats = getMemberStats(b);

        if (sort === 'hours') return bStats.totalHours - aStats.totalHours;
        if (sort === 'approval') return bStats.approvalRate - aStats.approvalRate;
        if (sort === 'recent') return String(bStats.recent).localeCompare(String(aStats.recent));
        return fullName(a).localeCompare(fullName(b));
    });

    return list;
}

function renderMembers() {
    const list = filteredMembers();
    $('#team-count').text(`${list.length} member${list.length === 1 ? '' : 's'}`);

    if (!list.length) {
        $('#team-grid').hide();
        $('#empty-state').show();
        return;
    }

    $('#empty-state').hide();
    $('#team-grid').show().html(list.map(member => renderMemberCard(member)).join(''));
}

function renderMemberCard(member) {
    const stats = getMemberStats(member);
    const name = fullName(member);
    const code = pick(member, 'employeeCode', 'EmployeeCode') || '';
    const lead = pick(member, 'isTeamLead', 'IsTeamLead');

    return `<div class="team-card" data-userid="${escapeHtml(getMemberId(member))}">
        <div class="team-card-header">
            <div class="team-avatar">${escapeHtml(getInitials(name))}</div>
            <div class="team-info">
                <div class="team-name">${escapeHtml(name)}</div>
                <div class="team-code">${escapeHtml(code)}</div>
                <div class="team-subgroup">${escapeHtml(getMemberSubGroupName(member))}</div>
            </div>
        </div>
        ${lead ? '<span class="profile-badge">Team Lead</span>' : ''}
        <div class="team-stats">
            <div class="team-stat">
                <div class="team-stat-value">${stats.totalEods}</div>
                <div class="team-stat-label">EODs</div>
            </div>
            <div class="team-stat">
                <div class="team-stat-value">${stats.totalHours.toFixed(1)}</div>
                <div class="team-stat-label">Hours</div>
            </div>
            <div class="team-stat">
                <div class="team-stat-value">${stats.approvalRate ? `${stats.approvalRate}%` : '-'}</div>
                <div class="team-stat-label">Approval</div>
            </div>
            <div class="team-stat">
                <div class="team-stat-value pending">${stats.pending}</div>
                <div class="team-stat-label">Pending</div>
            </div>
        </div>
    </div>`;
}

function openProfile(member) {
    const stats = getMemberStats(member);
    const name = fullName(member);
    const code = pick(member, 'employeeCode', 'EmployeeCode') || '';
    const role = pick(member, 'designation', 'Designation', 'role', 'Role') || 'Member';
    const subgroup = getMemberSubGroupName(member);
    const memberId = getMemberId(member);

    $('#profile-avatar').text(getInitials(name));
    $('#profile-name').text(name);
    $('#profile-meta').text([code, subgroup].filter(Boolean).join(' - '));
    $('#profile-badges').html(`<span class="profile-badge">${escapeHtml(role)}</span>`);
    $('#profile-total-eods').text(stats.totalEods);
    $('#profile-total-hours').text(`${stats.totalHours.toFixed(1)}h`);
    $('#profile-avg-hours').text(`${stats.avgHours.toFixed(1)}h`);
    $('#profile-approval-rate').text(stats.approvalRate ? `${stats.approvalRate}%` : '-');
    $('#profile-view-all').attr('href', `/tl/approvals?member=${encodeURIComponent(memberId)}`);
    $('#profile-submissions').html(renderProfileSubmissions(member));
    $('#profile-chart').html(renderProfileChart(member));
    $('#profile-modal').addClass('active');
    $('body').css('overflow', 'hidden');
}

function renderProfileSubmissions(member) {
    const items = pick(member, 'recentSubmissions', 'RecentSubmissions') || [];

    if (!Array.isArray(items) || !items.length) {
        return '<div class="submission-item"><div class="submission-info"><div class="submission-date">No recent submissions</div><div class="submission-meta">Activity appears after EODs are submitted.</div></div></div>';
    }

    return items.slice(0, 5).map(item => {
        const date = pick(item, 'workDate', 'WorkDate', 'eodDate', 'EodDate') || '';
        const hours = Number(pick(item, 'hours', 'Hours', 'totalHours', 'TotalHours') || 0);
        const tasks = Number(pick(item, 'taskCount', 'TaskCount') || 0);
        const status = pick(item, 'approvalStatus', 'ApprovalStatus', 'status', 'Status') || 'draft';
        const label = date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-';

        return `<div class="submission-item">
            <div class="submission-info">
                <div class="submission-date">${escapeHtml(label)}</div>
                <div class="submission-meta">${tasks} task${tasks === 1 ? '' : 's'}</div>
            </div>
            <div class="submission-hours">${hours.toFixed(1)}h</div>
            ${statusBadge(status)}
        </div>`;
    }).join('');
}

function renderProfileChart(member) {
    const items = pick(member, 'monthlyHours', 'MonthlyHours') || [];

    if (!Array.isArray(items) || !items.length) {
        return '<div class="submission-meta" style="align-self:center;width:100%;text-align:center">No monthly hours yet</div>';
    }

    const data = items.slice(-6);
    const max = Math.max(...data.map(item => Number(pick(item, 'hours', 'Hours', 'totalHours', 'TotalHours') || 0)), 1);

    return data.map(item => {
        const label = pick(item, 'month', 'Month', 'label', 'Label') || '';
        const hours = Number(pick(item, 'hours', 'Hours', 'totalHours', 'TotalHours') || 0);
        const height = Math.max((hours / max) * 100, 4);

        return `<div class="chart-bar-group">
            <div class="chart-bar-track">
                <div class="chart-bar" style="height:${height}%">
                    <span class="chart-bar-value">${hours.toFixed(0)}</span>
                </div>
            </div>
            <div class="chart-bar-label">${escapeHtml(label)}</div>
        </div>`;
    }).join('');
}

function closeProfile() {
    $('#profile-modal').removeClass('active');
    $('body').css('overflow', '');
}

$('#search-input').on('input', renderMembers);
$('#subgroup-filter, #sort-filter').on('change', renderMembers);
$('#btn-reset-filters').on('click', () => {
    $('#search-input').val('');
    $('#subgroup-filter').val('');
    $('#sort-filter').val('name');
    renderMembers();
});
$(document).on('click', '.team-card', function () {
    const userId = String($(this).data('userid') ?? '');
    const member = allMembers.find(item => getMemberId(item) === userId);
    if (member) openProfile(member);
});
$('#modal-close, #btn-close-profile').on('click', closeProfile);
$('#profile-modal').on('click', event => {
    if (event.target === event.currentTarget) closeProfile();
});
$(document).on('keydown', event => {
    if (event.key === 'Escape') closeProfile();
});

$(init);

export async function getTeamData() {
    if (!teamId) await init();
    return allMembers;
}

export { init as initTeam, loadMembers, renderMembers, allMembers, subGroups, getMemberSubGroupName };
