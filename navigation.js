// Route Guard: Redirect unauthenticated users immediately to login.html
(function() {
    const currentPath = window.location.pathname;
    const pageName = currentPath.substring(currentPath.lastIndexOf('/') + 1) || 'index.html';
    const loggedUser = localStorage.getItem('MAPAOS_LOGGED_USER');
    if (!loggedUser && pageName !== 'login.html') {
        window.location.href = 'login.html';
    }
})();

document.addEventListener('DOMContentLoaded', () => {
    const currentPath = window.location.pathname;
    const pageName = currentPath.substring(currentPath.lastIndexOf('/') + 1) || 'index.html';

    // List of clients in alphabetical order
    const clientsList = [
        "ARCELOMITTAL",
        "BENTELER",
        "FORVIA",
        "JAGUAR",
        "JSL",
        "MAG",
        "MULTITERMINAIS",
        "NISSAN",
        "NISSAN NEWS",
        "PERNORD",
        "SESE",
        "STELLANTS",
        "TECNOPOLO"
    ];

    // Inject premium loading overlay
    const loaderHTML = `
        <div id="global-loader" class="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#060e20] transition-opacity duration-500 ease-out">
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
                                <input id="modal-os-number" class="glass-input w-full h-12 pl-12 pr-4 rounded-xl text-on-surface placeholder:text-on-surface-variant/40" placeholder="Ex: 1.000" type="text" required />
                            </div>
                        </div>
                        <div class="flex flex-col gap-unit">
                            <label class="text-label-sm font-label-sm text-on-surface-variant px-1">Nº Reserva</label>
                            <div class="relative group">
                                <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">bookmark</span>
                                <input id="modal-reserva-number" class="glass-input w-full h-12 pl-12 pr-4 rounded-xl text-on-surface placeholder:text-on-surface-variant/40" placeholder="Ex: 1.250" type="text" required />
                            </div>
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

    document.body.insertAdjacentHTML('beforeend', loaderHTML);
    document.body.insertAdjacentHTML('beforeend', modalHTML);

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
        if (loader) {
            loader.style.display = 'flex';
            loader.offsetHeight;
            loader.classList.remove('opacity-0', 'pointer-events-none');
            setTimeout(() => {
                window.location.href = targetUrl;
            }, 400);
        } else {
            window.location.href = targetUrl;
        }
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

    // TopAppBar Template
    const topAppBarHTML = `
        <header class="fixed top-4 left-4 right-4 rounded-lg bg-white/10 dark:bg-white/5 backdrop-blur-2xl border border-white/10 shadow-xl shadow-black/20 z-50 flex justify-between items-center px-gutter h-16 w-[calc(100%-32px)] md:w-[calc(100%-80px)] mx-auto md:top-10 md:left-10 md:right-10 transition-transform">
            <div class="flex items-center gap-4">
                <button class="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-white/20 active:scale-95 transition-all duration-300">
                    <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">menu</span>
                </button>
                <div class="flex items-center gap-3 cursor-pointer" id="nav-brand-btn">
                    <img src="img/mapaos-logo-sf.png" alt="Logo Mapa.OS" class="w-8 h-8 object-contain">
                    <div class="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold tracking-tight text-primary dark:text-primary-fixed-dim">
                        Mapa.OS
                    </div>
                </div>
            </div>
            <!-- Desktop Menu -->
            <div class="hidden md:flex gap-6 items-center">
                <a class="nav-desktop-item font-label-sm text-label-sm flex flex-col items-center transition-colors duration-300" href="index.html" id="desktop-dashboard">
                    <span class="material-symbols-outlined mb-1">dashboard</span>
                    Painel
                </a>
                <a class="nav-desktop-item font-label-sm text-label-sm flex flex-col items-center transition-colors duration-300" href="historico_reserva.html" id="desktop-reservas">
                    <span class="material-symbols-outlined mb-1">calendar_today</span>
                    Reservas
                </a>
                <a class="nav-desktop-item font-label-sm text-label-sm flex flex-col items-center transition-colors duration-300" href="config.html" id="desktop-ajustes">
                    <span class="material-symbols-outlined mb-1">settings</span>
                    Ajustes
                </a>
                <a class="nav-desktop-item font-label-sm text-label-sm flex flex-col items-center transition-colors duration-300 text-error hover:text-red-400" href="login.html">
                    <span class="material-symbols-outlined mb-1">logout</span>
                    Sair
                </a>
            </div>
            <!-- User Profile Avatar & Add button -->
            <div class="flex items-center gap-3">
                <button id="desktop-add-btn" class="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary shadow-lg shadow-primary/20 active:scale-95 transition-transform">
                    <span class="material-symbols-outlined font-bold">add</span>
                </button>
                <button id="nav-avatar-btn" class="w-10 h-10 rounded-full bg-surface-variant overflow-hidden border border-white/20 active:scale-95 transition-all duration-300 flex items-center justify-center">
                    <img alt="User avatar" class="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD-9OxAyqwJ75TjxlwFMxVaYkT-zVsm8lHTyuCzkqw5WO3sqZeQDGdvJKGaCXIAi-BVqiO7OudxzLmCXgDxJiiJ1-UFG7FCC7LAfEOu6kXJ04DXuzRPXG_JTqmMR22Pz6JwI5ZEFtxUJYhiDamCLYJQilTcso1WUG-pGgfJqJP0cOXJRD6gtOgE7e9GBJY8_bZS-WRDfYeuFYbHaND4SudpgdRSJUNpNr094blQf0leoS07D0pYW4G6">
                </button>
            </div>
        </header>
    `;

    // BottomNavBar Template (Mobile Only)
    const bottomNavBarHTML = `
        <nav class="md:hidden fixed bottom-8 left-1/2 -translate-x-1/2 w-[min(90%,400px)] h-20 px-6 flex justify-between items-center z-50 bg-white/10 dark:bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/40 rounded-full">
            <!-- Dashboard -->
            <a href="index.html" id="mobile-dashboard" class="nav-mobile-item flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300">
                <span class="material-symbols-outlined">dashboard</span>
            </a>
            <!-- Reservas -->
            <a href="historico_reserva.html" id="mobile-reservas" class="nav-mobile-item flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300">
                <span class="material-symbols-outlined">calendar_today</span>
            </a>
            <!-- Botão Adicionar "+" -->
            <button id="mobile-add-btn" class="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary shadow-lg shadow-primary/30 active:scale-95 transition-transform -translate-y-4">
                <span class="material-symbols-outlined text-2xl font-bold">add</span>
            </button>
            <!-- Ajustes -->
            <a href="config.html" id="mobile-ajustes" class="nav-mobile-item flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300">
                <span class="material-symbols-outlined">settings</span>
            </a>
            <!-- Sair -->
            <a href="login.html" class="nav-mobile-item flex items-center justify-center w-12 h-12 rounded-full hover:bg-white/10 transition-colors active:scale-90 text-error">
                <span class="material-symbols-outlined">logout</span>
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
                e.preventDefault();
                fadeInLoaderAndRedirect(href);
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
    } else if (pageName === 'config.html') {
        activeId = 'ajustes';
    }

    if (activeId) {
        // Desktop Active
        const activeDesktop = document.getElementById(`desktop-${activeId}`);
        if (activeDesktop) {
            activeDesktop.classList.add('text-primary', 'dark:text-primary-fixed-dim');
            const icon = activeDesktop.querySelector('.material-symbols-outlined');
            if (icon) {
                icon.style.fontVariationSettings = "'FILL' 1";
            }
        }
        // Desktop Inactive styles for others
        document.querySelectorAll('.nav-desktop-item').forEach(item => {
            if (item.id !== `desktop-${activeId}` && item.getAttribute('href') !== 'login.html') {
                item.classList.add('text-on-surface-variant', 'dark:text-on-surface-variant', 'hover:text-primary');
            }
        });

        // Mobile Active
        const activeMobile = document.getElementById(`mobile-${activeId}`);
        if (activeMobile) {
            activeMobile.classList.add('bg-primary', 'dark:bg-primary-container', 'text-on-primary', 'dark:text-on-primary-container', 'shadow-lg', 'shadow-primary/30', 'active:scale-90');
            const icon = activeMobile.querySelector('.material-symbols-outlined');
            if (icon) {
                icon.style.fontVariationSettings = "'FILL' 1";
            }
        }
        // Mobile Inactive styles for others
        document.querySelectorAll('.nav-mobile-item').forEach(item => {
            if (item.id !== `mobile-${activeId}` && item.getAttribute('href') !== 'login.html') {
                item.classList.add('text-on-surface-variant/70', 'dark:text-on-surface-variant/70', 'hover:bg-white/10', 'active:scale-90');
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

            // Save reservation to database
            dbCreateReservation({
                os_number: osVal,
                reserva_number: resVal,
                client_name: clientName,
                date: dateVal,
                time: timeVal
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

                        // If the render function exists in the current scope (historico_reserva.html), refresh list
                        if (typeof loadAndRenderReservations === 'function') {
                            loadAndRenderReservations();
                        } else {
                            alert('Reserva cadastrada com sucesso!');
                        }
                    }, 1000);
                }, 800);
            });
        });
    }
});
