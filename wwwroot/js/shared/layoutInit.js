import { getToken, getUser } from '../auth/authService.js';
import { requireAuth, bindLogout } from '../auth/routeGuard.js';
import { normalizeRole } from '../utils/roleHelpers.js';
import { getNavItemsForRole, ROLE_LABELS } from './navConfig.js';
import { initNavNotifications } from './navNotifications.js';

function renderSidebarNav(role) {
    const navEl = document.getElementById('sidebar-nav');
    if (!navEl) return;

    const items = getNavItemsForRole(role);
    const path = window.location.pathname.toLowerCase();
    let html = '';
    let lastSection = '';

    items.forEach((item) => {
        if (item.section && item.section !== lastSection) {
            lastSection = item.section;
            html += `<div class="sidebar-section-label">${item.section}</div>`;
        }
        const hrefLower = item.href.toLowerCase();
        const active = path === hrefLower || path.startsWith(hrefLower + '/');
        html += `<a class="sidebar-link${active ? ' active' : ''}" href="${item.href}">
            <i class="fa-solid ${item.icon}"></i><span>${item.label}</span></a>`;
    });

    navEl.innerHTML = html;
}

function updateRoleBadge(role) {
    const el = document.getElementById('sidebar-role-badge');
    if (el) el.textContent = ROLE_LABELS[role] || role;
}

function setupTopbarUser(user) {
    const display = document.getElementById('nav-user-display');
    if (display && user) {
        const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'User';
        display.textContent = name;
    }
}

function setupSidebarToggle() {
    const btn = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('app-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (!btn || !sidebar) return;

    const close = () => {
        sidebar.classList.remove('open');
        backdrop?.classList.remove('show');
    };

    btn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        backdrop?.classList.toggle('show');
    });
    backdrop?.addEventListener('click', close);
}

function setupAuthChrome(isLogin) {
    const authed = !isLogin && !!getToken();
    document.querySelectorAll('.nav-guest-only').forEach((el) => {
        el.classList.toggle('d-none', authed);
    });
    document.querySelectorAll('.nav-auth-only').forEach((el) => {
        el.classList.toggle('d-none', !authed);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname.toLowerCase();
    const isLogin = path.includes('/login');

    setupAuthChrome(isLogin);

    if (isLogin) return;

    if (!requireAuth()) return;

    const user = getUser();
    const userid = user.userId;
    const role = normalizeRole(user?.role);

    renderSidebarNav(role);
    updateRoleBadge(role);
    setupTopbarUser(userid);
    setupSidebarToggle();
    bindLogout('#btn-logout');
    initNavNotifications().catch(() => {});
});
