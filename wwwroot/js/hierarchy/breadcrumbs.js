/**
 * @param {string} containerId
 * @param {{ label: string, href?: string }[]} crumbs
 */
export function renderBreadcrumbs(containerId, crumbs) {
    const el = document.getElementById(containerId);
    if (!el) return;

    if (!crumbs?.length) {
        el.innerHTML = '';
        el.classList.add('d-none');
        return;
    }

    el.classList.remove('d-none');
    el.innerHTML = crumbs
        .map((c, i) => {
            const isLast = i === crumbs.length - 1;
            const inner = c.href && !isLast
                ? `<a href="${c.href}">${escapeHtml(c.label)}</a>`
                : `<span${isLast ? ' aria-current="page"' : ''}>${escapeHtml(c.label)}</span>`;
            const sep = isLast ? '' : '<span class="hierarchy-bc__sep">/</span>';
            return `<span class="hierarchy-bc__item">${inner}${sep}</span>`;
        })
        .join('');
}

function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text ?? '';
    return d.innerHTML;
}
