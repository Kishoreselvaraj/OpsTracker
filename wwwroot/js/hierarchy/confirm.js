/**
 * Promise-based confirm dialog using Bootstrap modal.
 * @param {{ title: string, message: string, confirmLabel?: string, danger?: boolean }} opts
 */
export function confirmAction(opts) {
    return new Promise(resolve => {
        const id = 'hierarchy-confirm-modal';
        let modal = document.getElementById(id);
        if (!modal) {
            modal = document.createElement('div');
            modal.id = id;
            modal.className = 'modal fade';
            modal.tabIndex = -1;
            modal.innerHTML = `
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content ops-modal">
                        <div class="modal-header border-0">
                            <h5 class="modal-title" id="${id}-title"></h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body" id="${id}-body"></div>
                        <div class="modal-footer border-0">
                            <button type="button" class="btn-gold-outline" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn-gold-gradient" id="${id}-ok">Confirm</button>
                        </div>
                    </div>
                </div>`;
            document.body.appendChild(modal);
        }

        document.getElementById(`${id}-title`).textContent = opts.title;
        document.getElementById(`${id}-body`).textContent = opts.message;
        const okBtn = document.getElementById(`${id}-ok`);
        okBtn.textContent = opts.confirmLabel ?? 'Confirm';
        okBtn.className = opts.danger ? 'btn btn-danger' : 'btn-gold-gradient';

        const bs = bootstrap.Modal.getOrCreateInstance(modal);
        const onOk = () => { cleanup(); resolve(true); };
        const onHide = () => { cleanup(); resolve(false); };
        const cleanup = () => {
            okBtn.removeEventListener('click', onOk);
            modal.removeEventListener('hidden.bs.modal', onHide);
        };
        okBtn.addEventListener('click', onOk);
        modal.addEventListener('hidden.bs.modal', onHide, { once: true });
        bs.show();
    });
}
