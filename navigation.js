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
        </style>
    `;
    document.head.insertAdjacentHTML('beforeend', styleHTML);

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
        <div id="reservation-modal" class="fixed inset-0 z-[9998] flex items-center justify-center bg-[#060e20]/80 backdrop-blur-md opacity-0 pointer-events-none transition-all duration-300">
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
                        <div id="client-autocomplete-list" class="absolute top-[76px] left-0 right-0 max-h-48 overflow-y-auto bg-[#0b1326]/95 border border-white/10 rounded-xl z-50 hidden shadow-2xl backdrop-blur-xl">
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

    document.body.insertAdjacentHTML('beforeend', loaderHTML);
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.insertAdjacentHTML('beforeend', iosInstallModalHTML);

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
    
    if (loggedUserRaw) {
        try {
            const userObj = JSON.parse(loggedUserRaw);
            loggedUserName = userObj.name || userObj.email.split('@')[0];
            
            // Calculate days remaining (only for regular users, excluding Master role)
            if (userObj.role !== 'Master' && userObj.expires_at) {
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
        } catch (e) {
            console.error('Error parsing logged user details:', e);
        }
    }

    // TopAppBar Template
    const topAppBarHTML = `
        <header class="fixed top-4 left-4 right-4 rounded-lg bg-white/10 dark:bg-white/5 backdrop-blur-2xl border border-white/10 shadow-xl shadow-black/20 z-50 flex justify-between items-center px-gutter h-16 w-[calc(100%-32px)] md:w-[calc(100%-80px)] mx-auto md:top-10 md:left-10 md:right-10 transition-transform">
            <div class="flex items-center gap-3">
                <div class="flex items-center gap-3 cursor-pointer" id="nav-brand-btn">
                    <img src="img/mapaos-logo-sf.svg" alt="Logo Mapa.OS" class="w-8 h-8 object-contain">
                    <div class="flex flex-col justify-center">
                        <div class="whitespace-nowrap text-sm sm:text-base md:text-lg font-bold tracking-tight text-primary dark:text-primary-fixed-dim leading-none truncate max-w-[100px] min-[375px]:max-w-[140px] min-[425px]:max-w-[180px] sm:max-w-none">
                            ${loggedUserName}
                        </div>
                        ${expiryBadgeHTML}
                    </div>
                </div>
            </div>
            <!-- Desktop Menu -->
            <div class="hidden md:flex gap-6 items-center relative" id="desktop-menu-container">
                <div id="desktop-nav-indicator" class="absolute lens-bubble rounded-xl transition-all duration-300 ease-out z-0" style="height: 0px; top: 0px; left: 0px; width: 0px; will-change: transform, left, width;"></div>
                <a class="nav-desktop-item font-label-sm text-label-sm flex flex-col items-center transition-colors duration-300" href="index.html" id="desktop-dashboard">
                    <span class="material-symbols-outlined mb-1">dashboard</span>
                    Painel
                </a>
                <a class="nav-desktop-item font-label-sm text-label-sm flex flex-col items-center transition-colors duration-300" href="historico_reserva.html" id="desktop-reservas">
                    <span class="material-symbols-outlined mb-1">list_alt</span>
                    Reservas
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
        <nav class="md:hidden fixed bottom-8 left-1/2 -translate-x-1/2 w-[min(90%,400px)] h-20 px-6 flex justify-between items-center z-50 bg-white/10 dark:bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/40 rounded-full" id="mobile-nav-container">
            <div id="mobile-nav-indicator" class="absolute lens-bubble rounded-full transition-all duration-300 ease-out z-0" style="height: 0px; top: 0px; left: 0px; width: 0px; will-change: transform, left, width;"></div>
            <!-- Dashboard -->
            <a href="index.html" id="mobile-dashboard" class="nav-mobile-item flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300">
                <span class="material-symbols-outlined">dashboard</span>
            </a>
            <!-- Reservas -->
            <a href="historico_reserva.html" id="mobile-reservas" class="nav-mobile-item flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300">
                <span class="material-symbols-outlined">list_alt</span>
            </a>
            <!-- Botão Adicionar "+" -->
            <button id="mobile-add-btn" class="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary shadow-lg shadow-primary/30 active:scale-95 transition-transform -translate-y-4 z-20">
                <span class="material-symbols-outlined text-2xl font-bold">add</span>
            </button>
            <!-- Financeiro -->
            <a href="financeiro.html" id="mobile-financeiro" class="nav-mobile-item flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300">
                <span class="material-symbols-outlined">payments</span>
            </a>
            <!-- Ajustes -->
            <a href="config.html" id="mobile-ajustes" class="nav-mobile-item flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300">
                <span class="material-symbols-outlined">settings</span>
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

    const mAddBtn = document.getElementById('mobile-add-btn');
    if (mAddBtn) {
        mAddBtn.addEventListener('click', openModal);
    }

    const dAddBtn = document.getElementById('desktop-add-btn');
    if (dAddBtn) {
        dAddBtn.addEventListener('click', openModal);
    }

    // Intercept clicks on links for smooth fade transition
    document.querySelectorAll('a[href]').forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href === 'login.html') {
                localStorage.removeItem('MAPAOS_LOGGED_USER');
            }
            if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
                const isNavDesktop = link.classList.contains('nav-desktop-item');
                const isNavMobile = link.classList.contains('nav-mobile-item');

                if (isNavDesktop || isNavMobile) {
                    e.preventDefault();
                    
                    document.querySelectorAll('.nav-desktop-item, .nav-mobile-item').forEach(el => {
                        el.classList.remove('scale-110', 'text-primary');
                        el.classList.add('text-on-surface-variant');
                    });
                    
                    link.classList.remove('text-on-surface-variant');
                    link.classList.add('scale-110', 'text-primary');
                    
                    if (isNavDesktop) {
                        updateDesktopNavIndicator(link);
                    } else {
                        updateMobileNavIndicator(link);
                    }
                    
                    setTimeout(() => {
                        window.location.href = href;
                    }, 280);
                } else {
                    e.preventDefault();
                    window.location.href = href;
                }
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

    // Set Active Classes
    let activeId = '';
    if (pageName === 'index.html') {
        activeId = 'dashboard';
    } else if (pageName === 'historico_reserva.html') {
        activeId = 'reservas';
    } else if (pageName === 'financeiro.html') {
        activeId = 'financeiro';
    } else if (pageName === 'config.html') {
        activeId = 'ajustes';
    }

    if (activeId) {
        // Desktop Active
        const activeDesktop = document.getElementById(`desktop-${activeId}`);
        if (activeDesktop) {
            activeDesktop.classList.remove('text-on-surface-variant');
            activeDesktop.classList.add('text-primary', 'scale-110');
            const icon = activeDesktop.querySelector('.material-symbols-outlined');
            if (icon) {
                icon.style.fontVariationSettings = "'FILL' 1";
            }
        }
        // Desktop Inactive styles for others
        document.querySelectorAll('.nav-desktop-item').forEach(item => {
            if (item.id !== `desktop-${activeId}` && item.getAttribute('href') !== 'login.html') {
                item.classList.add('text-on-surface-variant');
            }
        });

        // Mobile Active
        const activeMobile = document.getElementById(`mobile-${activeId}`);
        if (activeMobile) {
            activeMobile.classList.remove('text-on-surface-variant');
            activeMobile.classList.add('text-primary', 'scale-110');
            const icon = activeMobile.querySelector('.material-symbols-outlined');
            if (icon) {
                icon.style.fontVariationSettings = "'FILL' 1";
            }
        }
        // Mobile Inactive styles for others
        document.querySelectorAll('.nav-mobile-item').forEach(item => {
            if (item.id !== `mobile-${activeId}` && item.getAttribute('href') !== 'login.html') {
                item.classList.add('text-on-surface-variant');
            }
        });
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

            const clientName = clientSearch.value;
            const dateVal = dateDisplay.value;
            const timeVal = timeDisplay.value;
            const osVal = osInput.value;
            const resVal = resInput.value;
            const notesInput = document.getElementById('modal-notes');
            const notesVal = notesInput ? notesInput.value : '';

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
        const indicator = document.getElementById('desktop-nav-indicator');
        if (!indicator) return;
        const rect = activeBtn.getBoundingClientRect();
        const containerRect = activeBtn.parentElement.getBoundingClientRect();
        
        const currentLeft = parseFloat(indicator.dataset.lastLeft) || 0;
        const targetLeft = rect.left - containerRect.left;
        const dist = Math.abs(targetLeft - currentLeft);
        
        if (dist > 5) {
            indicator.style.transform = `scaleX(1.15) scaleY(0.85)`;
            indicator.style.transformOrigin = targetLeft > currentLeft ? 'left center' : 'right center';
        }

        indicator.style.left = `${targetLeft}px`;
        indicator.style.width = `${rect.width}px`;
        indicator.style.height = `${rect.height}px`;
        indicator.style.top = `${rect.top - containerRect.top}px`;
        indicator.dataset.lastLeft = targetLeft;
        
        clearTimeout(indicator.timeoutId);
        indicator.timeoutId = setTimeout(() => {
            indicator.style.transform = 'scaleX(1) scaleY(1)';
        }, 250);
    }

    function updateMobileNavIndicator(activeBtn) {
        const indicator = document.getElementById('mobile-nav-indicator');
        if (!indicator) return;
        const rect = activeBtn.getBoundingClientRect();
        const containerRect = activeBtn.parentElement.getBoundingClientRect();
        
        const currentLeft = parseFloat(indicator.dataset.lastLeft) || 0;
        const targetLeft = rect.left - containerRect.left;
        const dist = Math.abs(targetLeft - currentLeft);
        
        if (dist > 5) {
            indicator.style.transform = `scaleX(1.15) scaleY(0.85)`;
            indicator.style.transformOrigin = targetLeft > currentLeft ? 'left center' : 'right center';
        }

        indicator.style.left = `${targetLeft}px`;
        indicator.style.width = `${rect.width}px`;
        indicator.style.height = `${rect.height}px`;
        indicator.style.top = `${rect.top - containerRect.top}px`;
        indicator.dataset.lastLeft = targetLeft;
        
        clearTimeout(indicator.timeoutId);
        indicator.timeoutId = setTimeout(() => {
            indicator.style.transform = 'scaleX(1) scaleY(1)';
        }, 250);
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
