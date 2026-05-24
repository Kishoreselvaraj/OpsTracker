/**
 * Global toast notifications (gold theme).
 */
export function showToast(message, type = 'info', durationMs = 2800) {
    $('.ops-toast').remove();
    const cls = type === 'error' ? 'ops-toast-error' : type === 'success' ? 'ops-toast-success' : '';
    const $t = $(`<div class="ops-toast ${cls}" role="status">`).text(message).appendTo('body');
    requestAnimationFrame(() => $t.addClass('show'));
    setTimeout(() => {
        $t.removeClass('show');
        setTimeout(() => $t.remove(), 300);
    }, durationMs);
}
