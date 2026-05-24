import { getRole } from '../utils/roleHelpers.js';
import { effectiveDepartmentId, effectiveTeamId } from './hierarchyContext.js';

export function isAdmin() {
    return getRole() === 'Admin';
}

export function isDepartmentHead() {
    return getRole() === 'DepartmentHead';
}

export function isTeamLead() {
    return getRole() === 'TeamLead';
}

export function isMember() {
    return getRole() === 'Member';
}

export function canManageAllDepartments() {
    return isAdmin();
}

export function canManageDepartment(ctx, departmentId) {
    if (isAdmin()) return true;
    if (!isDepartmentHead()) return false;
    const mine = effectiveDepartmentId(ctx);
    return mine != null && Number(mine) === Number(departmentId);
}

export function canManageGroups(ctx) {
    return isAdmin() || isDepartmentHead();
}

export function canManageTeams(ctx) {
    return isAdmin() || isDepartmentHead();
}

export function canManageSubGroups(ctx, teamId) {
    if (isAdmin()) return true;
    if (isDepartmentHead()) return true;
    if (isTeamLead()) {
        const led = effectiveTeamId(ctx);
        return led != null && Number(led) === Number(teamId);
    }
    return false;
}

/** Hide elements with data-require-role="Admin,DepartmentHead" */
export function applyPermissionAttributes(root = document) {
    const role = getRole();
    root.querySelectorAll('[data-require-role]').forEach(el => {
        const allowed = (el.getAttribute('data-require-role') || '')
            .split(',')
            .map(s => s.trim());
        const show = allowed.includes(role);
        el.classList.toggle('d-none', !show);
        el.querySelectorAll('input,select,button,textarea').forEach(ctrl => {
            if (!show) ctrl.setAttribute('disabled', 'disabled');
        });
    });
}
