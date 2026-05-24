import { apiGet, apiPost, unwrap } from './apiClient.js';
import { isDepartmentHeadOrAbove, isTeamLeadOrAbove } from '../utils/roleHelpers.js';

const cache = { groups: [], subGroups: [] };

export function setHierarchyCacheFromCalendar(calendarDays) {
    const groups = new Map();
    const subGroups = new Map();
    if (!Array.isArray(calendarDays)) return;

    calendarDays.forEach(day => {
        (day.tasks || day.Tasks || []).forEach(task => {
            const gid = task.groupId ?? task.GroupId;
            const gname = task.groupName ?? task.GroupName;
            if (gid) groups.set(gid, { categoryId: gid, groupId: gid, name: gname || `Group ${gid}` });
            const sid = task.subGroupId ?? task.SubGroupId;
            const sname = task.subGroupName ?? task.SubGroupName;
            if (sid) subGroups.set(sid, { subCategoryId: sid, subGroupId: sid, categoryId: gid, groupId: gid, name: sname || `SubGroup ${sid}` });
        });
    });

    cache.groups = [...groups.values()];
    cache.subGroups = [...subGroups.values()];
}

export async function loadTaskGroups() {
    if (isDepartmentHeadOrAbove()) {
        try {
            const json = await apiPost('/api/TaskGroup/list', {});
            const { data } = unwrap(json);
            const list = (data || []).map(g => ({
                categoryId: g.groupId ?? g.GroupId,
                groupId: g.groupId ?? g.GroupId,
                name: g.groupName ?? g.GroupName
            }));
            cache.groups = list;
            return list;
        } catch { /* fall through */ }
    }

    if (isTeamLeadOrAbove()) {
        try {
            const json = await apiGet('/api/Approval/GetTaskGroupsByDepartment');
            const { data } = unwrap(json);
            const list = (data || []).map(g => ({
                categoryId: g.groupId ?? g.GroupId,
                groupId: g.groupId ?? g.GroupId,
                name: g.groupName ?? g.GroupName
            }));
            cache.groups = list;
            return list;
        } catch { /* fall through */ }
    }

    return cache.groups;
}

export async function loadSubGroups(teamId = null) {
    if (isTeamLeadOrAbove()) {
        try {
            const json = await apiPost('/api/SubGroup/list', teamId ? { teamId } : {});
            const { data } = unwrap(json);
            const list = (data || []).map(sg => ({
                subCategoryId: sg.subGroupId ?? sg.SubGroupId,
                subGroupId: sg.subGroupId ?? sg.SubGroupId,
                categoryId: sg.teamId ?? sg.TeamId,
                groupId: sg.teamId ?? sg.TeamId,
                name: sg.subGroupName ?? sg.SubGroupName
            }));
            cache.subGroups = list;
            return list;
        } catch { /* fall through */ }
    }

    return cache.subGroups;
}

export function getCachedGroups() {
    return cache.groups;
}

export function getCachedSubGroups(groupId = null) {
    if (!groupId) return cache.subGroups;
    return cache.subGroups.filter(s => s.categoryId === groupId || s.groupId === groupId);
}

export async function loadTeams(groupId = null) {
    if (!isDepartmentHeadOrAbove() && !isTeamLeadOrAbove()) return [];
    try {
        const json = await apiPost('/api/Team/list', groupId ? { groupId } : {});
        const { data } = unwrap(json);
        return (data || []).map(t => ({
            teamId: t.teamId ?? t.TeamId,
            groupId: t.groupId ?? t.GroupId,
            name: t.teamName ?? t.TeamName
        }));
    } catch {
        return [];
    }
}
