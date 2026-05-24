import { hierarchyApi } from './hierarchyApi.js';
import { pick } from './caseHelpers.js';
import { getRole } from '../utils/roleHelpers.js';

let cached = null;

/** @returns {Promise<import('./hierarchyContext.js').HierarchyContext>} */
export async function loadHierarchyContext(force = false) {
    if (cached && !force) return cached;
    const raw = await hierarchyApi.getContext();
    cached = {
        userId: pick(raw, 'userId', 'UserId'),
        role: getRole(),
        departmentId: pick(raw, 'departmentId', 'DepartmentId'),
        groupId: pick(raw, 'groupId', 'GroupId'),
        teamId: pick(raw, 'teamId', 'TeamId'),
        subGroupId: pick(raw, 'subGroupId', 'SubGroupId'),
        managedDepartmentId: pick(raw, 'managedDepartmentId', 'ManagedDepartmentId'),
        ledTeamId: pick(raw, 'ledTeamId', 'LedTeamId')
    };
    return cached;
}

export function clearHierarchyContext() {
    cached = null;
}

/** Department the current user operates on (dept head or member assignment). */
export function effectiveDepartmentId(ctx) {
    return ctx.managedDepartmentId ?? ctx.departmentId ?? null;
}

export function effectiveTeamId(ctx) {
    return ctx.ledTeamId ?? ctx.teamId ?? null;
}
