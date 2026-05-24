import { getUser } from '../auth/authService.js';

export function normalizeRole(role) {
    if (!role) return 'Member';
    const r = String(role).trim();
    if (/^admin$/i.test(r)) return 'Admin';
    if (/department\s*head|departmenthead/i.test(r)) return 'DepartmentHead';
    if (/team\s*lead|teamlead/i.test(r)) return 'TeamLead';
    return 'Member';
}

export function getRole() {
    const user = getUser();
    return normalizeRole(user?.role);
}

export function canAccess(requiredRole) {
    const role = getRole();
    const order = ['Member', 'TeamLead', 'DepartmentHead', 'Admin'];
    const need = order.indexOf(normalizeRole(requiredRole));
    const have = order.indexOf(role);
    return have >= need && need >= 0;
}

export function homePathForRole(role) {
    switch (normalizeRole(role)) {
        case 'Admin': return '/Admin/Dashboard';
        case 'DepartmentHead': return '/DeptHead/Dashboard';
        case 'TeamLead': return '/tl/Dashboard';
        default: return '/Dashboard';
    }
}

export function isTeamLeadOrAbove() {
    return canAccess('TeamLead');
}

export function isDepartmentHeadOrAbove() {
    return canAccess('DepartmentHead');
}
