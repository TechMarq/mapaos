/**
 * Custom Modal Alerts & Confirms for Mapa.OS
 * Replaces native alert() and confirm() to prevent showing the domain name
 * and provide a matching dark premium aesthetic.
 */

// Helper: Escapes HTML special chars to prevent XSS in innerHTML injections
function _escHtml(str) {
    if (typeof str !== 'string') return String(str ?? '');
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

(function() {
    // Inject scrollbar styles for custom modals
    if (!document.getElementById('custom-modal-styles')) {
        const style = document.createElement('style');
        style.id = 'custom-modal-styles';
        style.textContent = `
            .custom-modal-scroll::-webkit-scrollbar {
                width: 6px;
            }
            .custom-modal-scroll::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 4px;
            }
            .custom-modal-scroll::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.25);
                border-radius: 4px;
            }
            .custom-modal-scroll::-webkit-scrollbar-thumb:hover {
                background: rgba(255, 255, 255, 0.45);
            }
        `;
        document.head.appendChild(style);
    }

    // 1. Redefine window.alert to show a beautiful modal
    window.alert = function(message, title = "Aviso do Sistema") {
        // Remove existing modal if any
        const existing = document.getElementById('custom-alert-modal');
        if (existing) existing.remove();

        // Sanitize inputs to prevent XSS
        const safeTitle = _escHtml(title);
        const safeMessage = _escHtml(message);

        const modalHTML = `
            <div id="custom-alert-modal" class="fixed inset-0 z-[20000] flex items-center justify-center bg-[#060e20]/80 backdrop-blur-md transition-all duration-300 p-4">
                <div class="glass-card w-[90%] max-w-[450px] max-h-[85vh] p-6 rounded-2xl flex flex-col gap-4 border border-white/10 shadow-2xl animate-fade-in">
                    <div class="flex items-center gap-3 shrink-0">
                        <div class="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                            <span class="material-symbols-outlined text-primary text-2xl">info</span>
                        </div>
                        <div>
                            <h3 class="text-sm font-bold text-on-surface">${safeTitle}</h3>
                            <span class="text-[9px] text-on-surface-variant uppercase tracking-wider">Mensagem</span>
                        </div>
                    </div>
                    <div class="overflow-y-auto max-h-[55vh] pr-2 custom-modal-scroll">
                        <p class="text-xs text-on-surface-variant leading-relaxed whitespace-pre-line">${safeMessage}</p>
                    </div>
                    <button onclick="document.getElementById('custom-alert-modal').remove()" 
                        class="primary-glow bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold h-10 rounded-xl active:scale-[0.98] transition-all duration-300 flex items-center justify-center text-xs mt-2 shrink-0">
                        OK
                    </button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    };

    // 2. Define custom confirmation modal (since confirm() is synchronous, we use a callback-based showConfirm)
    window.showConfirm = function(message, onConfirm, onCancel, title = "Confirmar Ação") {
        const existing = document.getElementById('custom-confirm-modal');
        if (existing) existing.remove();

        // Sanitize inputs to prevent XSS
        const safeTitle = _escHtml(title);
        const safeMessage = _escHtml(message);

        const modalId = 'custom-confirm-modal';
        const modalHTML = `
            <div id="${modalId}" class="fixed inset-0 z-[20000] flex items-center justify-center bg-[#060e20]/80 backdrop-blur-md transition-all duration-300 p-4">
                <div class="glass-card w-[90%] max-w-[450px] max-h-[85vh] p-6 rounded-2xl flex flex-col gap-4 border border-white/10 shadow-2xl animate-fade-in">
                    <div class="flex items-center gap-3 shrink-0">
                        <div class="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                            <span class="material-symbols-outlined text-yellow-400 text-2xl">help_outline</span>
                        </div>
                        <div>
                            <h3 class="text-sm font-bold text-on-surface">${safeTitle}</h3>
                            <span class="text-[9px] text-on-surface-variant uppercase tracking-wider">Confirmação</span>
                        </div>
                    </div>
                    <div class="overflow-y-auto max-h-[55vh] pr-2 custom-modal-scroll">
                        <p class="text-xs text-on-surface-variant leading-relaxed whitespace-pre-line">${safeMessage}</p>
                    </div>
                    <div class="flex gap-2.5 mt-2 shrink-0">
                        <button id="confirm-cancel-btn" 
                            class="flex-1 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-on-surface text-xs font-bold flex items-center justify-center border border-white/10 active:scale-[0.98] transition-all">
                            Cancelar
                        </button>
                        <button id="confirm-yes-btn" 
                            class="flex-1 primary-glow bg-gradient-to-r from-primary to-primary-container text-on-primary text-xs font-bold h-10 rounded-xl active:scale-[0.98] transition-all duration-300 flex items-center justify-center">
                            Confirmar
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        const modalEl = document.getElementById(modalId);
        modalEl.querySelector('#confirm-yes-btn').addEventListener('click', () => {
            modalEl.remove();
            if (typeof onConfirm === 'function') onConfirm();
        });
        modalEl.querySelector('#confirm-cancel-btn').addEventListener('click', () => {
            modalEl.remove();
            if (typeof onCancel === 'function') onCancel();
        });
    };
})();
