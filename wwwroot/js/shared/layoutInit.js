import { getToken, getUser } from '../auth/authService.js';
import { requireAuth, bindLogout } from '../auth/routeGuard.js';
import { normalizeRole } from '../utils/roleHelpers.js';
import { initNavNotifications } from './navNotifications.js';

function setupNavForRole(role) {
    $('.nav-guest').toggleClass('d-none', !!getToken());
    $('.nav-auth').toggleClass('d-none', !getToken());

    const r = normalizeRole(role);
    $('.nav-member').toggleClass('d-none', r !== 'Member');
    if (['TeamLead', 'DepartmentHead', 'Admin'].includes(r)) {
        $('.nav-member').removeClass('d-none');
        $('.nav-member a[href="/Dashboard"]').parent().addClass('d-none');
    }
    $('.nav-tl').toggleClass('d-none', !['TeamLead', 'DepartmentHead', 'Admin'].includes(r));
    $('.nav-dept').toggleClass('d-none', !['DepartmentHead', 'Admin'].includes(r));
    $('.nav-admin').toggleClass('d-none', r !== 'Admin');

    if (r !== 'Member') {
        $('.nav-member').addClass('d-none');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname.toLowerCase();
    const isLogin = path.includes('/login');

    if (!isLogin) {
        if (!requireAuth()) return;
        const user = getUser();
        setupNavForRole(user?.role);
        bindLogout('#btn-logout');
        initNavNotifications().catch(() => {});
    } else {
        setupNavForRole(null);
    }
});
