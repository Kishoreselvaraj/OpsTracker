import { apiGet, apiPost, unwrap } from './apiClient.js';
import { isDepartmentHeadOrAbove, isTeamLeadOrAbove } from '../utils/roleHelpers.js';
import { getUser } from '../auth/authService.js';

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
    try {
        const user = getUser();

        const json = await apiPost('/api/TaskGroup/list', {
            departmentId: user?.departmentId || null
        });

        const { data } = unwrap(json);

        const list = (data || []).map(g => ({
            categoryId: g.groupId,
            groupId: g.groupId,
            name: g.groupName
        }));

        cache.groups = list;
        return list;
    }
    catch (err) {
        console.error('loadTaskGroups', err);
        return cache.groups || [];
    }
}

export async function loadSubGroups(teamId = null) {
    try {
        const user = getUser();

        const json = await apiPost('/api/SubGroup/list', {
            teamId: teamId || user?.teamId
        });

        const { data } = unwrap(json);

        const list = (data || []).map(sg => ({
            subCategoryId: sg.subGroupId,
            subGroupId: sg.subGroupId,
            categoryId: sg.groupId, // FIX
            groupId: sg.groupId,    // FIX
            teamId: sg.teamId,
            name: sg.subGroupName
        }));

        cache.subGroups = list;
        return list;
    }
    catch (err) {
        console.error('loadSubGroups', err);
        return cache.subGroups || [];
    }
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
