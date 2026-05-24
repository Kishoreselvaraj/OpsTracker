import { listNotifications, markRead, markAllRead } from '../services/notificationService.js';
import { getUser } from '../auth/authService.js';
import { showToast } from '../utils/toast.js';

export async function initNavNotifications() {
    const $btn = $('#nav-notif-btn');
    const $panel = $('#nav-notif-panel');
    const $badge = $('#nav-notif-badge');
    if (!$btn.length) return;

    const user = getUser();
    if (user) {
        const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
        $('#nav-user-display').text(name);
    }

    async function refresh(unreadOnly = true) {
        try {
            const items = await listNotifications(unreadOnly, 1, 15);
            const unread = items.filter(n => !(n.isRead ?? n.IsRead));
            if (unread.length) {
                $badge.text(unread.length > 9 ? '9+' : unread.length).addClass('visible');
            } else {
                $badge.removeClass('visible');
            }

            if (!items.length) {
                $panel.html('<div class="nav-notif-item" style="cursor:default;color:var(--text-3)">No notifications</div>');
                return;
            }

            $panel.html(items.map(n => {
                const id = n.notificationId ?? n.NotificationId;
                const title = n.title ?? n.Title ?? '';
                const msg = n.message ?? n.Message ?? '';
                const isRead = n.isRead ?? n.IsRead;
                return `<div class="nav-notif-item ${isRead ? '' : 'unread'}" data-id="${id}"><strong>${escapeHtml(title)}</strong><br><span style="color:var(--text-3)">${escapeHtml(msg)}</span></div>`;
            }).join(''));
        } catch {
            $panel.html('<div class="nav-notif-item" style="cursor:default">Unable to load notifications</div>');
        }
    }

    $btn.on('click', async e => {
        e.stopPropagation();
        $panel.toggleClass('open');
        if ($panel.hasClass('open')) await refresh(false);
    });

    $(document).on('click', () => $panel.removeClass('open'));
    $panel.on('click', e => e.stopPropagation());

    $panel.on('click', '.nav-notif-item[data-id]', async function () {
        const id = $(this).data('id');
        try {
            await markRead(id);
            $(this).removeClass('unread');
            await refresh();
        } catch {
            showToast('Could not mark notification as read', 'error');
        }
    });

    $('#nav-mark-all-read')?.on('click', async e => {
        e.preventDefault();
        try {
            await markAllRead();
            showToast('All notifications marked read', 'success');
            await refresh();
        } catch {
            showToast('Action failed', 'error');
        }
    });

    await refresh();
    setInterval(() => refresh(), 60000);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
