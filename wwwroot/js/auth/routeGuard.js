import { getToken, getUser } from './authService.js';
import { homePathForRole, normalizeRole } from '../utils/roleHelpers.js';

const PUBLIC_PATHS = ['/login', '/'];

/**
 * Call at page load. Redirects unauthenticated users to login,
 * or authenticated users away from login to role home.
 */
export function requireAuth(options = {}) {
    const { minRole = null, allowRoles = null } = options;
    const path = window.location.pathname.toLowerCase();
    const token = getToken();
    const user = getUser();

    if (!token || !user) {
        if (!PUBLIC_PATHS.some(p => path === p || path.startsWith(p + '/'))) {
            const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
            window.location.href = `/Login?returnUrl=${returnUrl}`;
        }
        return false;
    }

    if (path.includes('/login')) {
        window.location.href = homePathForRole(user.role);
        return false;
    }

    const role = normalizeRole(user.role);
    if (allowRoles && allowRoles.length && !allowRoles.includes(role)) {
        window.location.href = homePathForRole(user.role);
        return false;
    }

    if (minRole) {
        const order = ['Member', 'TeamLead', 'DepartmentHead', 'Admin'];
        if (order.indexOf(role) < order.indexOf(normalizeRole(minRole))) {
            window.location.href = homePathForRole(user.role);
            return false;
        }
    }

    return true;
}

export function bindLogout(selector = '#btn-logout') {
    document.querySelectorAll(selector).forEach(btn => {
        btn.addEventListener('click', e => {
            e.preventDefault();
            import('./authService.js').then(({ logout }) => logout());
        });
    });
}
