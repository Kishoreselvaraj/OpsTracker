/**
 * Role-based navigation — only items listed here appear for each role.
 */
export const ROLE_LABELS = {
    Admin: 'Administrator',
    DepartmentHead: 'Department Head',
    TeamLead: 'Team Lead',
    Member: 'Member'
};

/** @typedef {{ href: string, icon: string, label: string, section?: string }} NavItem */

/** @type {Record<string, NavItem[]>} */
export const NAV_ITEMS = {
    Member: [
        { section: 'Work', href: '/Dashboard', icon: 'fa-gauge-high', label: 'Dashboard' },
        { section: 'Work', href: '/Member/Workspace', icon: 'fa-sitemap', label: 'My assignment' },
        { section: 'Work', href: '/EodCalander', icon: 'fa-calendar-days', label: 'EOD Calendar' }
    ],
    TeamLead: [
        { section: 'Leadership', href: '/tl/Dashboard', icon: 'fa-chart-line', label: 'TL Dashboard' },
        { section: 'Leadership', href: '/tl/Groups', icon: 'fa-layer-group', label: 'Sub-Groups' },
        { section: 'Leadership', href: '/tl/Approvals', icon: 'fa-clipboard-check', label: 'Approvals' },
        { section: 'Leadership', href: '/tl/Team', icon: 'fa-users', label: 'My Team' },
        { section: 'Work', href: '/EodCalander', icon: 'fa-calendar-days', label: 'EOD Calendar' }
    ],
    DepartmentHead: [
        { section: 'Department', href: '/DeptHead/Dashboard', icon: 'fa-building', label: 'Dept Overview' },
        { section: 'Department', href: '/DeptHead/Groups', icon: 'fa-folder-tree', label: 'Task Groups' },
        { section: 'Department', href: '/DeptHead/Teams', icon: 'fa-people-group', label: 'Teams' },
        { section: 'Department', href: '/DeptHead/Reports', icon: 'fa-file-chart-column', label: 'Reports' },
        { section: 'Department', href: '/Admin/AuditLog', icon: 'fa-clipboard-list', label: 'Audit log' },
        { section: 'Oversight', href: '/tl/Dashboard', icon: 'fa-chart-line', label: 'Team Lead View' },
        { section: 'Work', href: '/EodCalander', icon: 'fa-calendar-days', label: 'EOD Calendar' }
    ],
    Admin: [
        { section: 'Administration', href: '/Admin/Dashboard', icon: 'fa-shield-halved', label: 'Admin Home' },
        { section: 'Administration', href: '/Admin/Departments', icon: 'fa-building', label: 'Departments' },
        { section: 'Administration', href: '/Admin/Organizations', icon: 'fa-sitemap', label: 'Organizations' },
        { section: 'Administration', href: '/Admin/Users', icon: 'fa-user-gear', label: 'Users' },
        { section: 'Administration', href: '/Admin/AuditLog', icon: 'fa-clipboard-list', label: 'Audit log' },
        { section: 'Administration', href: '/Admin/Settings', icon: 'fa-sliders', label: 'Settings' },
        { section: 'Department', href: '/DeptHead/Dashboard', icon: 'fa-folder-tree', label: 'Dept tools' },
        { section: 'Department', href: '/DeptHead/Reports', icon: 'fa-file-chart-column', label: 'Reports' },
        { section: 'Leadership', href: '/tl/Dashboard', icon: 'fa-chart-line', label: 'TL Dashboard' },
        { section: 'Work', href: '/EodCalander', icon: 'fa-calendar-days', label: 'EOD Calendar' }
    ]
};

/**
 * Returns nav items for role (higher roles do not inherit lower menus — explicit per role).
 * @param {string} role
 * @returns {NavItem[]}
 */
export function getNavItemsForRole(role) {
    return NAV_ITEMS[role] || NAV_ITEMS.Member;
}
