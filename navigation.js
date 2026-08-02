// Route Guard: Redirect unauthenticated users immediately to login.html, and protect roles
(function() {
    const currentPath = window.location.pathname;
    const pageName = currentPath.substring(currentPath.lastIndexOf('/') + 1) || 'index.html';
    const loggedUserRaw = localStorage.getItem('MAPAOS_LOGGED_USER');
    
    if (!loggedUserRaw) {
        if (pageName !== 'login.html') {
            window.location.href = 'login.html';
        }
    } else {
        const loggedUser = JSON.parse(loggedUserRaw);
        if (loggedUser.role === 'Master') {
            // Master account is restricted to master.html and login.html only
            if (pageName !== 'master.html' && pageName !== 'login.html') {
                window.location.href = 'master.html';
            }
        } else {
            // Standard users cannot access master.html
            if (pageName === 'master.html') {
                window.location.href = 'index.html';
            }
        }
    }
})();

document.addEventListener('DOMContentLoaded', () => {
    // Inject glass-input styles dynamically to guarantee dark premium aesthetics across all pages
    const styleHTML = `
        <style>
            html {
                background-color: #0b1326 !important;
                background: #0b1326 !important;
                color-scheme: dark !important;
            }
            body {
                background-color: #0b1326 !important;
                background: radial-gradient(circle at top right, #171f33, #0b1326) !important;
                color: #dae2fd !important;
                min-height: 100vh;
            }

            #top-app-bar {
                min-height: 64px;
            }
            #bottom-nav-bar {
                min-height: 80px;
            }

            .glass-input {
                background: rgba(255, 255, 255, 0.06) !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
                color: #dae2fd !important;
                transition: all 0.2s ease !important;
            }
            .glass-input:focus {
                outline: none !important;
                border-color: #adc6ff !important;
                box-shadow: 0 0 0 2px rgba(173,198,255,0.1) !important;
                background: rgba(255, 255, 255, 0.08) !important;
            }

            .lens-bubble {
                background: rgba(255, 255, 255, 0.05) !important;
                backdrop-filter: blur(12px) saturate(1.8) !important;
                -webkit-backdrop-filter: blur(12px) saturate(1.8) !important;
                border: 1.5px solid rgba(255, 255, 255, 0.18) !important;
                pointer-events: none !important;
                will-change: transform, left, width, top, height !important;
                box-shadow: 
                    inset 0 4px 6px rgba(255, 255, 255, 0.25),
                    inset -3px -3px 8px rgba(167, 139, 250, 0.5), /* Roxo pastel claro */
                    inset 3px 3px 8px rgba(110, 231, 183, 0.5),   /* Verde pastel claro */
                    inset 0 0 10px rgba(173, 198, 255, 0.3),      /* Azul pastel claro */
                    0 8px 24px rgba(0, 0, 0, 0.5) !important;
            }

            .nav-desktop-item {
                position: relative;
                z-index: 10;
                padding: 6px 16px;
                border-radius: 12px;
                transition: color 0.3s, transform 0.3s !important;
                transform: scale(1);
            }
            .nav-desktop-item.scale-110 {
                transform: scale(1.1) !important;
                color: #ffffff !important;
                text-shadow: 0 0 8px rgba(173, 198, 255, 0.4);
            }

            .nav-mobile-item {
                position: relative;
                z-index: 10;
                transition: color 0.3s, transform 0.3s, background-color 0.3s !important;
                transform: scale(1);
                background: transparent !important;
                box-shadow: none !important;
            }
            .nav-mobile-item.scale-110 {
                transform: scale(1.12) !important;
                color: #ffffff !important;
            }
            @keyframes ptr-spin-anim {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            .animate-ptr-spin {
                animation: ptr-spin-anim 0.8s linear infinite !important;
            }

            /* ── Pro Plan Badge ─────────────────────────── */
            .pro-plan-badge {
                display: inline-flex;
                align-items: center;
                gap: 2px;
                padding: 1px 6px;
                border-radius: 999px;
                font-size: 9px;
                font-weight: 800;
                letter-spacing: 0.08em;
                text-transform: uppercase;
                background: linear-gradient(135deg, #f59e0b, #d97706);
                color: #1a0a00;
                box-shadow: 0 0 8px rgba(245,158,11,0.5);
                border: 1px solid rgba(251,191,36,0.6);
                vertical-align: middle;
                margin-left: 4px;
            }

            /* ── Pro Nav Lock Item ─────────────────────── */
            .nav-pro-locked {
                opacity: 0.45;
                cursor: not-allowed;
            }
            .nav-pro-locked:hover {
                opacity: 0.65;
            }

            /* ── Pro Upgrade Modal ─────────────────────── */
            #pro-upgrade-modal {
                display: none;
                position: fixed;
                inset: 0;
                z-index: 99990;
                background: rgba(6,14,32,0.88);
                backdrop-filter: blur(16px);
                justify-content: center;
                align-items: center;
                padding: 16px;
            }
            #pro-upgrade-modal.open {
                display: flex;
            }
            .pro-modal-card {
                width: 100%;
                max-width: 420px;
                background: linear-gradient(160deg, #1a1040 0%, #0d1a38 60%, #091224 100%);
                border: 1px solid rgba(245,158,11,0.3);
                border-radius: 24px;
                padding: 32px 28px;
                box-shadow: 0 0 60px rgba(245,158,11,0.15), 0 32px 64px rgba(0,0,0,0.6);
                text-align: center;
                position: relative;
                overflow: hidden;
            }
            .pro-modal-card::before {
                content: '';
                position: absolute;
                top: -80px; right: -80px;
                width: 240px; height: 240px;
                background: radial-gradient(circle, rgba(245,158,11,0.18) 0%, transparent 70%);
                pointer-events: none;
                border-radius: 50%;
            }
            .pro-feature-item {
                display: flex;
                align-items: center;
                gap: 10px;
                text-align: left;
                padding: 8px 0;
                border-bottom: 1px solid rgba(255,255,255,0.05);
            }
            .pro-feature-item:last-child { border-bottom: none; }
        </style>
    `;
    document.head.insertAdjacentHTML('beforeend', styleHTML);
    initPullToRefresh();

    const currentPath = window.location.pathname;
    const pageName = currentPath.substring(currentPath.lastIndexOf('/') + 1) || 'index.html';

    // Update last_login in background if user is logged in (session-throttled to avoid redundant writes)
    try {
        const loggedUserRaw = localStorage.getItem('MAPAOS_LOGGED_USER');
        if (loggedUserRaw) {
            const loggedUser = JSON.parse(loggedUserRaw);
            if (loggedUser && loggedUser.id && !sessionStorage.getItem('MAPAOS_LOGIN_RECORDED')) {
                const checkInterval = setInterval(() => {
                    if (typeof supabaseClientInstance !== 'undefined' && supabaseClientInstance) {
                        clearInterval(checkInterval);
                        const nowIso = new Date().toISOString();
                        supabaseClientInstance
                            .from('profiles')
                            .update({ last_login: nowIso })
                            .eq('id', loggedUser.id)
                            .then(({ error }) => {
                                if (!error) {
                                    sessionStorage.setItem('MAPAOS_LOGIN_RECORDED', 'true');
                                    loggedUser.last_login = nowIso;
                                    localStorage.setItem('MAPAOS_LOGGED_USER', JSON.stringify(loggedUser));
                                    console.log('Last login registrado com sucesso.');
                                } else {
                                    console.error('Erro ao salvar last_login em background:', error);
                                }
                            });
                    }
                }, 100);
                setTimeout(() => clearInterval(checkInterval), 5000);
            }
        }
    } catch (e) {
        console.error('Erro ao processar last_login em background:', e);
    }

    // Check and display active notifications in standard modal for users (Master is excluded, only shows right after login)
    async function checkAndDisplayNotifications() {
        try {
            const loggedUserRaw = localStorage.getItem('MAPAOS_LOGGED_USER');
            if (!loggedUserRaw) return;
            const loggedUser = JSON.parse(loggedUserRaw);
            if (loggedUser && loggedUser.role === 'Master') return; // Master creates notifications, doesn't need popups

            // Only trigger if user just completed login action
            const justLoggedIn = sessionStorage.getItem('MAPAOS_JUST_LOGGED_IN');
            if (!justLoggedIn) return;

            const notifCheckInterval = setInterval(async () => {
                if (typeof dbGetActiveNotifications === 'function' && typeof supabaseClientInstance !== 'undefined' && supabaseClientInstance) {
                    clearInterval(notifCheckInterval);
                    
                    // Consume the flag so refreshing the page won't trigger the modal again
                    sessionStorage.removeItem('MAPAOS_JUST_LOGGED_IN');

                    const activeNotifs = await dbGetActiveNotifications();
                    if (!activeNotifs || activeNotifs.length === 0) return;

                    // Display the latest active notification
                    const currentNotif = activeNotifs[0];
                    renderUserNotificationModal(currentNotif);
                }
            }, 100);
            setTimeout(() => clearInterval(notifCheckInterval), 6000);
        } catch (err) {
            console.error('Erro ao buscar notificações do usuário:', err);
        }
    }

    window.renderUserNotificationModal = function(notif) {
        // Remove existing modal if any
        const existing = document.getElementById('user-notif-modal');
        if (existing) existing.remove();

        const modalHTML = `
            <div id="user-notif-modal" class="fixed inset-0 z-[9999] flex items-center justify-center bg-[#060e20]/85 backdrop-blur-md transition-all duration-300 opacity-0 pointer-events-none p-4">
                <div class="glass-card w-[92%] max-w-[500px] p-6 sm:p-8 rounded-3xl flex flex-col gap-5 border border-white/15 shadow-2xl transform scale-95 transition-all duration-300 relative overflow-hidden">
                    
                    <!-- Decorative glow behind header -->
                    <div class="absolute -top-12 -right-12 w-32 h-32 bg-primary/20 rounded-full blur-2xl pointer-events-none"></div>

                    <!-- Header icon & Title -->
                    <div class="flex items-start gap-4">
                        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary-container/20 border border-primary/30 flex items-center justify-center shrink-0 text-primary shadow-inner">
                            <span class="material-symbols-outlined text-2xl" style="font-variation-settings:'FILL' 1">campaign</span>
                        </div>
                        <div class="flex-1 min-w-0 pr-6">
                            <span class="text-[10px] uppercase font-bold tracking-widest text-primary px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 inline-block mb-1">Aviso Importante</span>
                            <h3 class="text-lg font-bold text-on-surface leading-tight tracking-tight">${notif.title}</h3>
                        </div>
                        <button id="close-user-notif-btn" class="absolute top-5 right-5 text-on-surface-variant hover:text-on-surface hover:bg-white/10 p-2 rounded-full transition-colors flex items-center justify-center">
                            <span class="material-symbols-outlined text-xl">close</span>
                        </button>
                    </div>

                    <!-- Message Body -->
                    <div class="max-h-[50vh] overflow-y-auto pr-1 no-scrollbar text-xs sm:text-sm text-on-surface-variant/90 leading-relaxed whitespace-pre-line border-y border-white/5 py-4">
                        ${notif.message}
                    </div>

                    <!-- Action Footer -->
                    <div class="flex items-center justify-end pt-1">
                        <button id="ack-user-notif-btn" class="w-full sm:w-auto px-6 h-11 rounded-xl bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg">
                            <span>Estou Ciente</span>
                            <span class="material-symbols-outlined text-base">check</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        const modal = document.getElementById('user-notif-modal');
        const card = modal.querySelector('.glass-card');

        requestAnimationFrame(() => {
            modal.classList.remove('opacity-0', 'pointer-events-none');
            card.classList.remove('scale-95');
            card.classList.add('scale-100');
        });

        const closeModalFunc = () => {
            modal.classList.add('opacity-0', 'pointer-events-none');
            card.classList.remove('scale-100');
            card.classList.add('scale-95');

            // Mark notification as seen in localStorage
            try {
                let seenIds = JSON.parse(localStorage.getItem('MAPAOS_SEEN_NOTIFICATIONS') || '[]');
                if (!seenIds.includes(notif.id)) {
                    seenIds.push(notif.id);
                    localStorage.setItem('MAPAOS_SEEN_NOTIFICATIONS', JSON.stringify(seenIds));
                }
                updateNotificationBellDot();
            } catch (e) {}

            setTimeout(() => { modal.remove(); }, 300);
        };

        document.getElementById('close-user-notif-btn').addEventListener('click', closeModalFunc);
        document.getElementById('ack-user-notif-btn').addEventListener('click', closeModalFunc);
    };

    // Helper to check unread notifications and toggle the red dot on header bell icon
    async function updateNotificationBellDot() {
        try {
            const bellDot = document.getElementById('notif-bell-dot');
            if (!bellDot) return;

            if (typeof dbGetActiveNotifications === 'function' && typeof supabaseClientInstance !== 'undefined' && supabaseClientInstance) {
                const activeNotifs = await dbGetActiveNotifications();
                if (!activeNotifs || activeNotifs.length === 0) {
                    bellDot.classList.add('hidden');
                    return;
                }

                let seenIds = [];
                try {
                    seenIds = JSON.parse(localStorage.getItem('MAPAOS_SEEN_NOTIFICATIONS') || '[]');
                } catch (e) { seenIds = []; }

                const hasUnread = activeNotifs.some(n => !seenIds.includes(n.id));
                if (hasUnread) {
                    bellDot.classList.remove('hidden');
                } else {
                    bellDot.classList.add('hidden');
                }
            }
        } catch (e) {
            console.error('Error updating notification bell dot:', e);
        }
    }

    // Toggle Notification Dropdown list in header
    window.toggleNotificationDropdown = async function(e) {
        if (e) e.stopPropagation();
        
        let dropdown = document.getElementById('header-notif-dropdown');
        if (dropdown) {
            const isHidden = dropdown.classList.contains('hidden');
            if (isHidden) {
                dropdown.classList.remove('hidden');
                await renderNotificationDropdownItems();
            } else {
                dropdown.classList.add('hidden');
            }
            return;
        }

        // Create dropdown element
        const dropdownHTML = `
            <div id="header-notif-dropdown" class="absolute top-16 left-0 right-0 sm:left-12 sm:right-auto w-full sm:w-[360px] bg-[#131b2e]/95 backdrop-blur-xl p-4 rounded-2xl border border-white/20 shadow-2xl shadow-black/80 z-[9999] flex flex-col gap-3 transition-all duration-300">
                <div class="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <div class="flex items-center gap-2 text-primary font-bold text-xs">
                        <span class="material-symbols-outlined text-base">notifications</span>
                        <span>Notificações</span>
                    </div>
                    <span id="notif-dropdown-count" class="text-[10px] px-2.5 py-0.5 rounded-full bg-primary/20 text-primary font-bold border border-primary/30">0 ativas</span>
                </div>
                <div id="notif-dropdown-list" class="max-h-[320px] overflow-y-auto no-scrollbar flex flex-col gap-2.5">
                    <div class="text-center py-6 text-xs text-on-surface-variant/70 flex items-center justify-center gap-2">
                        <svg class="animate-spin h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                        <span>Carregando avisos...</span>
                    </div>
                </div>
            </div>
        `;

        const header = document.querySelector('header');
        if (header) {
            header.insertAdjacentHTML('beforeend', dropdownHTML);
            await renderNotificationDropdownItems();
        }
    };

    async function renderNotificationDropdownItems() {
        const listContainer = document.getElementById('notif-dropdown-list');
        const countSpan = document.getElementById('notif-dropdown-count');
        if (!listContainer) return;

        if (typeof dbGetActiveNotifications !== 'function') {
            listContainer.innerHTML = `<p class="text-xs text-center py-4 text-on-surface-variant/60">Sem dados de notificação.</p>`;
            return;
        }

        const activeNotifs = await dbGetActiveNotifications();
        let seenIds = [];
        try {
            seenIds = JSON.parse(localStorage.getItem('MAPAOS_SEEN_NOTIFICATIONS') || '[]');
        } catch (e) { seenIds = []; }

        if (countSpan) {
            countSpan.textContent = `${activeNotifs ? activeNotifs.length : 0} ativas`;
        }

        if (!activeNotifs || activeNotifs.length === 0) {
            listContainer.innerHTML = `
                <div class="text-center py-6 text-xs text-on-surface-variant/70 flex flex-col items-center gap-1.5">
                    <span class="material-symbols-outlined text-2xl text-on-surface-variant/40">notifications_off</span>
                    <span>Nenhuma notificação ativa no momento.</span>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = activeNotifs.map(n => {
            const isUnread = !seenIds.includes(n.id);
            const dateStr = n.created_at ? new Date(n.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';

            return `
                <div onclick="openSingleNotifModal('${n.id}')" class="p-3.5 rounded-xl ${isUnread ? 'bg-[#1e2942] border-primary/40' : 'bg-[#171f33] border-white/10'} border hover:bg-[#253250] transition-all cursor-pointer flex flex-col gap-1.5 relative group shadow-md">
                    <div class="flex items-center justify-between">
                        <span class="font-bold text-xs text-on-surface truncate pr-2">${n.title}</span>
                        ${isUnread ? '<span class="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 ring-2 ring-red-500/30"></span>' : ''}
                    </div>
                    <p class="text-[11px] text-on-surface-variant/90 line-clamp-2 leading-relaxed">${n.message}</p>
                    ${dateStr ? `<span class="text-[9px] text-on-surface-variant/60 self-end mt-0.5">${dateStr}</span>` : ''}
                </div>
            `;
        }).join('');
    }

    // Open specific notification modal when clicked from dropdown list
    window.openSingleNotifModal = async function(notifId) {
        if (typeof dbGetActiveNotifications === 'function') {
            const activeNotifs = await dbGetActiveNotifications();
            const target = activeNotifs.find(n => n.id === notifId);
            if (target) {
                renderUserNotificationModal(target);
                const dropdown = document.getElementById('header-notif-dropdown');
                if (dropdown) dropdown.classList.add('hidden');
            }
        }
    };

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('header-notif-dropdown');
        const bellBtn = document.getElementById('header-notif-bell-btn');
        if (dropdown && !dropdown.contains(e.target) && bellBtn && !bellBtn.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });

    checkAndDisplayNotifications();
    setTimeout(updateNotificationBellDot, 800);

    // Dynamic clients list loaded from Supabase database
    let clientsList = [];
    async function fetchClients() {
        if (typeof dbGetClients === 'function') {
            try {
                const list = await dbGetClients();
                clientsList = list.map(c => c.name.toUpperCase());
            } catch (e) {
                console.error("Erro ao carregar clientes do banco:", e);
            }
        }
    }
    fetchClients();

    // Inject premium loading overlay (Hidden by default, shown during specific actions like creating a reservation)
    const loaderHTML = `
        <div id="global-loader" class="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#060e20] transition-opacity duration-500 ease-out opacity-0 pointer-events-none" style="display: none;">
            <div class="relative flex flex-col items-center">
                <img src="img/mapaos-logo-loading.gif" alt="Carregando..." class="w-40 h-40 object-contain rounded-full shadow-2xl border border-primary/20">
                <div class="mt-6 flex items-center gap-2">
                    <span class="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style="animation-delay: 0.1s"></span>
                    <span class="w-2.5 h-2.5 bg-secondary-fixed rounded-full animate-bounce" style="animation-delay: 0.2s"></span>
                    <span class="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style="animation-delay: 0.3s"></span>
                </div>
            </div>
        </div>
    `;

    // Inject Reservation Modal HTML with custom fields
    const modalHTML = `
        <div id="reservation-modal" class="fixed inset-0 z-[9998] flex items-center justify-center bg-[#060e20]/80 backdrop-blur-md opacity-0 pointer-events-none transition-all duration-300" style="display: none;">
            <div class="glass-card w-[90%] max-w-[500px] p-6 md:p-8 rounded-2xl flex flex-col gap-6 transform scale-95 transition-all duration-300 border-t-white/20">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="font-headline-lg-mobile text-headline-lg-mobile text-primary">Nova Reserva</h3>
                        <p class="text-on-surface-variant text-sm mt-1">Preencha os dados da nova ordem de serviço.</p>
                    </div>
                    <button id="close-reservation-modal" class="text-on-surface-variant hover:text-on-surface hover:bg-white/10 p-2 rounded-full transition-colors flex items-center justify-center">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                
                <form id="reservation-form" class="flex flex-col gap-4">
                    <!-- Cliente Autocomplete -->
                    <div class="flex flex-col gap-unit relative">
                        <label class="text-label-sm font-label-sm text-on-surface-variant px-1">Cliente</label>
                        <div class="relative group">
                            <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">domain</span>
                            <input id="modal-client-search" class="glass-input w-full h-12 pl-12 pr-4 rounded-xl text-on-surface placeholder:text-on-surface-variant/40" placeholder="Buscar cliente..." autocomplete="off" required />
                        </div>
                        <div id="client-autocomplete-list" class="absolute top-[76px] left-0 right-0 max-h-48 overflow-y-auto bg-[#0b1326]/95 border border-white/10 rounded-lg z-50 hidden shadow-2xl backdrop-blur-xl">
                            <!-- Populated dynamically -->
                        </div>
                    </div>

                    <!-- Data e Hora -->
                    <div class="grid grid-cols-2 gap-4">
                        <div class="flex flex-col gap-unit relative">
                            <label class="text-label-sm font-label-sm text-on-surface-variant px-1">Data</label>
                            <div class="relative">
                                <input id="modal-date-display" class="glass-input w-full h-12 px-4 rounded-xl text-on-surface placeholder:text-on-surface-variant/40" placeholder="DD/MM/AAAA" type="text" maxlength="10" required />
                                <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">calendar_today</span>
                                <input id="modal-date-picker" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full" type="date" tabindex="-1" />
                            </div>
                        </div>
                        <div class="flex flex-col gap-unit relative">
                            <label class="text-label-sm font-label-sm text-on-surface-variant px-1">Horário</label>
                            <div class="relative">
                                <input id="modal-time-display" class="glass-input w-full h-12 px-4 rounded-xl text-on-surface placeholder:text-on-surface-variant/40" placeholder="HH:MM" type="text" maxlength="5" required />
                                <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">schedule</span>
                                <input id="modal-time-picker" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full" type="time" tabindex="-1" />
                            </div>
                        </div>
                    </div>

                    <!-- Nº OS/Voucher e Nº Reserva -->
                    <div class="grid grid-cols-2 gap-4">
                        <div class="flex flex-col gap-unit">
                            <label class="text-label-sm font-label-sm text-on-surface-variant px-1">Nº OS / Voucher</label>
                            <div class="relative group">
                                <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">receipt</span>
                                <input id="modal-os-number" class="glass-input w-full h-12 pl-12 pr-4 rounded-xl text-on-surface placeholder:text-on-surface-variant/40" placeholder="Ex: 1.000" type="text" inputmode="numeric" />
                            </div>
                        </div>
                        <div class="flex flex-col gap-unit">
                            <label class="text-label-sm font-label-sm text-on-surface-variant px-1">Nº Reserva</label>
                            <div class="relative group">
                                <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">bookmark</span>
                                <input id="modal-reserva-number" class="glass-input w-full h-12 pl-12 pr-4 rounded-xl text-on-surface placeholder:text-on-surface-variant/40" placeholder="Ex: 1.250" type="text" inputmode="numeric" required />
                            </div>
                        </div>
                    </div>

                    <!-- Observações -->
                    <div class="flex flex-col gap-unit">
                        <label class="text-label-sm font-label-sm text-on-surface-variant px-1">Observações</label>
                        <div class="relative group">
                            <span class="material-symbols-outlined absolute left-4 top-3 text-on-surface-variant group-focus-within:text-primary transition-colors">notes</span>
                            <textarea id="modal-notes" class="glass-input w-full pl-12 pr-4 py-2.5 rounded-xl text-on-surface placeholder:text-on-surface-variant/40 h-20 resize-none" placeholder="Observações adicionais..."></textarea>
                        </div>
                    </div>

                    <!-- CTA Submit Button -->
                    <button type="submit" id="btn-modal-submit" class="primary-glow bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold h-12 rounded-xl active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-unit mt-2">
                        <span>Criar Reserva</span>
                        <span class="material-symbols-outlined text-lg">check</span>
                    </button>
                </form>
            </div>
        </div>
    `;

    // Inject iOS PWA Installation Guide Modal
    const iosInstallModalHTML = `
        <div id="ios-install-modal" class="fixed inset-0 z-[9999] flex items-center justify-center bg-[#060e20]/80 backdrop-blur-md opacity-0 pointer-events-none transition-all duration-300" style="display: none;">
            <div class="glass-card w-[90%] max-w-[400px] p-6 rounded-2xl flex flex-col gap-5 transform scale-95 transition-all duration-300 border-t-white/20">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="font-headline-lg-mobile text-lg text-primary font-bold">Instalar no iPhone</h3>
                        <p class="text-on-surface-variant text-xs mt-1">Siga os passos simples abaixo para adicionar o Mapa.OS à sua tela inicial:</p>
                    </div>
                    <button id="close-ios-install-modal" class="text-on-surface-variant hover:text-on-surface hover:bg-white/10 p-2 rounded-full transition-colors flex items-center justify-center">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                
                <div class="flex flex-col gap-4 text-xs">
                    <div class="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                        <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                            <span class="material-symbols-outlined text-base">ios_share</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="font-bold text-on-surface">Passo 1</span>
                            <span class="text-on-surface-variant">Toque no botão de <strong>Compartilhar</strong> na barra do seu navegador.</span>
                        </div>
                    </div>

                    <div class="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                        <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                            <span class="material-symbols-outlined text-base">add_to_home_screen</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="font-bold text-on-surface">Passo 2</span>
                            <span class="text-on-surface-variant">Role a lista de opções e toque em <strong>Adicionar à Tela de Início</strong>.</span>
                        </div>
                    </div>

                    <div class="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                        <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                            <span class="material-symbols-outlined text-base">done</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="font-bold text-on-surface">Passo 3</span>
                            <span class="text-on-surface-variant">Toque em <strong>Adicionar</strong> no canto superior direito para confirmar.</span>
                        </div>
                    </div>
                </div>

                <button id="btn-close-ios-guide" class="primary-glow bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold h-11 rounded-xl active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-unit">
                    <span>Entendi</span>
                </button>
            </div>
        </div>
    `;

    // Inject Vehicle Coming Soon Modal
    const vehicleComingSoonModalHTML = `
        <div id="vehicle-coming-soon-modal" class="fixed inset-0 z-[9999] flex items-center justify-center bg-[#060e20]/80 backdrop-blur-md opacity-0 pointer-events-none transition-all duration-300" style="display: none;">
            <div class="glass-card w-[92%] max-w-[460px] p-6 md:p-7 rounded-2xl flex flex-col gap-5 transform scale-95 transition-all duration-300 border border-amber-500/20 bg-gradient-to-b from-[#131b2e] to-[#0b1326]">
                <div class="flex justify-between items-start">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                            <span class="material-symbols-outlined text-2xl">directions_car</span>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h3 class="font-bold text-base text-on-surface">Controle do Veículo</h3>
                                <span class="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold uppercase tracking-wider">Em Breve</span>
                            </div>
                            <p class="text-xs text-on-surface-variant/80 mt-0.5">Gestão completa e inteligente da sua frota em um só lugar.</p>
                        </div>
                    </div>
                    <button onclick="closeVehicleComingSoonModal()" class="text-on-surface-variant hover:text-on-surface hover:bg-white/10 p-1.5 rounded-full transition-colors flex items-center justify-center">
                        <span class="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>

                <div class="space-y-3 text-xs">
                    <!-- Feature 1: Abastecimento -->
                    <div class="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                        <div class="flex items-center gap-2 text-secondary-fixed font-bold">
                            <span class="material-symbols-outlined text-base">local_gas_station</span>
                            <span>Registro de Abastecimento</span>
                        </div>
                        <p class="text-on-surface-variant leading-relaxed">
                            Controle total de consumos, <strong>médias de KM por litro</strong> e análise detalhada dos seus <strong>custos diários e mensais</strong> de combustível.
                        </p>
                    </div>

                    <!-- Feature 2: Manutenção & Garantias -->
                    <div class="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                        <div class="flex items-center gap-2 text-primary font-bold">
                            <span class="material-symbols-outlined text-base">build</span>
                            <span>Manutenção & Alertas</span>
                        </div>
                        <p class="text-on-surface-variant leading-relaxed">
                            Acompanhamento de revisões com <strong>alertas de vencimento</strong> por data/KM, além do controle rigoroso de <strong>garantias de peças e serviços</strong> realizados.
                        </p>
                    </div>
                </div>

                <button onclick="closeVehicleComingSoonModal()" class="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/30 text-amber-300 font-bold text-xs hover:bg-amber-500/30 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined text-base">notifications_active</span>
                    <span>Notifique-me quando lançar</span>
                </button>
            </div>
        </div>
    `;

    // Inject Wallet Coming Soon Modal
    const walletComingSoonModalHTML = `
        <div id="wallet-coming-soon-modal" class="fixed inset-0 z-[9999] flex items-center justify-center bg-[#060e20]/80 backdrop-blur-md opacity-0 pointer-events-none transition-all duration-300" style="display: none;">
            <div class="glass-card w-[92%] max-w-[460px] p-6 md:p-7 rounded-2xl flex flex-col gap-5 transform scale-95 transition-all duration-300 border border-amber-500/20 bg-gradient-to-b from-[#131b2e] to-[#0b1326]">
                <div class="flex justify-between items-start">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                            <span class="material-symbols-outlined text-2xl">account_balance_wallet</span>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h3 class="font-bold text-base text-on-surface">Carteira de Documentos</h3>
                                <span class="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold uppercase tracking-wider">Em Breve</span>
                            </div>
                            <p class="text-xs text-on-surface-variant/80 mt-0.5">Seus documentos essenciais sempre à mão e organizados.</p>
                        </div>
                    </div>
                    <button onclick="closeWalletComingSoonModal()" class="text-on-surface-variant hover:text-on-surface hover:bg-white/10 p-1.5 rounded-full transition-colors flex items-center justify-center">
                        <span class="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>

                <div class="space-y-3 text-xs">
                    <!-- Feature 1: Arquivamento Digital -->
                    <div class="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                        <div class="flex items-center gap-2 text-secondary-fixed font-bold">
                            <span class="material-symbols-outlined text-base">folder_shared</span>
                            <span>Arquivamento Seguro de Documentos</span>
                        </div>
                        <p class="text-on-surface-variant leading-relaxed">
                            Espaço exclusivo para armazenar e consultar digitalmente <strong>CRLV do Veículo</strong>, <strong>Selo GNV</strong>, <strong>CNH do Condutor</strong>, apólices de seguro e comprovantes.
                        </p>
                    </div>

                    <!-- Feature 2: Lembretes de Vencimento -->
                    <div class="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                        <div class="flex items-center gap-2 text-primary font-bold">
                            <span class="material-symbols-outlined text-base">alarm</span>
                            <span>Alertas de Renovação & Vencimentos</span>
                        </div>
                        <p class="text-on-surface-variant leading-relaxed">
                            Receba avisos automáticos antes do vencimento do seu <strong>Licenciamento</strong>, <strong>Vistoria do GNV</strong> e <strong>Validade da CNH</strong> para nunca perder os prazos legais.
                        </p>
                    </div>
                </div>

                <button onclick="closeWalletComingSoonModal()" class="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/30 text-amber-300 font-bold text-xs hover:bg-amber-500/30 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined text-base">notifications_active</span>
                    <span>Notifique-me quando lançar</span>
                </button>
            </div>
        </div>
    `;

    // Inject Speed Dial Floating Menu HTML & Dynamic Styles
    const speedDialHTML = `
        <style>
            #speed-dial-container .speed-dial-btn {
                transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
                will-change: transform, opacity;
            }
            /* Closed State: Collapsed behind the central '+' button */
            #speed-dial-container.sd-closed #sd-btn-fuel {
                transform: translate(65px, 45px) scale(0);
                opacity: 0;
            }
            #speed-dial-container.sd-closed #sd-btn-reservation {
                transform: translate(0px, 50px) scale(0);
                opacity: 0;
            }
            #speed-dial-container.sd-closed #sd-btn-maint {
                transform: translate(-65px, 45px) scale(0);
                opacity: 0;
            }
            /* Open State: Popped out into position */
            #speed-dial-container.sd-open #sd-btn-fuel {
                transform: translate(0, 0) scale(1);
                opacity: 1;
                transition-delay: 0ms;
            }
            #speed-dial-container.sd-open #sd-btn-reservation {
                transform: translate(0, -16px) scale(1);
                opacity: 1;
                transition-delay: 40ms;
            }
            #speed-dial-container.sd-open #sd-btn-maint {
                transform: translate(0, 0) scale(1);
                opacity: 1;
                transition-delay: 80ms;
            }
        </style>

        <div id="speed-dial-backdrop" class="fixed inset-0 z-[9990] bg-[#060e20]/75 backdrop-blur-sm opacity-0 pointer-events-none transition-all duration-300"></div>

        <div id="speed-dial-container" class="sd-closed fixed bottom-28 left-1/2 -translate-x-1/2 z-[9995] pointer-events-none transition-all duration-300 flex items-center justify-center gap-4 sm:gap-6">
            <!-- 1. Abastecimento (Esquerda) -->
            <button id="sd-btn-fuel" class="speed-dial-btn flex flex-col items-center gap-1 group pointer-events-auto active:scale-90">
                <div class="w-12 h-12 rounded-full bg-[#131b2e] border border-secondary-container/40 text-secondary-container flex items-center justify-center shadow-xl shadow-black/60 group-hover:bg-secondary-container group-hover:text-[#003828] transition-all">
                    <span class="material-symbols-outlined text-2xl" style="font-variation-settings:'FILL' 1">local_gas_station</span>
                </div>
                <span class="text-[10px] font-bold text-on-surface bg-[#131b2e]/95 border border-white/10 px-2 py-0.5 rounded-md shadow-md whitespace-nowrap">Abastecimento</span>
            </button>

            <!-- 2. Nova Reserva (Centro / Mais Alto) -->
            <button id="sd-btn-reservation" class="speed-dial-btn flex flex-col items-center gap-1 group pointer-events-auto active:scale-90">
                <div class="w-14 h-14 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary flex items-center justify-center shadow-2xl shadow-primary/40 group-hover:scale-105 transition-all border border-white/30">
                    <span class="material-symbols-outlined text-2xl font-bold" style="font-variation-settings:'FILL' 1">bookmark_add</span>
                </div>
                <span class="text-[10px] font-bold text-primary bg-[#131b2e]/95 border border-primary/30 px-2.5 py-0.5 rounded-md shadow-md whitespace-nowrap">Nova Reserva</span>
            </button>

            <!-- 3. Manutenção (Direita) -->
            <button id="sd-btn-maint" class="speed-dial-btn flex flex-col items-center gap-1 group pointer-events-auto active:scale-90">
                <div class="w-12 h-12 rounded-full bg-[#131b2e] border border-amber-400/40 text-amber-400 flex items-center justify-center shadow-xl shadow-black/60 group-hover:bg-amber-400 group-hover:text-[#410002] transition-all">
                    <span class="material-symbols-outlined text-2xl" style="font-variation-settings:'FILL' 1">build</span>
                </div>
                <span class="text-[10px] font-bold text-on-surface bg-[#131b2e]/95 border border-white/10 px-2 py-0.5 rounded-md shadow-md whitespace-nowrap">Manutenção</span>
            </button>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', loaderHTML);
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.insertAdjacentHTML('beforeend', iosInstallModalHTML);
    document.body.insertAdjacentHTML('beforeend', vehicleComingSoonModalHTML);
    document.body.insertAdjacentHTML('beforeend', walletComingSoonModalHTML);
    document.body.insertAdjacentHTML('beforeend', speedDialHTML);

    const loader = document.getElementById('global-loader');
    const modal = document.getElementById('reservation-modal');

    // Fade out loader on load
    window.addEventListener('load', () => {
        fadeOutLoader();
    });
    setTimeout(() => {
        fadeOutLoader();
    }, 800);

    function fadeOutLoader() {
        if (loader && !loader.classList.contains('pointer-events-none')) {
            loader.classList.add('opacity-0', 'pointer-events-none');
            setTimeout(() => {
                loader.style.display = 'none';
            }, 500);
        }
    }

    function fadeInLoaderAndRedirect(targetUrl) {
        window.location.href = targetUrl;
    }

    // Pre-fill Date display with current date in DD/MM/AAAA
    function setTodayDate() {
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yyyy = today.getFullYear();
        const formatted = `${dd}/${mm}/${yyyy}`;

        const display = document.getElementById('modal-date-display');
        const picker = document.getElementById('modal-date-picker');
        if (display) display.value = formatted;
        if (picker) picker.value = `${yyyy}-${mm}-${dd}`;
    }

    // Modal Control Functions
    function openModal() {
        fetchClients(); // Refresh clients list from database on open
        if (modal) {
            modal.style.display = 'flex';
            modal.offsetHeight;
            modal.classList.remove('opacity-0', 'pointer-events-none');
            const innerCard = modal.querySelector('.glass-card');
            if (innerCard) {
                innerCard.classList.remove('scale-95');
                innerCard.classList.add('scale-100');
            }
            // Set Today's date on open
            setTodayDate();
        }
    }

    function closeModal() {
        if (modal) {
            modal.classList.add('opacity-0', 'pointer-events-none');
            const innerCard = modal.querySelector('.glass-card');
            if (innerCard) {
                innerCard.classList.remove('scale-100');
                innerCard.classList.add('scale-95');
            }
            setTimeout(() => {
                modal.style.display = 'none';
                document.getElementById('reservation-form').reset();
                const dropdown = document.getElementById('client-autocomplete-list');
                if (dropdown) dropdown.classList.add('hidden');
            }, 300);
        }
    }

    // Retrieve user name and calculate remaining active days from localStorage cache
    const loggedUserRaw = localStorage.getItem('MAPAOS_LOGGED_USER');
    let loggedUserName = 'Usuário';
    let expiryBadgeHTML = '';
    let userObj = null;
    
    if (loggedUserRaw) {
        try {
            userObj = JSON.parse(loggedUserRaw);
            loggedUserName = userObj.name || userObj.email.split('@')[0];
            
            // Calculate days remaining (only for regular users, excluding Master role)
            if (userObj.role !== 'Master') {
                const status = userObj.status;
                if (status === 'Congelado') {
                    expiryBadgeHTML = `<span class="text-[9px] text-yellow-400 font-bold flex items-center gap-1 leading-none mt-0.5"><span class="material-symbols-outlined text-[12px] font-bold">pause_circle</span> Acesso Congelado</span>`;
                } else if (status === 'Rejeitado') {
                    expiryBadgeHTML = `<span class="text-[9px] text-red-400 font-bold flex items-center gap-1 leading-none mt-0.5"><span class="material-symbols-outlined text-[12px] font-bold">block</span> Acesso Revogado</span>`;
                } else if (userObj.expires_at) {
                    const expiryDate = new Date(userObj.expires_at);
                    const today = new Date();
                    const diffTime = expiryDate - today;
                    const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
                    
                    if (daysRemaining <= 0) {
                        expiryBadgeHTML = `<span class="text-[9px] text-red-400 font-bold flex items-center gap-1 leading-none mt-0.5"><span class="material-symbols-outlined text-[12px] font-bold">error</span> Acesso Expirado</span>`;
                    } else if (daysRemaining <= 5) {
                        expiryBadgeHTML = `<span class="text-[9px] text-yellow-400 font-bold flex items-center gap-1 leading-none mt-0.5"><span class="material-symbols-outlined text-[12px] font-bold">warning</span> Expira em ${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'}</span>`;
                    } else {
                        expiryBadgeHTML = `<span class="text-[9px] text-emerald-400 font-medium flex items-center gap-0.5 leading-none mt-0.5"><span class="material-symbols-outlined text-[11px]">event_available</span> ${daysRemaining} dias de acesso</span>`;
                    }
                }

                // Inject Status Warning Modal if status is not Approved
                if (status === 'Congelado' || status === 'Expirado' || status === 'Rejeitado') {
                    let title = "Aviso de Acesso";
                    let message = "Seu acesso está restrito no momento.";
                    let icon = "warning";
                    let iconColor = "text-yellow-400";
                    let borderClass = "border-yellow-500/30";

                    if (status === 'Congelado') {
                        title = "Acesso Congelado";
                        message = "Sua conta foi congelada temporariamente pelo Administrador. Os seus dias restantes de acesso foram salvos e voltarão a contar assim que a conta for descongelada.";
                        icon = "pause_circle";
                        iconColor = "text-yellow-400";
                        borderClass = "border-yellow-500/30";
                    } else if (status === 'Expirado') {
                        title = "Acesso Expirado";
                        message = "Seu período de acesso de 30 dias expirou. Regularize sua assinatura com o Administrador Master para restabelecer o acesso completo e poder realizar novas reservas.";
                        icon = "error";
                        iconColor = "text-red-400";
                        borderClass = "border-red-500/30";
                    } else if (status === 'Rejeitado') {
                        title = "Acesso Revogado";
                        message = "Seu acesso a esta conta foi revogado ou recusado pelo Administrador Master. Entre em contato para maiores esclarecimentos.";
                        icon = "block";
                        iconColor = "text-red-400";
                        borderClass = "border-red-500/30";
                    }

                    const warningModalHTML = `
                        <div id="status-warning-modal" class="fixed inset-0 z-[10000] flex items-center justify-center bg-[#060e20]/85 backdrop-blur-md transition-all duration-300">
                            <div class="glass-card w-[90%] max-w-[400px] p-6 rounded-2xl flex flex-col gap-5 transform scale-100 transition-all border ${borderClass} shadow-2xl">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                                        <span class="material-symbols-outlined ${iconColor} text-2xl">${icon}</span>
                                    </div>
                                    <div>
                                        <h3 class="font-headline-lg-mobile text-lg font-bold text-on-surface">${title}</h3>
                                        <span class="text-[10px] text-on-surface-variant uppercase tracking-wider">Aviso do Sistema</span>
                                    </div>
                                </div>
                                
                                <p class="text-xs text-on-surface-variant leading-relaxed">
                                    ${message}
                                </p>

                                <div class="flex flex-col gap-2 mt-2">
                                    <button onclick="document.getElementById('status-warning-modal').remove()" class="primary-glow bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold h-11 rounded-xl active:scale-[0.98] transition-all duration-300 flex items-center justify-center">
                                        <span>Visualizar Painel (Leitura)</span>
                                    </button>
                                    <a href="login.html" onclick="localStorage.removeItem('MAPAOS_LOGGED_USER')" class="h-11 rounded-xl bg-white/5 hover:bg-white/10 text-on-surface text-xs font-bold flex items-center justify-center border border-white/10 active:scale-[0.98] transition-all">
                                        Sair da Conta
                                    </a>
                                </div>
                            </div>
                        </div>
                    `;
                    // Insert modal HTML safely
                    setTimeout(() => {
                        document.body.insertAdjacentHTML('beforeend', warningModalHTML);
                    }, 500);
                }
            }
        } catch (e) {
            console.error('Error parsing logged user details:', e);
        }
    }

    // TopAppBar Template
    const topAppBarHTML = `
        <header class="fixed top-4 left-4 right-4 rounded-lg bg-[#131b2e]/90 backdrop-blur-2xl border border-white/10 shadow-xl shadow-black/40 z-50 flex justify-between items-center px-gutter h-16 w-[calc(100%-32px)] md:w-[calc(100%-80px)] mx-auto md:top-10 md:left-10 md:right-10 transition-transform">
            <div class="flex items-center gap-3">
                <div class="flex items-center gap-3 cursor-pointer" id="nav-brand-btn">
                    <img src="img/mapaos-logo-sf.svg" alt="Logo Mapa.OS" class="w-8 h-8 object-contain">
                    <div class="flex flex-col justify-center">
                        <div class="whitespace-nowrap text-sm sm:text-base md:text-lg font-bold tracking-tight text-primary dark:text-primary-fixed-dim leading-none truncate max-w-[100px] min-[375px]:max-w-[140px] min-[425px]:max-w-[180px] sm:max-w-none flex items-center">
                            ${loggedUserName}
                            ${(typeof isUserPro === 'function' && isUserPro()) ? '<span class="pro-plan-badge">PRO</span>' : ''}
                        </div>
                        ${expiryBadgeHTML}
                    </div>
                </div>
                <!-- Top Bar Notification Bell Button (Perfectly Round) -->
                <button id="header-notif-bell-btn" onclick="toggleNotificationDropdown(event)" class="relative w-9 h-9 rounded-full text-on-surface-variant hover:text-primary hover:bg-white/10 transition-all flex items-center justify-center border border-white/10 active:scale-95 cursor-pointer shrink-0" title="Notificações">
                    <span class="material-symbols-outlined text-lg">notifications</span>
                    <!-- Unread Red Indicator Dot -->
                    <span id="notif-bell-dot" class="hidden absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-background animate-pulse"></span>
                </button>
            </div>
            <!-- Desktop Menu -->
            <div class="hidden md:flex gap-6 items-center relative" id="desktop-menu-container">
                <div id="desktop-nav-indicator" class="absolute lens-bubble rounded-xl z-0 pointer-events-none opacity-0" style="will-change: transform, left, width, top, height;"></div>
                <a class="nav-desktop-item font-label-sm text-label-sm flex flex-col items-center transition-colors duration-300" href="index.html" id="desktop-dashboard">
                    <span class="material-symbols-outlined mb-1">dashboard</span>
                    Painel
                </a>
                <a class="nav-desktop-item font-label-sm text-label-sm flex flex-col items-center transition-colors duration-300" href="historico_reserva.html" id="desktop-reservas">
                    <span class="material-symbols-outlined mb-1">list_alt</span>
                    Reservas
                </a>
                <a href="veiculo.html" onclick="if(typeof isUserPro === 'function' && !isUserPro()){ event.preventDefault(); openProUpgradeModal('Controle Veicular'); }" class="nav-desktop-item font-label-sm text-label-sm flex flex-col items-center transition-colors duration-300 relative" id="desktop-veiculo">
                    <span class="material-symbols-outlined mb-1">directions_car</span>
                    <!-- Red Vehicle Alert Badge (Desktop) -->
                    <span id="desktop-vehicle-alert-dot" class="hidden absolute top-0 right-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-background animate-pulse" title="Manutenção ou Alerta Pendente"></span>
                    <span class="flex items-center gap-0.5">
                        Veículo
                        ${(typeof isUserPro === 'function' && !isUserPro()) ? '<span class="material-symbols-outlined text-[10px] text-amber-400">lock</span>' : ''}
                    </span>
                </a>
                <a href="carteira.html" onclick="if(typeof isUserPro === 'function' && !isUserPro()){ event.preventDefault(); openProUpgradeModal('Carteira de Documentos'); }" class="nav-desktop-item font-label-sm text-label-sm flex flex-col items-center transition-colors duration-300 relative" id="desktop-carteira" title="Documentos / Carteira">
                    <span class="material-symbols-outlined mb-1">account_balance_wallet</span>
                    <span class="flex items-center gap-0.5">
                        Carteira
                        ${(typeof isUserPro === 'function' && !isUserPro()) ? '<span class="material-symbols-outlined text-[10px] text-amber-400">lock</span>' : ''}
                    </span>
                </a>
                <a class="nav-desktop-item font-label-sm text-label-sm flex flex-col items-center transition-colors duration-300" href="financeiro.html" id="desktop-financeiro">
                    <span class="material-symbols-outlined mb-1">payments</span>
                    Financeiro
                </a>
                <a class="nav-desktop-item font-label-sm text-label-sm flex flex-col items-center transition-colors duration-300" href="config.html" id="desktop-ajustes">
                    <span class="material-symbols-outlined mb-1">settings</span>
                    Ajustes
                </a>
            </div>
            <!-- User Profile Avatar & Add button -->
            <div class="flex items-center gap-3">
                <button id="pwa-install-btn" class="hidden flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30 text-emerald-400 active:scale-95 transition-all duration-300" title="Instalar Aplicativo">
                    <span class="material-symbols-outlined text-xl">download</span>
                </button>
                <button id="desktop-add-btn" class="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary shadow-lg shadow-primary/20 active:scale-95 transition-transform">
                    <span class="material-symbols-outlined font-bold">add</span>
                </button>
                <button id="nav-avatar-btn" class="w-10 h-10 rounded-full bg-white/5 border border-white/20 active:scale-95 transition-all duration-300 flex items-center justify-center text-primary">
                    <span class="material-symbols-outlined text-2xl">account_circle</span>
                </button>
            </div>
        </header>
    `;

    // BottomNavBar Template (Mobile Only)
    const bottomNavBarHTML = `
        <nav class="md:hidden fixed bottom-8 left-1/2 -translate-x-1/2 w-[min(96%,460px)] h-20 px-3 flex justify-between items-center z-50 bg-[#131b2e]/90 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/60 rounded-full" id="mobile-nav-container">
            <div id="mobile-nav-indicator" class="absolute lens-bubble rounded-full z-0 pointer-events-none opacity-0" style="will-change: transform, left, width, top, height;"></div>
            <!-- 1. Dashboard -->
            <a href="index.html" id="mobile-dashboard" class="nav-mobile-item flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300">
                <span class="material-symbols-outlined text-lg">dashboard</span>
            </a>
            <!-- 2. Reservas -->
            <a href="historico_reserva.html" id="mobile-reservas" class="nav-mobile-item flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300">
                <span class="material-symbols-outlined text-lg">list_alt</span>
            </a>
            <!-- 3. Controle Veículo -->
            <a href="veiculo.html" onclick="if(typeof isUserPro === 'function' && !isUserPro()){ event.preventDefault(); openProUpgradeModal('Controle Veicular'); }" id="mobile-veiculo" class="nav-mobile-item flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 relative" title="Controle do Veículo">
                <span class="material-symbols-outlined text-lg">directions_car</span>
                <!-- Red Vehicle Alert Badge (Mobile) -->
                <span id="mobile-vehicle-alert-dot" class="hidden absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-background animate-pulse" title="Manutenção ou Alerta Pendente"></span>
                ${(typeof isUserPro === 'function' && !isUserPro()) ? '<span class="material-symbols-outlined absolute -top-1 -right-1 text-[10px] text-amber-400">lock</span>' : ''}
            </a>

            <!-- 4. CENTRO: Botão Adicionar "+" Grande e Destacado -->
            <button id="mobile-add-btn" class="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary shadow-xl shadow-primary/40 active:scale-95 transition-transform -translate-y-4 z-20 shrink-0 border border-white/20">
                <span class="material-symbols-outlined text-2xl font-extrabold">add</span>
            </button>

            <!-- 5. Carteira Documentos (Exclusivo Pro) -->
            <a href="carteira.html" onclick="if(typeof isUserPro === 'function' && !isUserPro()){ event.preventDefault(); openProUpgradeModal('Carteira de Documentos'); }" id="mobile-carteira" class="nav-mobile-item flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 text-on-surface-variant relative" title="Carteira de Documentos">
                <span class="material-symbols-outlined text-lg">account_balance_wallet</span>
                ${(typeof isUserPro === 'function' && !isUserPro()) ? '<span class="material-symbols-outlined absolute -top-1 -right-1 text-[10px] text-amber-400">lock</span>' : ''}
            </a>
            <!-- 6. Financeiro -->
            <a href="financeiro.html" id="mobile-financeiro" class="nav-mobile-item flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300">
                <span class="material-symbols-outlined text-lg">payments</span>
            </a>
            <!-- 7. Ajustes -->
            <a href="config.html" id="mobile-ajustes" class="nav-mobile-item flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300">
                <span class="material-symbols-outlined text-lg">settings</span>
            </a>
        </nav>
    `;

    // Inject into container elements
    const topBarContainer = document.getElementById('top-app-bar');
    const bottomBarContainer = document.getElementById('bottom-nav-bar');

    if (topBarContainer) {
        topBarContainer.innerHTML = topAppBarHTML;
    }
    if (bottomBarContainer) {
        bottomBarContainer.innerHTML = bottomNavBarHTML;
    }

    // ── Inject Pro Upgrade Modal into body ──────────────────────────────
    if (!document.getElementById('pro-upgrade-modal')) {
        const proModalEl = document.createElement('div');
        proModalEl.id = 'pro-upgrade-modal';
        proModalEl.setAttribute('role', 'dialog');
        proModalEl.setAttribute('aria-modal', 'true');
        proModalEl.innerHTML = `
            <div class="pro-modal-card">
                <!-- Glow Icon -->
                <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#d97706);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;box-shadow:0 0 40px rgba(245,158,11,0.5);">
                    <span class="material-symbols-outlined" style="font-size:36px;color:#fff;font-variation-settings:'FILL' 1;">workspace_premium</span>
                </div>

                <!-- Title -->
                <div style="display:inline-flex;align-items:center;gap:8px;margin-bottom:8px;">
                    <span style="font-size:22px;font-weight:800;color:#fff;">Plano</span>
                    <span class="pro-plan-badge" style="font-size:11px;padding:3px 10px;">PRO</span>
                </div>
                <p id="pro-modal-feature-name" style="font-size:13px;color:rgba(245,158,11,0.9);font-weight:600;margin-bottom:20px;"></p>
                <p style="font-size:13px;color:#c1c6d7;line-height:1.6;margin-bottom:24px;">
                    Esta funcionalidade é exclusiva do <strong style="color:#f59e0b;">Plano Pro</strong>. Faça o upgrade para desbloquear acesso completo.
                </p>

                <!-- Features List -->
                <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:16px;margin-bottom:24px;text-align:left;">
                    <div class="pro-feature-item">
                        <span class="material-symbols-outlined" style="color:#f59e0b;font-size:20px;font-variation-settings:'FILL' 1;flex-shrink:0;">directions_car</span>
                        <div>
                            <p style="font-size:13px;font-weight:600;color:#dae2fd;">Controle Veicular</p>
                            <p style="font-size:11px;color:#8b90a0;">Abastecimento, manutenção e alertas inteligentes</p>
                        </div>
                    </div>
                    <div class="pro-feature-item">
                        <span class="material-symbols-outlined" style="color:#f59e0b;font-size:20px;font-variation-settings:'FILL' 1;flex-shrink:0;">account_balance_wallet</span>
                        <div>
                            <p style="font-size:13px;font-weight:600;color:#dae2fd;">Carteira de Documentos</p>
                            <p style="font-size:11px;color:#8b90a0;">CNH, CRLV, seguros e documentos digitais</p>
                        </div>
                    </div>
                    <div class="pro-feature-item">
                        <span class="material-symbols-outlined" style="color:#f59e0b;font-size:20px;font-variation-settings:'FILL' 1;flex-shrink:0;">psychology</span>
                        <div>
                            <p style="font-size:13px;font-weight:600;color:#dae2fd;">Análise Inteligente</p>
                            <p style="font-size:11px;color:#8b90a0;">Insights e relatórios avançados com IA</p>
                        </div>
                    </div>
                </div>

                <!-- Actions -->
                <div style="display:flex;flex-direction:column;gap:10px;">
                    <button id="pro-modal-request-btn"
                        style="width:100%;padding:13px;border-radius:14px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#1a0a00;font-weight:800;font-size:14px;border:none;cursor:pointer;box-shadow:0 4px 20px rgba(245,158,11,0.4);display:flex;align-items:center;justify-content:center;gap:8px;letter-spacing:0.02em;"
                        onclick="requestProUpgradeWhatsApp()">
                        <span class="material-symbols-outlined" style="font-size:18px;">star</span>
                        Solicitar Upgrade Pro no WhatsApp
                    </button>
                    <button onclick="closeProUpgradeModal()"
                        style="width:100%;padding:11px;border-radius:14px;background:rgba(255,255,255,0.06);color:#c1c6d7;font-weight:600;font-size:13px;border:1px solid rgba(255,255,255,0.1);cursor:pointer;">
                        Agora não
                    </button>
                </div>
            </div>
        `;
        proModalEl.addEventListener('click', (e) => { if (e.target === proModalEl) closeProUpgradeModal(); });
        document.body.appendChild(proModalEl);
    }

    // Wire Modal open/close events
    const closeBtn = document.getElementById('close-reservation-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    // Check user block status to disable the add button (excluding Master)
    const isBlocked = userObj && userObj.role !== 'Master' && userObj.status !== 'Aprovado';

    const mAddBtn = document.getElementById('mobile-add-btn');
    const dAddBtn = document.getElementById('desktop-add-btn');

    // Speed Dial Menu Toggle Functions
    const speedDialBackdrop = document.getElementById('speed-dial-backdrop');
    const speedDialContainer = document.getElementById('speed-dial-container');
    let isSpeedDialOpen = false;

    function openSpeedDial() {
        if (!speedDialContainer || !speedDialBackdrop) return;
        isSpeedDialOpen = true;
        speedDialBackdrop.style.display = 'block';
        speedDialContainer.style.display = 'flex';
        speedDialBackdrop.offsetHeight;
        
        speedDialBackdrop.classList.remove('opacity-0', 'pointer-events-none');
        speedDialContainer.classList.remove('sd-closed');
        speedDialContainer.classList.add('sd-open');

        // Rotate '+' icon smoothly
        const mIcon = mAddBtn ? mAddBtn.querySelector('.material-symbols-outlined') : null;
        if (mIcon) {
            mIcon.style.transition = 'transform 0.3s ease';
            mIcon.style.transform = 'rotate(135deg)';
        }
    }

    function closeSpeedDial() {
        if (!speedDialContainer || !speedDialBackdrop) return;
        isSpeedDialOpen = false;
        speedDialBackdrop.classList.add('opacity-0', 'pointer-events-none');
        speedDialContainer.classList.remove('sd-open');
        speedDialContainer.classList.add('sd-closed');

        const mIcon = mAddBtn ? mAddBtn.querySelector('.material-symbols-outlined') : null;
        if (mIcon) mIcon.style.transform = 'rotate(0deg)';

        setTimeout(() => {
            if (!isSpeedDialOpen) {
                speedDialBackdrop.style.display = 'none';
                speedDialContainer.style.display = 'none';
            }
        }, 350);
    }

    function toggleSpeedDial(e) {
        if (e) e.preventDefault();
        if (isSpeedDialOpen) {
            closeSpeedDial();
        } else {
            openSpeedDial();
        }
    }

    if (speedDialBackdrop) {
        speedDialBackdrop.addEventListener('click', closeSpeedDial);
    }

    // Speed Dial Action Buttons: 1. Abastecimento | 2. Nova Reserva | 3. Manutenção
    const sdFuel = document.getElementById('sd-btn-fuel');
    const sdRes = document.getElementById('sd-btn-reservation');
    const sdMaint = document.getElementById('sd-btn-maint');

    if (sdFuel) {
        sdFuel.addEventListener('click', () => {
            closeSpeedDial();
            if (window.location.pathname.endsWith('veiculo.html')) {
                if (typeof vcSwitchView === 'function') vcSwitchView('vc-fuel-form');
            } else {
                window.location.href = 'veiculo.html?action=fuel';
            }
        });
    }

    if (sdRes) {
        sdRes.addEventListener('click', () => {
            closeSpeedDial();
            openModal();
        });
    }

    if (sdMaint) {
        sdMaint.addEventListener('click', () => {
            closeSpeedDial();
            if (window.location.pathname.endsWith('veiculo.html')) {
                if (typeof vcSwitchView === 'function') vcSwitchView('vc-maint-form');
            } else {
                window.location.href = 'veiculo.html?action=maint';
            }
        });
    }

    if (isBlocked) {
        if (mAddBtn) {
            mAddBtn.className = "flex items-center justify-center w-14 h-14 rounded-full bg-white/5 border border-white/10 text-on-surface-variant/40 cursor-not-allowed opacity-50 shadow-none -translate-y-4 z-20";
            mAddBtn.innerHTML = '<span class="material-symbols-outlined text-2xl font-bold">lock</span>';
            mAddBtn.title = "Acesso restrito/congelado";
            mAddBtn.addEventListener('click', (e) => {
                e.preventDefault();
                alert("Acesso restrito! Sua conta está inativa, congelada ou expirada. Regularize seu acesso para criar reservas.");
            });
        }
        if (dAddBtn) {
            dAddBtn.className = "hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10 text-on-surface-variant/40 cursor-not-allowed opacity-50 shadow-none";
            dAddBtn.innerHTML = '<span class="material-symbols-outlined font-bold">lock</span>';
            dAddBtn.title = "Acesso restrito/congelado";
            dAddBtn.addEventListener('click', (e) => {
                e.preventDefault();
                alert("Acesso restrito! Sua conta está inativa, congelada ou expirada. Regularize seu acesso para criar reservas.");
            });
        }
    } else {
        if (mAddBtn) {
            mAddBtn.addEventListener('click', toggleSpeedDial);
        }
        if (dAddBtn) {
            dAddBtn.addEventListener('click', toggleSpeedDial);
        }
    }

    // Page fade-in on load — only fades main content, nav bar stays visible
    const mainEl = document.querySelector('main') || document.querySelector('#page-content');
    if (mainEl) {
        mainEl.style.opacity = '0';
        mainEl.style.transition = 'opacity 180ms ease';
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                mainEl.style.opacity = '1';
            });
        });
    }

    // Glassmorphic Lens Bubble Positioning & Elastic Jelly Animation Logic
    function updateLensBubble(type, activeEl, animate = false) {
        if (!activeEl) return;
        const isDesktop = type === 'desktop';
        const containerId = isDesktop ? 'desktop-menu-container' : 'mobile-nav-container';
        const indicatorId = isDesktop ? 'desktop-nav-indicator' : 'mobile-nav-indicator';

        const container = document.getElementById(containerId);
        const indicator = document.getElementById(indicatorId);
        if (!container || !indicator) return;

        const rect = activeEl.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        // If layout or fonts haven't finished rendering, retry on next animation frame
        if (rect.width === 0 || rect.height === 0 || containerRect.width === 0) {
            requestAnimationFrame(() => updateLensBubble(type, activeEl, animate));
            return;
        }

        let targetLeft, targetTop, targetWidth, targetHeight;

        if (isDesktop) {
            targetLeft = rect.left - containerRect.left;
            targetTop = rect.top - containerRect.top;
            targetWidth = rect.width;
            targetHeight = rect.height;
        } else {
            const BUBBLE_SIZE = rect.width || 32;
            targetLeft = rect.left - containerRect.left;
            targetTop = (containerRect.height - BUBBLE_SIZE) / 2;
            targetWidth = BUBBLE_SIZE;
            targetHeight = BUBBLE_SIZE;
        }

        const storageKey = isDesktop ? 'MAPAOS_DESKTOP_BUBBLE_LAST' : 'MAPAOS_MOBILE_BUBBLE_LAST';
        const lastPosJSON = sessionStorage.getItem(storageKey);
        let lastLeft = null;
        if (lastPosJSON) {
            try {
                const parsed = JSON.parse(lastPosJSON);
                if (typeof parsed.left === 'number') lastLeft = parsed.left;
            } catch(e) {}
        }

        const currentLeft = indicator.dataset.lastLeft ? parseFloat(indicator.dataset.lastLeft) : lastLeft;

        if (animate && currentLeft !== null && Math.abs(targetLeft - currentLeft) > 3) {
            // Position at current location instantly without transition before sliding
            indicator.style.transition = 'none';
            indicator.style.left = `${currentLeft}px`;
            indicator.style.top = `${targetTop}px`;
            indicator.style.width = `${targetWidth}px`;
            indicator.style.height = `${targetHeight}px`;
            indicator.style.opacity = '1';

            void indicator.offsetWidth; // force reflow

            indicator.style.transformOrigin = targetLeft > currentLeft ? 'left center' : 'right center';
            indicator.style.transform = `scaleX(1.18) scaleY(0.82)`;
            indicator.style.transition = `left 260ms cubic-bezier(0.34, 1.4, 0.64, 1), top 260ms ease, width 260ms ease, height 260ms ease, transform 200ms ease, opacity 150ms ease`;
            indicator.style.left = `${targetLeft}px`;
        } else {
            // Instant snap to active tab on initial page load (NO slide from 0,0 outside screen)
            indicator.style.transition = 'none';
            indicator.style.transform = 'scaleX(1) scaleY(1)';
            indicator.style.left = `${targetLeft}px`;
            indicator.style.top = `${targetTop}px`;
            indicator.style.width = `${targetWidth}px`;
            indicator.style.height = `${targetHeight}px`;
            indicator.style.opacity = '1';
        }

        indicator.dataset.lastLeft = targetLeft;
        sessionStorage.setItem(storageKey, JSON.stringify({ left: targetLeft }));

        clearTimeout(indicator.timeoutId);
        indicator.timeoutId = setTimeout(() => {
            indicator.style.transform = 'scaleX(1) scaleY(1)';
        }, 240);
    }

    // Intercept nav-bar link clicks for instant bubble feedback and smooth fade-out before page change
    document.querySelectorAll('a[href]').forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href === 'login.html') {
                localStorage.removeItem('MAPAOS_LOGGED_USER');
            }
            const isNavItem = link.classList.contains('nav-desktop-item') || link.classList.contains('nav-mobile-item');
            if (isNavItem && href && !href.startsWith('#') && !href.startsWith('javascript:')) {
                e.preventDefault();

                const isDesktop = link.classList.contains('nav-desktop-item');
                const type = isDesktop ? 'desktop' : 'mobile';
                const activeSelector = isDesktop ? '.nav-desktop-item' : '.nav-mobile-item';

                document.querySelectorAll(activeSelector).forEach(el => {
                    el.classList.remove('text-primary', 'scale-110');
                    el.classList.add('text-on-surface-variant');
                    const icon = el.querySelector('.material-symbols-outlined');
                    if (icon) icon.style.fontVariationSettings = "'FILL' 0";
                });

                link.classList.remove('text-on-surface-variant');
                link.classList.add('text-primary');
                if (isDesktop) link.classList.add('scale-110');
                const icon = link.querySelector('.material-symbols-outlined');
                if (icon) icon.style.fontVariationSettings = "'FILL' 1";

                updateLensBubble(type, link, true);

                const fadeEl = document.querySelector('main') || document.querySelector('#page-content');
                if (fadeEl) {
                    fadeEl.style.transition = 'opacity 120ms ease';
                    fadeEl.style.opacity = '0';
                }
                setTimeout(() => {
                    window.location.href = href;
                }, 130);
            }
        });
    });

    const brandBtn = document.getElementById('nav-brand-btn');
    if (brandBtn) {
        brandBtn.addEventListener('click', (e) => {
            e.preventDefault();
            fadeInLoaderAndRedirect('index.html');
        });
    }

    const avatarBtn = document.getElementById('nav-avatar-btn');
    if (avatarBtn) {
        avatarBtn.addEventListener('click', (e) => {
            e.preventDefault();
            fadeInLoaderAndRedirect('config.html');
        });
    }

    // Set Active Classes and Position Lens Bubbles
    const currentUrlPath = window.location.pathname.toLowerCase();
    let activeId = '';

    if (currentUrlPath.includes('historico_reserva')) {
        activeId = 'reservas';
    } else if (currentUrlPath.includes('veiculo')) {
        activeId = 'veiculo';
    } else if (currentUrlPath.includes('carteira')) {
        activeId = 'carteira';
    } else if (currentUrlPath.includes('financeiro')) {
        activeId = 'financeiro';
    } else if (currentUrlPath.includes('config')) {
        activeId = 'ajustes';
    } else {
        activeId = 'dashboard';
    }

    if (activeId) {
        const activeDesktop = document.getElementById(`desktop-${activeId}`);
        if (activeDesktop) {
            activeDesktop.classList.remove('text-on-surface-variant');
            activeDesktop.classList.add('text-primary', 'scale-110');
            const icon = activeDesktop.querySelector('.material-symbols-outlined');
            if (icon) {
                icon.style.fontVariationSettings = "'FILL' 1";
            }
        }
        document.querySelectorAll('.nav-desktop-item').forEach(item => {
            if (item.id !== `desktop-${activeId}` && item.getAttribute('href') !== 'login.html') {
                item.classList.add('text-on-surface-variant');
            }
        });

        const activeMobile = document.getElementById(`mobile-${activeId}`);
        if (activeMobile) {
            activeMobile.classList.remove('text-on-surface-variant');
            activeMobile.classList.add('text-primary');
            const icon = activeMobile.querySelector('.material-symbols-outlined');
            if (icon) {
                icon.style.fontVariationSettings = "'FILL' 1";
            }
        }
        document.querySelectorAll('.nav-mobile-item').forEach(item => {
            if (item.id !== `mobile-${activeId}` && item.getAttribute('href') !== 'login.html') {
                item.classList.add('text-on-surface-variant');
            }
        });

        // Initialize lens bubble position synchronously & after paint
        const positionBubbles = (animateMode = false) => {
            if (activeDesktop) updateLensBubble('desktop', activeDesktop, animateMode);
            if (activeMobile) updateLensBubble('mobile', activeMobile, animateMode);
        };

        positionBubbles(false);
        requestAnimationFrame(() => positionBubbles(false));
        window.addEventListener('resize', () => positionBubbles(false));
    }

    // Input Masking and Formatting
    const dateDisplay = document.getElementById('modal-date-display');
    const datePicker = document.getElementById('modal-date-picker');
    const timeDisplay = document.getElementById('modal-time-display');
    const timePicker = document.getElementById('modal-time-picker');
    const osInput = document.getElementById('modal-os-number');
    const resInput = document.getElementById('modal-reserva-number');

    // Date Masking: DD/MM/AAAA
    if (dateDisplay) {
        dateDisplay.addEventListener('input', (e) => {
            let v = e.target.value.replace(/\D/g, '');
            if (v.length > 8) v = v.slice(0, 8);
            if (v.length > 4) {
                v = `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`;
            } else if (v.length > 2) {
                v = `${v.slice(0, 2)}/${v.slice(2)}`;
            }
            e.target.value = v;

            // Sync with hidden datePicker if complete
            if (v.length === 10) {
                const parts = v.split('/');
                datePicker.value = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
        });
    }
    // Sync native date picker to display
    if (datePicker) {
        datePicker.addEventListener('change', (e) => {
            const v = e.target.value;
            if (v) {
                const parts = v.split('-');
                dateDisplay.value = `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
        });
    }

    // Time Masking: HH:MM
    if (timeDisplay) {
        timeDisplay.addEventListener('input', (e) => {
            let v = e.target.value.replace(/\D/g, '');
            if (v.length > 4) v = v.slice(0, 4);
            if (v.length > 2) {
                v = `${v.slice(0, 2)}:${v.slice(2)}`;
            }
            e.target.value = v;

            if (v.length === 5) {
                timePicker.value = v;
            }
        });
    }
    // Sync native time picker to display
    if (timePicker) {
        timePicker.addEventListener('change', (e) => {
            timeDisplay.value = e.target.value;
        });
    }

    // Number Formatting with Thousands Separator "."
    function applyThousandsMask(inputEl) {
        if (inputEl) {
            inputEl.addEventListener('input', (e) => {
                let v = e.target.value.replace(/\D/g, '');
                if (v) {
                    v = parseInt(v, 10).toLocaleString('pt-BR');
                }
                e.target.value = v;
            });
        }
    }
    applyThousandsMask(osInput);
    applyThousandsMask(resInput);



    // Autocomplete Lookup for Client Input
    const clientSearch = document.getElementById('modal-client-search');
    const autocompleteList = document.getElementById('client-autocomplete-list');

    if (clientSearch && autocompleteList) {
        clientSearch.addEventListener('input', (e) => {
            const val = e.target.value.toUpperCase();
            autocompleteList.innerHTML = '';
            if (!val) {
                autocompleteList.classList.add('hidden');
                return;
            }

            const filtered = clientsList.filter(client => client.includes(val));
            if (filtered.length === 0) {
                autocompleteList.classList.add('hidden');
                return;
            }

            filtered.forEach(client => {
                const item = document.createElement('div');
                item.className = "px-4 py-3 text-on-surface hover:bg-primary/20 hover:text-primary cursor-pointer transition-colors text-sm font-medium border-b border-white/5 last:border-0";

                // Highlight search matches
                const index = client.indexOf(val);
                const highlighted = client.substring(0, index) +
                    `<span class="text-primary font-bold">${client.substring(index, index + val.length)}</span>` +
                    client.substring(index + val.length);
                item.innerHTML = highlighted;

                item.addEventListener('click', () => {
                    clientSearch.value = client;
                    autocompleteList.classList.add('hidden');
                });
                autocompleteList.appendChild(item);
            });

            autocompleteList.classList.remove('hidden');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target !== clientSearch && e.target !== autocompleteList) {
                autocompleteList.classList.add('hidden');
            }
        });
    }

    // Form Submission Logic & dynamic list update
    const form = document.getElementById('reservation-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('btn-modal-submit');
            const originalContent = submitBtn.innerHTML;

            submitBtn.innerHTML = `
                <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span class="ml-2">Processando...</span>
            `;

            const clientName = clientSearch.value.trim();
            const dateVal = dateDisplay.value;
            const timeVal = timeDisplay.value;
            const osVal = osInput.value;
            const resVal = resInput.value;
            const notesInput = document.getElementById('modal-notes');
            const notesVal = notesInput ? notesInput.value : '';

            // Verificar se o cliente informado está cadastrado no sistema
            const formattedClientInput = clientName.toUpperCase();
            const isRegistered = clientsList.some(c => c === formattedClientInput);

            if (!isRegistered) {
                submitBtn.innerHTML = originalContent;
                if (typeof showToast === 'function') {
                    showToast('Cliente não cadastrado no sistema. Cadastre-o antes de lançar a reserva.', true);
                } else {
                    alert('Cliente não cadastrado no sistema. Por favor, cadastre o cliente antes de efetuar o lançamento da reserva.');
                }
                return;
            }

            // Save reservation to database
            dbCreateReservation({
                os_number: osVal,
                reserva_number: resVal,
                client_name: clientName,
                date: dateVal,
                time: timeVal,
                notes: notesVal
            }).then(() => {
                setTimeout(() => {
                    closeModal();
                    if (loader) {
                        loader.style.display = 'flex';
                        loader.offsetHeight;
                        loader.classList.remove('opacity-0', 'pointer-events-none');
                    }

                    setTimeout(() => {
                        if (loader) {
                            loader.classList.add('opacity-0', 'pointer-events-none');
                            setTimeout(() => loader.style.display = 'none', 500);
                        }
                        submitBtn.innerHTML = originalContent;

                        if (window.location.pathname.includes('historico_reserva.html')) {
                            if (typeof loadAndRenderReservations === 'function') {
                                loadAndRenderReservations();
                                setTimeout(() => {
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }, 150);
                            } else {
                                window.location.reload();
                            }
                        } else {
                            fadeInLoaderAndRedirect('historico_reserva.html');
                        }
                    }, 1000);
                }, 800);
            });
        });
    }

    // Initialize Navigation Indicator Positions
    setTimeout(() => {
        if (activeId) {
            const activeDesktop = document.getElementById(`desktop-${activeId}`);
            if (activeDesktop) updateDesktopNavIndicator(activeDesktop);
            const activeMobile = document.getElementById(`mobile-${activeId}`);
            if (activeMobile) updateMobileNavIndicator(activeMobile);
        }
    }, 100);

    window.addEventListener('resize', () => {
        if (activeId) {
            const activeDesktop = document.getElementById(`desktop-${activeId}`);
            if (activeDesktop) updateDesktopNavIndicator(activeDesktop);
            const activeMobile = document.getElementById(`mobile-${activeId}`);
            if (activeMobile) updateMobileNavIndicator(activeMobile);
        }
    });

    // ─── Sliding Bubbles Helpers ──────────────────────────────────────────
    function updateDesktopNavIndicator(activeBtn) {
        updateLensBubble('desktop', activeBtn, true);
    }

    function updateMobileNavIndicator(activeBtn) {
        updateLensBubble('mobile', activeBtn, true);
    }

    // ─── PWA Installation Logic ──────────────────────────────────────────
    let deferredPrompt;
    
    // Check if the device is iOS and not already running in standalone mode
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

    const installBtn = document.getElementById('pwa-install-btn');
    if (isIOS && !isStandalone && installBtn) {
        // Show download button for iOS users so they can see the manual install guide
        installBtn.classList.remove('hidden');
        installBtn.style.display = 'flex';
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (installBtn && !isIOS) {
            installBtn.classList.remove('hidden');
            installBtn.style.display = 'flex';
        }
    });

    window.addEventListener('appinstalled', (evt) => {
        console.log('PWA foi instalado com sucesso');
        if (installBtn) {
            installBtn.classList.add('hidden');
            installBtn.style.display = 'none';
        }
    });

    document.addEventListener('click', async (e) => {
        const iosModal = document.getElementById('ios-install-modal');

        if (e.target.closest('#pwa-install-btn')) {
            if (isIOS) {
                // Show iOS guide modal
                if (iosModal) {
                    iosModal.style.display = 'flex';
                    iosModal.offsetHeight; // force repaint
                    iosModal.classList.remove('opacity-0', 'pointer-events-none');
                    const innerCard = iosModal.querySelector('.glass-card');
                    if (innerCard) {
                        innerCard.classList.remove('scale-95');
                        innerCard.classList.add('scale-100');
                    }
                }
            } else {
                // Standard PWA prompt on Android/PC
                if (!deferredPrompt) return;
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`User response to the install prompt: ${outcome}`);
                deferredPrompt = null;
                if (installBtn) {
                    installBtn.classList.add('hidden');
                    installBtn.style.display = 'none';
                }
            }
        }

        // Close iOS guide modal triggers
        if (e.target.closest('#close-ios-install-modal') || e.target.closest('#btn-close-ios-guide') || e.target === iosModal) {
            if (iosModal) {
                iosModal.classList.add('opacity-0', 'pointer-events-none');
                const innerCard = iosModal.querySelector('.glass-card');
                if (innerCard) {
                    innerCard.classList.remove('scale-100');
                    innerCard.classList.add('scale-95');
                }
                setTimeout(() => {
                    iosModal.style.display = 'none';
                }, 300);
            }
        }
    });

    // Configure Web Push Notifications
    function configurePushNotifications(reg) {
        if (!('PushManager' in window)) {
            console.log('Push notifications não são suportadas por este navegador.');
            return;
        }

        const loggedUserRaw = localStorage.getItem('MAPAOS_LOGGED_USER');
        if (!loggedUserRaw) return; // Only subscribe logged-in users

        const vapidPublicKey = (window.MAPAOS_ENV && window.MAPAOS_ENV.VAPID_PUBLIC_KEY) || '';
        if (!vapidPublicKey) {
            console.warn('VAPID_PUBLIC_KEY ausente em config.env.js. Notificações Push desativadas.');
            return;
        }

        if (Notification.permission === 'default') {
            // Request permission directly
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    subscribeUserToPush(reg, vapidPublicKey);
                }
            });
        } else if (Notification.permission === 'granted') {
            subscribeUserToPush(reg, vapidPublicKey);
        }
    }

    async function subscribeUserToPush(reg, vapidPublicKey) {
        try {
            let sub = await reg.pushManager.getSubscription();
            if (!sub) {
                const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
                sub = await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: convertedVapidKey
                });
            }

            if (sub && typeof dbSaveSubscription === 'function') {
                const success = await dbSaveSubscription(sub.toJSON());
                if (success) {
                    console.log('Token de notificação Push salvo no Supabase com sucesso.');
                }
            }
        } catch (err) {
            console.error('Falha ao registrar inscrição de Push no dispositivo:', err);
        }
    }

    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    // Register Service Worker (robust registration checking if window has already loaded)
    if ('serviceWorker' in navigator) {
        const registerSW = () => {
            navigator.serviceWorker.register('sw.js')
                .then(reg => {
                    console.log('Service Worker registrado com sucesso:', reg);
                    configurePushNotifications(reg);
                })
                .catch(err => console.error('Falha ao registrar Service Worker:', err));
        };

        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            registerSW();
        } else {
            window.addEventListener('load', registerSW);
        }
    }
});

// Global functions for Vehicle Coming Soon modal
function openVehicleComingSoonModal() {
    const modal = document.getElementById('vehicle-coming-soon-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.remove('opacity-0', 'pointer-events-none');
        modal.classList.add('opacity-100');
        const innerCard = modal.querySelector('.glass-card');
        if (innerCard) {
            innerCard.classList.remove('scale-95');
            innerCard.classList.add('scale-100');
        }
    }, 10);
}

function closeVehicleComingSoonModal() {
    const modal = document.getElementById('vehicle-coming-soon-modal');
    if (!modal) return;
    modal.classList.remove('opacity-100');
    modal.classList.add('opacity-0', 'pointer-events-none');
    const innerCard = modal.querySelector('.glass-card');
    if (innerCard) {
        innerCard.classList.remove('scale-100');
        innerCard.classList.add('scale-95');
    }
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// Global functions for Wallet Coming Soon modal
function openWalletComingSoonModal() {
    const modal = document.getElementById('wallet-coming-soon-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.remove('opacity-0', 'pointer-events-none');
        modal.classList.add('opacity-100');
        const innerCard = modal.querySelector('.glass-card');
        if (innerCard) {
            innerCard.classList.remove('scale-95');
            innerCard.classList.add('scale-100');
        }
    }, 10);
}

function closeWalletComingSoonModal() {
    const modal = document.getElementById('wallet-coming-soon-modal');
    if (!modal) return;
    modal.classList.remove('opacity-100');
    modal.classList.add('opacity-0', 'pointer-events-none');
    const innerCard = modal.querySelector('.glass-card');
    if (innerCard) {
        innerCard.classList.remove('scale-100');
        innerCard.classList.add('scale-95');
    }
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// Global Pull-to-Refresh implementation for Mobile PWA & Touch Devices
function initPullToRefresh() {
    if (window.__pullToRefreshInitialized) return;
    window.__pullToRefreshInitialized = true;

    // Create indicator element
    const indicatorHTML = `
        <div id="ptr-indicator" class="fixed top-4 left-1/2 -translate-x-1/2 z-[99999] pointer-events-none flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 shadow-2xl transition-all duration-200" style="transform: translateY(-90px) translateX(-50%); opacity: 0; background: rgba(11, 19, 38, 0.9); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);">
            <span id="ptr-icon" class="material-symbols-outlined text-primary text-xl transition-transform duration-200">arrow_downward</span>
            <span id="ptr-text" class="text-xs font-semibold text-on-surface">Puxe para atualizar</span>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', indicatorHTML);

    const indicator = document.getElementById('ptr-indicator');
    const ptrIcon = document.getElementById('ptr-icon');
    const ptrText = document.getElementById('ptr-text');

    if (!indicator || !ptrIcon || !ptrText) return;

    let startY = 0;
    let currentY = 0;
    let isPulling = false;
    let isRefreshing = false;
    const PULL_THRESHOLD = 70;
    let triggeredHaptic = false;

    function handleStart(pageY) {
        if (window.scrollY <= 0 && !isRefreshing) {
            startY = pageY;
            isPulling = true;
            triggeredHaptic = false;
        }
    }

    function handleMove(e) {
        if (!isPulling || isRefreshing) return;
        const pageY = e.touches ? e.touches[0].pageY : e.pageY;
        currentY = pageY;
        const diff = currentY - startY;

        if (diff > 0 && window.scrollY <= 0) {
            // Cancel iOS WebKit native rubber-band canvas pull down (prevents white gap at top!)
            if (e.cancelable) e.preventDefault();
            
            const pullDistance = Math.min(diff * 0.45, 95);
            indicator.style.transform = `translateY(${pullDistance - 60}px) translateX(-50%)`;
            indicator.style.opacity = Math.min(pullDistance / PULL_THRESHOLD, 1);

            if (pullDistance >= PULL_THRESHOLD) {
                ptrIcon.style.transform = 'rotate(180deg)';
                ptrText.textContent = 'Solte para atualizar';
                if (!triggeredHaptic) {
                    if (navigator.vibrate) navigator.vibrate(15);
                    triggeredHaptic = true;
                }
            } else {
                ptrIcon.style.transform = 'rotate(0deg)';
                ptrText.textContent = 'Puxe para atualizar';
            }
        }
    }

    async function handleEnd() {
        if (!isPulling || isRefreshing) return;
        isPulling = false;

        const diff = currentY - startY;
        const pullDistance = Math.min(diff * 0.45, 95);

        if (pullDistance >= PULL_THRESHOLD && window.scrollY <= 0) {
            isRefreshing = true;
            indicator.style.transform = 'translateY(16px) translateX(-50%)';
            indicator.style.opacity = '1';
            ptrIcon.style.transform = 'rotate(0deg)';
            ptrIcon.textContent = 'sync';
            ptrIcon.classList.add('animate-ptr-spin');
            ptrText.textContent = 'Atualizando...';

            try {
                if (typeof window.loadAndRenderReservations === 'function') {
                    await window.loadAndRenderReservations(true);
                } else if (typeof window.loadDashboardData === 'function') {
                    await window.loadDashboardData(true);
                } else if (typeof window.loadMasterData === 'function') {
                    await window.loadMasterData(true);
                } else if (typeof window.loadFinanceData === 'function') {
                    await window.loadFinanceData(true);
                }
                
                setTimeout(() => {
                    window.location.reload();
                }, 350);
            } catch (err) {
                console.error('Erro ao atualizar via Pull-to-Refresh:', err);
                window.location.reload();
            }
        } else {
            indicator.style.transform = 'translateY(-90px) translateX(-50%)';
            indicator.style.opacity = '0';
            ptrIcon.style.transform = 'rotate(0deg)';
        }

        startY = 0;
        currentY = 0;
    }

    // Touch event listeners (passive: false allows e.preventDefault() to block native iOS white overscroll)
    window.addEventListener('touchstart', (e) => handleStart(e.touches[0].pageY), { passive: true });
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
}

// ============================================================
// GLOBAL VEHICLE ALERT CHECKER (Red Notification Dot)
// ============================================================
async function checkVehiclePendingAlerts() {
    try {
        const uid = typeof getLoggedUserId === 'function' ? getLoggedUserId() : null;
        if (!uid || typeof supabaseClientInstance === 'undefined' || !supabaseClientInstance) return;

        // Fetch vehicles & maintenance logs for current user
        const [resVeh, resMaint] = await Promise.all([
            supabaseClientInstance.from('vehicles').select('id, km_actual').eq('user_id', uid),
            supabaseClientInstance.from('maintenance_logs').select('*').eq('user_id', uid)
        ]);

        const vehicles = resVeh.data || [];
        const maints = resMaint.data || [];
        if (vehicles.length === 0 || maints.length === 0) return;

        // Get local dismissed warranties
        let dismissedSet = new Set();
        try {
            dismissedSet = new Set(JSON.parse(localStorage.getItem('MAPAOS_DISMISSED_WARRANTIES') || '[]'));
        } catch(e) {}

        const now = new Date();
        let hasAlert = false;

        for (const veh of vehicles) {
            const vehMaints = maints.filter(m => String(m.vehicle_id || m.vehicleId) === String(veh.id));
            for (const m of vehMaints) {
                const nextKm = m.next_km ?? m.next;
                const nextDate = m.next_date || m.nextDate;

                // 1. KM-based maintenance: overdue OR <= 2000 km remaining
                if (nextKm !== undefined && nextKm !== null) {
                    const rem = Number(nextKm) - Number(veh.km_actual || 0);
                    if (rem <= 2000) {
                        hasAlert = true;
                        break;
                    }
                }

                // 2. Date-based maintenance: overdue ONLY
                if (!nextKm && nextDate) {
                    const diffDays = Math.ceil((new Date(nextDate) - now) / 86400000);
                    if (diffDays <= 0) {
                        hasAlert = true;
                        break;
                    }
                }

                // 3. Warranty: expired OR <= 20 days remaining, AND NOT dismissed
                const hasWarranty = m.has_warranty ?? m.hasWarranty ?? false;
                const warrantyMonths = Number(m.warranty_months || m.warrantyMonths || 0);
                const isDismissed = m.warranty_dismissed ?? m.warrantyDismissed ?? dismissedSet.has(String(m.id));
                const logDate = m.date || m.created_at;

                if (hasWarranty && !isDismissed && warrantyMonths > 0 && logDate) {
                    const expDate = new Date(logDate);
                    expDate.setMonth(expDate.getMonth() + warrantyMonths);
                    const diffDays = Math.ceil((expDate - now) / 86400000);
                    if (diffDays <= 20) {
                        hasAlert = true;
                        break;
                    }
                }
            }
            if (hasAlert) break;
        }

        // Toggle red alert dots on desktop & mobile navigation
        const desktopDot = document.getElementById('desktop-vehicle-alert-dot');
        const mobileDot = document.getElementById('mobile-vehicle-alert-dot');

        if (hasAlert) {
            if (desktopDot) desktopDot.classList.remove('hidden');
            if (mobileDot) mobileDot.classList.remove('hidden');
        } else {
            if (desktopDot) desktopDot.classList.add('hidden');
            if (mobileDot) mobileDot.classList.add('hidden');
        }
    } catch (e) {
        console.warn('[checkVehiclePendingAlerts]', e);
    }
}

// Trigger alert check when DOM & Supabase are ready
document.addEventListener('DOMContentLoaded', () => {
    const checkTimer = setInterval(() => {
        if (typeof supabaseClientInstance !== 'undefined' && supabaseClientInstance) {
            clearInterval(checkTimer);
            checkVehiclePendingAlerts();
        }
    }, 200);
    setTimeout(() => clearInterval(checkTimer), 5000);
});

// ============================================================
// PRO UPGRADE MODAL HELPERS
// ============================================================
function openProUpgradeModal(featureName = '') {
    const modal = document.getElementById('pro-upgrade-modal');
    const featureText = document.getElementById('pro-modal-feature-name');
    if (featureText) {
        featureText.textContent = featureName ? `Recurso: ${featureName}` : '';
    }
    if (modal) {
        modal.classList.add('open');
    }
}

function closeProUpgradeModal() {
    const modal = document.getElementById('pro-upgrade-modal');
    if (modal) {
        modal.classList.remove('open');
    }
}

function requestProUpgradeWhatsApp() {
    let userName = 'Usuário';
    let userEmail = '';
    try {
        const raw = localStorage.getItem('MAPAOS_LOGGED_USER');
        if (raw) {
            const user = JSON.parse(raw);
            if (user) {
                userName = user.name || userName;
                userEmail = user.email ? ` (${user.email})` : '';
            }
        }
    } catch(e) {}

    const featureText = document.getElementById('pro-modal-feature-name')?.textContent || '';
    const msg = `Olá! Sou *${userName}*${userEmail} e gostaria de solicitar o upgrade para o *Plano PRO* do Mapa.OS para liberar o ${featureText || 'acesso completo'}.`;
    const encodedMsg = encodeURIComponent(msg);
    const waUrl = `https://wa.me/5524992716045?text=${encodedMsg}`;
    
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    closeProUpgradeModal();
}
