/**
 * MAPA.OS — Controle de Veículo
 * Lógica adaptada do Motrix (Firebase → Supabase)
 * Layout: design system do Mapa.OS (Tailwind, Material Symbols)
 */

// ============================================================
// STATE
// ============================================================
const vState = {
    vehicles: [],
    activeVehicleId: null,
    fuelLogs: [],
    maintenanceLogs: [],
    currentView: 'vc-dashboard',
    historyTab: 'fuel',
    historyFilter: 'all', // 'all', '7', '30'
    historyViewMode: localStorage.getItem('MAPAOS_VEICULO_VIEW_MODE') || 'cards', // 'cards' or 'list'
    editingFuelId: null,
    editingMaintId: null
};

// ============================================================
// DB HELPERS (Supabase via supabaseClientInstance)
// ============================================================
function getSupabaseInstance() {
    if (typeof supabaseClientInstance !== 'undefined' && supabaseClientInstance) {
        return supabaseClientInstance;
    }
    if (window.supabaseClientInstance) {
        return window.supabaseClientInstance;
    }
    return null;
}

const vcDb = {
    async _run(fn) {
        try {
            const client = getSupabaseInstance();
            if (!client) {
                return { data: null, error: new Error('Cliente Supabase não configurado. Por favor, acesse a aba Ajustes e salve as chaves do Supabase.') };
            }
            return await fn(client);
        } catch (e) {
            console.error('[vcDb]', e);
            return { data: null, error: e };
        }
    },
    vehicles: {
        getAll: () => vcDb._run(sb => sb.from('vehicles').select('*').eq('user_id', getLoggedUserId()).order('created_at', { ascending: true })),
        add: (v) => {
            if (vState.vehicles && vState.vehicles.length >= 2) {
                return Promise.resolve({ data: null, error: new Error('Limite de 2 veículos atingido. Entre em contato com o suporte para liberar outro plano ou inclusão adicional de veículo.') });
            }
            return vcDb._run(sb => sb.from('vehicles').insert([{ ...v, user_id: getLoggedUserId() }]).select());
        },
        update: (id, v) => vcDb._run(sb => sb.from('vehicles').update(v).eq('id', id).eq('user_id', getLoggedUserId()).select()),
        delete: (id) => vcDb._run(sb => sb.from('vehicles').delete().eq('id', id).eq('user_id', getLoggedUserId()))
    },
    fuel: {
        getAll: () => vcDb._run(sb => sb.from('fuel_logs').select('*').eq('user_id', getLoggedUserId()).order('date', { ascending: false })),
        add: (f) => vcDb._run(sb => sb.from('fuel_logs').insert([{ ...f, user_id: getLoggedUserId() }]).select()),
        update: (id, f) => vcDb._run(sb => sb.from('fuel_logs').update(f).eq('id', id).eq('user_id', getLoggedUserId()).select()),
        delete: (id) => vcDb._run(sb => sb.from('fuel_logs').delete().eq('id', id).eq('user_id', getLoggedUserId()))
    },
    maintenance: {
        getAll: () => vcDb._run(sb => sb.from('maintenance_logs').select('*').eq('user_id', getLoggedUserId()).order('date', { ascending: false })),
        add: (m) => vcDb._run(sb => sb.from('maintenance_logs').insert([{ ...m, user_id: getLoggedUserId() }]).select()),
        update: (id, m) => vcDb._run(sb => sb.from('maintenance_logs').update(m).eq('id', id).eq('user_id', getLoggedUserId()).select()),
        delete: (id) => vcDb._run(sb => sb.from('maintenance_logs').delete().eq('id', id).eq('user_id', getLoggedUserId()))
    }
};

// ============================================================
// INIT
// ============================================================
async function initVehicleModule() {
    const uid = getLoggedUserId();
    if (!uid) { console.warn('[VC] Usuário não autenticado'); return; }

    // Pro Plan Check: Controle Veicular is a Pro Feature
    if (typeof requireProPlan === 'function' && !requireProPlan('Controle Veicular')) {
        setTimeout(() => { window.location.href = 'index.html'; }, 1500);
        return;
    }

    showVcLoader(true);
    try {
        const [resVeh, resFuel, resMaint] = await Promise.all([
            vcDb.vehicles.getAll(),
            vcDb.fuel.getAll(),
            vcDb.maintenance.getAll()
        ]);

        if (resVeh.data) {
            vState.vehicles = resVeh.data.map(v => ({ ...v, initialKm: v.initial_km }));
        }
        if (resFuel.data) {
            vState.fuelLogs = resFuel.data.map(f => ({ ...f, vehicleId: f.vehicle_id }));
        }
        if (resMaint.data) {
            const dismissedSet = new Set(JSON.parse(localStorage.getItem('MAPAOS_DISMISSED_WARRANTIES') || '[]'));
            vState.maintenanceLogs = resMaint.data.map(m => {
                const isDismissed = m.warranty_dismissed ?? m.warrantyDismissed ?? dismissedSet.has(String(m.id));
                return {
                    ...m,
                    vehicleId: m.vehicle_id || m.vehicleId,
                    intervalType: m.interval_type || m.intervalType,
                    intervalVal: m.interval_val || m.intervalVal,
                    next: m.next_km ?? m.next,
                    nextDate: m.next_date || m.nextDate,
                    status: m.status || 'pendente',
                    hasWarranty: m.has_warranty ?? m.hasWarranty ?? false,
                    warrantyMonths: m.warranty_months || m.warrantyMonths || 0,
                    warrantyDismissed: isDismissed,
                    controlNextExchange: m.control_next_exchange ?? m.controlNextExchange ?? true
                };
            });
        }

        // Restore saved active vehicle or use first
        const savedId = localStorage.getItem('vc_active_vehicle_id');
        if (savedId && vState.vehicles.find(v => v.id === savedId)) {
            vState.activeVehicleId = savedId;
        } else if (vState.vehicles.length > 0) {
            vState.activeVehicleId = vState.vehicles[0].id;
        }

        vcRecalculateConsumptions();
        vcUpdateVehicleHeader();
        vcUpdateViewModeUI();

        // Check if redirected with ?action=fuel or ?action=maint
        const urlParams = new URLSearchParams(window.location.search);
        const actionParam = urlParams.get('action');
        if (actionParam === 'fuel') {
            vcSwitchView('vc-fuel-form');
        } else if (actionParam === 'maint') {
            vcSwitchView('vc-maint-form');
        } else {
            vcSwitchView('vc-dashboard');
        }

        // Set today in forms
        const today = new Date().toISOString().split('T')[0];
        const fuelDateEl = document.getElementById('vc-fuel-date');
        const maintDateEl = document.getElementById('vc-maint-date');
        if (fuelDateEl) fuelDateEl.value = today;
        if (maintDateEl) maintDateEl.value = today;

        // If no vehicle, open registration
        if (vState.vehicles.length === 0) {
            vcOpenVehicleModal();
        }
    } catch (e) {
        console.error('[VC] initVehicleModule error:', e);
    } finally {
        showVcLoader(false);
    }
}

function showVcLoader(show) {
    const el = document.getElementById('vc-loader');
    if (el) el.style.display = show ? 'flex' : 'none';
}

// ============================================================
// VIEW MANAGEMENT
// ============================================================
function vcSwitchView(viewId) {
    // Prevent navigating to forms if no vehicle exists
    if ((viewId === 'vc-fuel-form' || viewId === 'vc-maint-form') && (!vState.vehicles || vState.vehicles.length === 0)) {
        alert('Nenhum veículo cadastrado. Por favor, cadastre um veículo antes de registrar um abastecimento ou manutenção.');
        vcOpenVehicleModal();
        return;
    }

    vState.currentView = viewId;
    document.querySelectorAll('.vc-view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) target.classList.add('active');

    if (viewId === 'vc-dashboard') vcRenderDashboard();
    if (viewId === 'vc-history') {
        vcSwitchHistoryTab(vState.historyTab || 'fuel');
    }
    if (viewId === 'vc-fuel-form') {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('vc-fuel-date').value = today;
        if (!vState.editingFuelId) {
            document.getElementById('vc-form-fuel').reset();
            document.getElementById('vc-fuel-date').value = today;
        }
    }
    if (viewId === 'vc-maint-form') {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('vc-maint-date').value = today;
        if (!vState.editingMaintId) {
            document.getElementById('vc-form-maint').reset();
            document.getElementById('vc-maint-date').value = today;
            vcToggleMaintIntervalFields();
        }
    }
}

// ============================================================
// VEHICLE HEADER UPDATE
// ============================================================
function vcUpdateVehicleHeader() {
    const veh = vState.vehicles.find(v => v.id === vState.activeVehicleId);
    const headerEl = document.getElementById('vc-vehicle-label');
    if (!headerEl) return;
    if (veh) {
        headerEl.textContent = `${veh.model} · ${veh.plate}`;
    } else {
        headerEl.textContent = 'Nenhum veículo';
    }
}

// Add dashFilter property to vState if not present
vState.dashFilter = vState.dashFilter || 'mes_atual';

function vcSetDashFilter(filter) {
    vState.dashFilter = filter;
    const customContainer = document.getElementById('vc-custom-date-container');
    if (customContainer) {
        if (filter === 'custom') {
            customContainer.classList.remove('hidden');
            // Setup default custom dates if empty
            const startDateEl = document.getElementById('vc-custom-start-date');
            const endDateEl = document.getElementById('vc-custom-end-date');
            if (startDateEl && !startDateEl.value) {
                const today = new Date();
                const year = today.getFullYear();
                const month = String(today.getMonth() + 1).padStart(2, '0');
                startDateEl.value = `${year}-${month}-01`;
            }
            if (endDateEl && !endDateEl.value) {
                const today = new Date();
                const year = today.getFullYear();
                const month = String(today.getMonth() + 1).padStart(2, '0');
                const lastDay = new Date(year, today.getMonth() + 1, 0).getDate();
                endDateEl.value = `${year}-${month}-${lastDay}`;
            }
        } else {
            customContainer.classList.add('hidden');
        }
    }
    vcRenderDashboard();
}

function vcRenderDashboard() {
    const veh = vState.vehicles.find(v => v.id === vState.activeVehicleId);
    if (!veh) {
        document.getElementById('vc-stat-km').textContent = '0';
        return;
    }

    // Sync select dropdown if exists
    const filterSelect = document.getElementById('vc-dash-filter');
    if (filterSelect) filterSelect.value = vState.dashFilter;

    // Calc real KM (max of vehicle + logs)
    const fuelLogs = vState.fuelLogs.filter(l => String(l.vehicleId) === String(vState.activeVehicleId));
    const maintLogs = vState.maintenanceLogs.filter(l => String(l.vehicleId) === String(vState.activeVehicleId));
    let maxKM = veh.km_actual || 0;
    if (fuelLogs.length > 0) maxKM = Math.max(maxKM, ...fuelLogs.map(l => l.km || 0));
    if (maintLogs.length > 0) maxKM = Math.max(maxKM, ...maintLogs.map(m => m.km || 0));
    veh.km_actual = maxKM;

    // Update KM
    const kmEl = document.getElementById('vc-stat-km');
    if (kmEl) kmEl.textContent = maxKM.toLocaleString('pt-BR');

    // App standard period filter calculation (semana_atual, semana_passada, mes_atual, mes_passado, custom)
    const now = new Date();
    const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const filterByPeriod = log => {
        if (!log.date || log.vehicleId !== vState.activeVehicleId) return false;

        const dateRaw = String(log.date).split('T')[0];
        const [yearStr, monthStr, dayStr] = dateRaw.split('-');
        const logDate = yearStr && monthStr && dayStr 
            ? new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr))
            : new Date(log.date);

        if (vState.dashFilter === '15d') {
            return (now - logDate) <= (15 * 86400000);
        }

        if (vState.dashFilter === 'mes_atual') {
            return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
        }

        if (vState.dashFilter === 'mes_passado') {
            const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            return logDate.getMonth() === prevMonthDate.getMonth() && logDate.getFullYear() === prevMonthDate.getFullYear();
        }

        if (vState.dashFilter === 'custom') {
            const startDateVal = document.getElementById('vc-custom-start-date')?.value;
            const endDateVal = document.getElementById('vc-custom-end-date')?.value;
            if (startDateVal && endDateVal) {
                const startDate = new Date(startDateVal + 'T00:00:00');
                const endDate = new Date(endDateVal + 'T23:59:59');
                return logDate >= startDate && logDate <= endDate;
            }
            return true;
        }

        return true;
    };

    const fuelFiltered = fuelLogs.filter(filterByPeriod);
    const maintFiltered = maintLogs.filter(filterByPeriod);
    const totalFuel = fuelFiltered.reduce((a, l) => a + (l.total || 0), 0);
    const totalMaint = maintFiltered.reduce((a, l) => a + (l.cost || 0), 0);
    const totalSpent = totalFuel + totalMaint;

    vcSetText('vc-stat-fuel-month', `R$ ${totalFuel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    vcSetText('vc-stat-maint-month', `R$ ${totalMaint.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    vcSetText('vc-stat-spent-month', `R$ ${totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);

    // Cost breakdown bar
    let fuelPerc = 0, maintPerc = 0;
    if (totalSpent > 0) {
        fuelPerc = (totalFuel / totalSpent) * 100;
        maintPerc = (totalMaint / totalSpent) * 100;
    }
    const bar = document.getElementById('vc-cost-bar');
    if (bar) bar.style.width = `${fuelPerc}%`;
    vcSetText('vc-stat-breakdown', `Combustível: ${fuelPerc.toFixed(0)}% | Manutenção: ${maintPerc.toFixed(0)}%`);

    // Avg consumption & cost/km
    if (fuelLogs.length > 1) {
        const sorted = [...fuelLogs].sort((a, b) => a.km - b.km);
        const totalKM = sorted[sorted.length - 1].km - sorted[0].km;
        const totalCost = fuelLogs.reduce((a, l) => a + l.total, 0);
        const totalLiters = sorted.slice(1).reduce((a, l) => a + l.liters, 0);
        if (totalKM > 0 && totalLiters > 0) {
            vcSetText('vc-stat-avg-consumption', (totalKM / totalLiters).toFixed(1).replace('.', ','));
            vcSetText('vc-stat-cost-km', `R$ ${(totalCost / totalKM).toFixed(2).replace('.', ',')}`);
        } else {
            vcSetText('vc-stat-avg-consumption', '--');
            vcSetText('vc-stat-cost-km', 'R$ --');
        }
    } else {
        vcSetText('vc-stat-avg-consumption', '--');
        vcSetText('vc-stat-cost-km', 'R$ --');
    }

    // Maintenance reminders / expirations (Pass all vehicle maintenance logs, NOT period-filtered)
    vcRenderMaintenanceReminders(veh, maintLogs);
    // Deferred retry in case data wasn't ready yet on first render
    setTimeout(() => vcRenderMaintenanceReminders(veh, maintLogs), 400);

    // Next maintenance card
    vcRenderNextMaintCard(veh, maintLogs);
}

function vcSetText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function vcGetAllActiveExpirations(veh, maintLogs) {
    const items = [];
    const now = new Date();

    maintLogs.forEach(m => {
        const nextKm = m.next ?? m.next_km;
        const nextDate = m.nextDate || m.next_date;

        // 1. KM-based maintenance: only if overdue OR <= 2000 km remaining
        if (nextKm !== undefined && nextKm !== null) {
            const rem = Number(nextKm) - Number(veh.km_actual || 0);
            const isVencida = rem <= 0;
            if (rem <= 2000) {
                items.push({
                    type: 'maintenance',
                    title: m.type || 'Manutenção',
                    subtitle: `Vence em: ${Number(nextKm).toLocaleString('pt-BR')} km`,
                    isVencida,
                    rightText: `${Math.abs(rem).toLocaleString('pt-BR')} km`,
                    rightLabel: isVencida ? 'ATRASADO' : 'RESTANTES',
                    icon: 'build',
                    iconBg: isVencida ? 'bg-tertiary/15 text-tertiary border-tertiary/30' : 'bg-amber-400/15 text-amber-400 border-amber-400/30',
                    textColor: isVencida ? 'text-tertiary' : 'text-amber-400',
                    sortPriority: isVencida ? 1 : 2,
                    sortValue: rem
                });
            }
        }

        // 2. Date-based maintenance: only if overdue
        if (!nextKm && nextDate) {
            const nd = new Date(nextDate);
            const diffDays = Math.ceil((nd - now) / 86400000);
            const isVencida = diffDays <= 0;
            if (isVencida) {
                items.push({
                    type: 'maintenance',
                    title: m.type || 'Manutenção',
                    subtitle: `Vence em: ${nd.toLocaleDateString('pt-BR')}`,
                    isVencida,
                    rightText: `${Math.abs(diffDays)} dias`,
                    rightLabel: 'ATRASADO',
                    icon: 'calendar_clock',
                    iconBg: 'bg-tertiary/15 text-tertiary border-tertiary/30',
                    textColor: 'text-tertiary',
                    sortPriority: 1,
                    sortValue: diffDays
                });
            }
        }

        // 3. Warranty: only if expired OR <= 20 days remaining, AND NOT dismissed
        const hasWarranty = m.hasWarranty ?? m.has_warranty ?? false;
        const warrantyMonths = Number(m.warrantyMonths || m.warranty_months || 0);
        const warrantyDismissed = m.warrantyDismissed ?? m.warranty_dismissed ?? false;
        const logDate = m.date || m.created_at;

        if (hasWarranty && !warrantyDismissed && warrantyMonths > 0 && logDate) {
            const expDate = new Date(logDate);
            expDate.setMonth(expDate.getMonth() + warrantyMonths);
            const diffDays = Math.ceil((expDate - now) / 86400000);
            const isVencida = diffDays <= 0;
            if (diffDays <= 20) {
                items.push({
                    type: 'warranty',
                    logId: m.id,
                    title: `Garantia: ${m.type || 'Serviço'}`,
                    subtitle: `Validade: ${expDate.toLocaleDateString('pt-BR')} (${warrantyMonths}m)`,
                    isVencida,
                    rightText: `${Math.abs(diffDays)} dias`,
                    rightLabel: isVencida ? 'EXPIRADA' : 'DE GARANTIA',
                    icon: 'verified',
                    iconBg: isVencida ? 'bg-tertiary/15 text-tertiary border-tertiary/30' : 'bg-secondary-container/15 text-secondary-container border-secondary-container/30',
                    textColor: isVencida ? 'text-tertiary' : 'text-secondary-container',
                    sortPriority: isVencida ? 1 : 3,
                    sortValue: diffDays
                });
            }
        }
    });

    // Sort: Overdue items first (priority 1), then closest
    return items.sort((a, b) => {
        if (a.sortPriority !== b.sortPriority) return a.sortPriority - b.sortPriority;
        return a.sortValue - b.sortValue;
    });
}

function vcRenderMaintenanceReminders(veh, _ignored) {
    try {
        const el = document.getElementById('vc-reminders-list');
        if (!el || !veh) return;

        const now = new Date();
        const logs = vState.maintenanceLogs || [];

        // If data not loaded yet, wait
        if (logs.length === 0) {
            el.innerHTML = '<p class="text-xs text-on-surface-variant text-center py-4">Sem vencimentos cadastrados.</p>';
            return;
        }

        const items = [];

        logs.forEach(function(m) {
            // KM-based maintenance: only if overdue OR <= 2000 km remaining
            var nextKm = (m.next !== undefined && m.next !== null) ? m.next : m.next_km;
            if (nextKm !== undefined && nextKm !== null) {
                var rem = Number(nextKm) - Number(veh.km_actual || 0);
                var isVencida = rem <= 0;
                if (rem <= 2000) { // Show only if overdue OR <= 2000 km remaining
                    items.push({
                        title: m.type || 'Manutenção',
                        subtitle: 'Vence em: ' + Number(nextKm).toLocaleString('pt-BR') + ' km',
                        isVencida: isVencida,
                        rightText: Math.abs(rem).toLocaleString('pt-BR') + ' km',
                        rightLabel: isVencida ? 'ATRASADO' : 'RESTANTES',
                        icon: 'build',
                        color: isVencida ? 'text-red-400' : 'text-amber-400',
                        bg: isVencida ? 'bg-red-400/10 border-red-400/30' : 'bg-amber-400/10 border-amber-400/30',
                        sortVal: rem
                    });
                }
            }

            // Date-based maintenance: only if overdue
            var nextDate = m.nextDate || m.next_date;
            if (!nextKm && nextDate) {
                var dDate = new Date(nextDate);
                var diff = Math.ceil((dDate - now) / 86400000);
                var isVencidaD = diff <= 0;
                if (isVencidaD) { // Show only if overdue
                    items.push({
                        title: m.type || 'Manutenção',
                        subtitle: 'Vence em: ' + dDate.toLocaleDateString('pt-BR'),
                        isVencida: isVencidaD,
                        rightText: Math.abs(diff) + ' dias',
                        rightLabel: 'ATRASADO',
                        icon: 'calendar_clock',
                        color: 'text-red-400',
                        bg: 'bg-red-400/10 border-red-400/30',
                        sortVal: diff
                    });
                }
            }

            // Warranty: only if expired OR <= 20 days remaining, AND NOT dismissed
            var hasWarranty = (m.hasWarranty !== undefined ? m.hasWarranty : m.has_warranty) || false;
            var warrantyMonths = Number(m.warrantyMonths || m.warranty_months || 0);
            var warrantyDismissed = (m.warrantyDismissed !== undefined ? m.warrantyDismissed : m.warranty_dismissed) || false;
            var logDate = m.date || m.created_at;
            if (hasWarranty && !warrantyDismissed && warrantyMonths > 0 && logDate) {
                var expDate = new Date(logDate);
                expDate.setMonth(expDate.getMonth() + warrantyMonths);
                var diffW = Math.ceil((expDate - now) / 86400000);
                var isVencidaW = diffW <= 0;
                if (diffW <= 20) { // Show only if expired OR <= 20 days remaining
                    items.push({
                        type: 'warranty',
                        logId: m.id,
                        title: 'Garantia: ' + (m.type || 'Serviço'),
                        subtitle: 'Válida até: ' + expDate.toLocaleDateString('pt-BR'),
                        isVencida: isVencidaW,
                        rightText: Math.abs(diffW) + ' dias',
                        rightLabel: isVencidaW ? 'EXPIRADA' : 'GARANTIA',
                        icon: 'verified',
                        color: isVencidaW ? 'text-red-400' : 'text-emerald-400',
                        bg: isVencidaW ? 'bg-red-400/10 border-red-400/30' : 'bg-emerald-400/10 border-emerald-400/30',
                        sortVal: diffW
                    });
                }
            }
        });

        // Sort: overdue first, then closest
        items.sort(function(a, b) {
            if (a.isVencida && !b.isVencida) return -1;
            if (!a.isVencida && b.isVencida) return 1;
            return a.sortVal - b.sortVal;
        });

        if (items.length === 0) {
            el.innerHTML = '<p class="text-xs text-on-surface-variant text-center py-4">Tudo em dia! Sem vencimentos próximos.</p>';
            return;
        }

        var top4 = items.slice(0, 4);
        var extra = items.length - 4;
        var extraLabel = extra > 0 ? ' (+' + extra + ')' : '';

        var html = top4.map(function(item) {
            var cienteBtn = item.type === 'warranty' && item.logId ? 
                '<button onclick="event.stopPropagation(); vcAcknowledgeWarranty(\'' + item.logId + '\')" class="mt-1 px-2 py-0.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-[10px] font-bold text-emerald-400 flex items-center gap-1 transition-all active:scale-95 cursor-pointer ml-auto">'
                + '<span class="material-symbols-outlined text-xs">check_circle</span> Ciente</button>' : '';

            return '<div class="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 mb-2 hover:bg-white/10 transition-all">'
                + '<div class="flex items-center gap-3">'
                + '<div class="w-8 h-8 rounded-lg ' + item.bg + ' border flex items-center justify-center shrink-0">'
                + '<span class="material-symbols-outlined text-sm ' + item.color + '">' + item.icon + '</span>'
                + '</div>'
                + '<div>'
                + '<p class="text-xs font-bold text-on-surface leading-tight">' + item.title + '</p>'
                + '<p class="text-[10px] text-on-surface-variant mt-0.5">' + item.subtitle + '</p>'
                + '</div></div>'
                + '<div class="text-right shrink-0 ml-2 flex flex-col items-end">'
                + '<p class="text-xs font-bold ' + item.color + '">' + item.rightText + '</p>'
                + '<p class="text-[9px] text-on-surface-variant uppercase tracking-wider">' + item.rightLabel + '</p>'
                + cienteBtn
                + '</div></div>';
        }).join('');

        html += '<button onclick="vcOpenAlertsModal()" class="w-full mt-1 py-2 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 text-xs font-bold text-amber-400 flex items-center justify-center gap-1.5 transition-all">'
            + '<span class="material-symbols-outlined text-sm">list_alt</span>'
            + '<span>Ver todos os vencimentos' + extraLabel + '</span>'
            + '</button>';

        el.innerHTML = html;
    } catch(e) {
        var el2 = document.getElementById('vc-reminders-list');
        if (el2) el2.innerHTML = '<p class="text-xs text-on-surface-variant text-center py-4">Erro ao carregar vencimentos.</p>';
    }
}

// Modal for All Expirations & Warranty Alerts
function vcOpenAlertsModal() {
    const modal = document.getElementById('vc-alerts-modal');
    const list = document.getElementById('vc-alerts-modal-list');
    if (!modal || !list) return;

    const veh = vState.vehicles.find(v => v.id === vState.activeVehicleId);
    if (!veh) return;

    const allExpirations = vcGetAllActiveExpirations(veh, vState.maintenanceLogs || []);

    if (allExpirations.length === 0) {
        list.innerHTML = '<p class="text-xs text-on-surface-variant text-center py-8">Nenhum vencimento ou alerta no momento.</p>';
    } else {
        list.innerHTML = allExpirations.map(item => `
            <div class="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/10">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl ${item.iconBg} border flex items-center justify-center shrink-0">
                        <span class="material-symbols-outlined text-xl font-bold">${item.icon}</span>
                    </div>
                    <div>
                        <p class="text-sm font-bold text-on-surface">${item.title}</p>
                        <p class="text-xs text-on-surface-variant mt-0.5">${item.subtitle}</p>
                    </div>
                </div>
                <div class="text-right shrink-0 flex flex-col items-end">
                    <p class="text-sm font-bold ${item.textColor}">${item.rightText}</p>
                    <p class="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">${item.rightLabel}</p>
                    ${item.type === 'warranty' && item.logId ? `
                        <button onclick="event.stopPropagation(); vcAcknowledgeWarranty('${item.logId}')" class="mt-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-xs font-bold text-emerald-400 flex items-center gap-1 transition-all active:scale-95 cursor-pointer">
                            <span class="material-symbols-outlined text-sm">check_circle</span> Ciente
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function vcCloseAlertsModal() {
    const modal = document.getElementById('vc-alerts-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

async function vcAcknowledgeWarranty(logId) {
    if (!logId) return;

    // Update in local vState
    const target = vState.maintenanceLogs.find(m => String(m.id) === String(logId));
    if (target) {
        target.warrantyDismissed = true;
        target.warranty_dismissed = true;
    }

    // Save to localStorage so it persists even without DB schema changes
    try {
        const dismissed = new Set(JSON.parse(localStorage.getItem('MAPAOS_DISMISSED_WARRANTIES') || '[]'));
        dismissed.add(String(logId));
        localStorage.setItem('MAPAOS_DISMISSED_WARRANTIES', JSON.stringify(Array.from(dismissed)));
    } catch(e) {}

    // Persist to Supabase
    await vcDb.maintenance.update(logId, { warranty_dismissed: true });

    // Re-render UI & update global navigation red alert dot
    const veh = vState.vehicles.find(v => v.id === vState.activeVehicleId);
    if (veh) {
        vcRenderMaintenanceReminders(veh, []);
        vcOpenAlertsModal();
    }
    if (typeof checkVehiclePendingAlerts === 'function') {
        checkVehiclePendingAlerts();
    }
}

function vcRenderNextMaintCard(veh, maintLogs) {
    const card = document.getElementById('vc-next-maint-card');
    if (!card) return;
    const futures = maintLogs.filter(m => m.intervalType === 'km' && m.next > veh.km_actual).sort((a, b) => a.next - b.next);
    if (futures.length > 0) {
        card.style.display = 'flex';
        vcSetText('vc-next-maint-type', futures[0].type);
        vcSetText('vc-next-maint-km', (futures[0].next - veh.km_actual).toLocaleString('pt-BR'));
    } else {
        card.style.display = 'none';
    }
}

// Add default sort order to vState if not present ('desc' = Mais Recentes, 'asc' = Mais Antigas)
vState.historySortOrder = vState.historySortOrder || 'desc';

function vcToggleSortOrder() {
    vState.historySortOrder = vState.historySortOrder === 'desc' ? 'asc' : 'desc';
    const btn = document.getElementById('vc-btn-sort-toggle');
    const icon = document.getElementById('vc-sort-icon');
    const isDesc = vState.historySortOrder === 'desc';
    if (icon) icon.textContent = isDesc ? 'arrow_downward' : 'arrow_upward';
    if (btn) btn.title = isDesc ? 'Mais Recentes (Clique para alternar para Mais Antigas)' : 'Mais Antigas (Clique para alternar para Mais Recentes)';
    vcRenderHistory();
}

function vcSwitchHistoryTab(tab) {
    vState.historyTab = tab;
    document.querySelectorAll('.vc-tab-btn').forEach(b => {
        const isActive = b.dataset.tab === tab;
        b.classList.toggle('active', isActive);
    });

    // Toggle search bar, 'upcoming' and 'expired_warranty' filter visibility (Only visible on maintenance tab)
    const searchContainer = document.getElementById('vc-maint-search-container');
    const searchSpacer = document.getElementById('vc-search-spacer');
    const upcomingBtn = document.querySelector('.vc-filter-btn[data-filter="upcoming"]');
    const expiredWBtn = document.querySelector('.vc-filter-btn[data-filter="expired_warranty"]');
    
    if (tab === 'maintenance') {
        if (upcomingBtn) upcomingBtn.classList.remove('hidden');
        if (expiredWBtn) expiredWBtn.classList.remove('hidden');
    } else {
        if (upcomingBtn) upcomingBtn.classList.add('hidden');
        if (expiredWBtn) expiredWBtn.classList.add('hidden');
        if (vState.historyFilter === 'upcoming' || vState.historyFilter === 'expired_warranty') {
            vcSetHistoryFilter('all');
            return;
        }
    }
    if (searchContainer) {
        if (tab === 'maintenance') {
            searchContainer.classList.remove('hidden');
            if (searchSpacer) searchSpacer.classList.add('hidden');
        } else {
            searchContainer.classList.add('hidden');
            if (searchSpacer) searchSpacer.classList.remove('hidden');
        }
    }

    vcRenderHistory();
}

function vcSetHistoryFilter(filter) {
    vState.historyFilter = filter;
    document.querySelectorAll('.vc-filter-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.filter === filter);
    });
    vcRenderHistory();
}

function vcToggleViewMode() {
    vState.historyViewMode = vState.historyViewMode === 'cards' ? 'list' : 'cards';
    localStorage.setItem('MAPAOS_VEICULO_VIEW_MODE', vState.historyViewMode);
    vcUpdateViewModeUI();
    vcRenderHistory();
}

function vcUpdateViewModeUI() {
    const icon = document.getElementById('vc-view-icon');
    const label = document.getElementById('vc-view-label');
    const isList = vState.historyViewMode === 'list';
    if (icon) icon.textContent = isList ? 'grid_view' : 'view_list';
    if (label) label.textContent = isList ? 'Cards' : 'Lista';
}

function vcRenderHistory() {
    const list = document.getElementById('vc-history-list');
    const countEl = document.getElementById('vc-hist-count');
    if (!list) return;
    list.innerHTML = '';

    const now = new Date();
    let cutoff = null;
    if (vState.historyFilter === '7') cutoff = new Date(now.getTime() - 7 * 86400000);
    if (vState.historyFilter === '30') cutoff = new Date(now.getTime() - 30 * 86400000);

    const filterDate = log => {
        if (!cutoff || !log.date) return true;
        return new Date(log.date) >= cutoff;
    };

    // Sort function helper based on vState.historySortOrder
    const sortLogs = (a, b) => {
        const timeA = new Date(a.date).getTime() || 0;
        const timeB = new Date(b.date).getTime() || 0;
        return vState.historySortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    };

    if (vState.historyTab === 'fuel') {
        const logs = vState.fuelLogs
            .filter(l => String(l.vehicleId) === String(vState.activeVehicleId))
            .filter(filterDate)
            .sort(sortLogs);
        if (countEl) countEl.textContent = `${logs.length} registros`;
        if (logs.length === 0) {
            list.innerHTML = '<p class="text-xs text-on-surface-variant text-center py-8">Nenhum abastecimento registrado.</p>';
            return;
        }
        logs.forEach(log => {
            const dateStr = new Date(log.date).toLocaleDateString('pt-BR');
            const pricePerL = log.liters > 0 ? log.total / log.liters : 0;
            const kmDriven = log.kmDriven || 0;
            const costPerKm = (kmDriven > 0 && log.total > 0) ? (log.total / kmDriven) : (log.consumption > 0 ? log.total / (log.liters * log.consumption) : 0);
            const isList = vState.historyViewMode === 'list';
            const div = document.createElement('div');
            if (isList) {
                // Compact square list row (matching Reserva list layout)
                div.className = 'glass-card p-2.5 rounded-md border border-white/10 mb-1.5 flex items-center justify-between gap-3 text-xs hover:bg-white/10 transition-all border-l-[3px] border-l-secondary-container';
                div.innerHTML = `
                    <div class="flex items-center gap-2.5 min-w-0 flex-1">
                        <div class="w-7 h-7 rounded-lg bg-secondary-container/15 text-secondary-container flex items-center justify-center shrink-0">
                            <span class="material-symbols-outlined text-sm" style="font-variation-settings:'FILL' 1">local_gas_station</span>
                        </div>
                        <div class="min-w-0">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="font-bold text-on-surface text-xs">${log.type || 'Combustível'}</span>
                                <span class="text-[11px] font-bold text-secondary-container">R$ ${(log.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                ${kmDriven > 0 ? `<span class="text-[10px] text-emerald-400 font-semibold">(+${kmDriven.toLocaleString('pt-BR')} km)</span>` : ''}
                            </div>
                            <p class="text-[10px] text-on-surface-variant/70 truncate">
                                ${dateStr} • ${(log.liters || 0).toFixed(2)}L • R$ ${pricePerL.toFixed(2)}/L ${(log.km || 0) ? '• ' + (log.km || 0).toLocaleString('pt-BR') + ' km' : ''} ${log.station ? '• ' + log.station : ''}
                            </p>
                            ${log.obs ? `<p class="text-[10px] text-amber-300/80 italic mt-0.5 truncate flex items-center gap-1"><span class="material-symbols-outlined text-[11px]">notes</span>${log.obs}</p>` : ''}
                        </div>
                    </div>
                    <div class="flex items-center gap-1 shrink-0">
                        <button onclick="vcEditFuel('${log.id}')" class="p-1 text-primary hover:bg-primary/10 rounded-lg transition-all" title="Editar"><span class="material-symbols-outlined text-base">edit</span></button>
                        <button onclick="vcDeleteFuel('${log.id}')" class="p-1 text-tertiary hover:bg-tertiary/10 rounded-lg transition-all" title="Excluir"><span class="material-symbols-outlined text-base">delete</span></button>
                    </div>
                `;
            } else {
                // Full card layout
                div.className = 'glass-card rounded-2xl p-4 sm:p-5 mb-4 relative overflow-hidden transition-all duration-300 border-l-4 border-l-secondary-container';
                div.innerHTML = `
                    <!-- Top Row: Icon + Fuel Type + Date & Total Price -->
                    <div class="flex justify-between items-start gap-3 mb-4">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-secondary-container/15 text-secondary-container border border-secondary-container/30 flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-xl" style="font-variation-settings:'FILL' 1">local_gas_station</span>
                            </div>
                            <div>
                                <h4 class="font-bold text-on-surface text-base leading-snug">${log.type || 'Combustível'}</h4>
                                <div class="flex items-center gap-2 text-xs text-on-surface-variant mt-0.5">
                                    <span class="flex items-center gap-1"><span class="material-symbols-outlined text-xs">calendar_today</span>${dateStr}</span>
                                    ${log.station && log.station !== 'Não informado' ? `<span>•</span><span class="flex items-center gap-0.5"><span class="material-symbols-outlined text-xs">location_on</span>${log.station}</span>` : ''}
                                </div>
                            </div>
                        </div>
                        <div class="text-right shrink-0">
                            <p class="font-bold text-secondary-container text-lg leading-tight">R$ ${(log.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            <span class="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full mt-1.5 border border-white/10 bg-white/5 text-on-surface-variant">
                                <span class="material-symbols-outlined text-[11px]">route</span>
                                <span>${(log.km || 0).toLocaleString('pt-BR')} km</span>
                            </span>
                        </div>
                    </div>

                    <!-- Stats Grid Box (5 Columns) -->
                    <div class="grid grid-cols-5 gap-1.5 p-3 rounded-xl bg-white/5 border border-white/10 mb-3 text-center">
                        <div>
                            <p class="text-[9px] sm:text-[10px] uppercase font-semibold text-on-surface-variant tracking-wider truncate" title="KM Percorrido desde o abastecimento anterior">Percorrido</p>
                            <p class="text-xs font-bold text-emerald-400 mt-0.5">${kmDriven > 0 ? kmDriven.toLocaleString('pt-BR') + ' km' : '--'}</p>
                        </div>
                        <div>
                            <p class="text-[9px] sm:text-[10px] uppercase font-semibold text-on-surface-variant tracking-wider truncate">Litros</p>
                            <p class="text-xs font-bold text-on-surface mt-0.5">${(log.liters || 0).toFixed(2)} L</p>
                        </div>
                        <div>
                            <p class="text-[9px] sm:text-[10px] uppercase font-semibold text-on-surface-variant tracking-wider truncate">Preço/L</p>
                            <p class="text-xs font-bold text-on-surface mt-0.5">R$ ${pricePerL.toFixed(2)}</p>
                        </div>
                        <div>
                            <p class="text-[9px] sm:text-[10px] uppercase font-semibold text-on-surface-variant tracking-wider truncate">Consumo</p>
                            <p class="text-xs font-bold text-secondary-container mt-0.5">${log.consumption > 0 ? log.consumption.toFixed(1) + ' km/L' : '--'}</p>
                        </div>
                        <div>
                            <p class="text-[9px] sm:text-[10px] uppercase font-semibold text-on-surface-variant tracking-wider truncate">Custo/km</p>
                            <p class="text-xs font-bold text-on-surface mt-0.5">${costPerKm > 0 ? 'R$ ' + costPerKm.toFixed(2) : '--'}</p>
                        </div>
                    </div>

                    ${log.obs ? `
                    <!-- Optional Notes Section -->
                    <p class="text-[10px] text-on-surface-variant/70 italic mb-2.5 px-1 truncate">
                        <span class="font-semibold not-italic">Obs:</span> ${log.obs}
                    </p>
                    ` : ''}

                    <!-- Bottom Footer Row: Station Info & Action Buttons (Edit + Delete) -->
                    <div class="flex items-center justify-between pt-1">
                        <div class="flex items-center gap-1 text-xs text-on-surface-variant">
                            <span class="material-symbols-outlined text-sm text-secondary-container">store</span>
                            <span class="font-medium">${log.station || 'Local não informado'}</span>
                        </div>

                        <div class="flex items-center gap-2">
                            <button onclick="vcEditFuel('${log.id}')" 
                                class="text-xs text-primary hover:bg-primary/10 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all active:scale-95">
                                <span class="material-symbols-outlined text-sm">edit</span>
                                <span>Editar</span>
                            </button>
                            <button onclick="vcDeleteFuel('${log.id}')" 
                                class="text-xs text-tertiary hover:bg-tertiary/10 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all active:scale-95">
                                <span class="material-symbols-outlined text-sm">delete</span>
                                <span>Excluir</span>
                            </button>
                        </div>
                    </div>
                `;
            }
            list.appendChild(div);
        });
        return;
    } else {
        const veh = vState.vehicles.find(v => String(v.id) === String(vState.activeVehicleId));
        const currentKm = veh ? veh.km_actual : 0;

        // Maintenance search with accent normalization (e.g. 'oleo' matches 'óleo')
        const normalizeText = str => (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        const searchQuery = normalizeText(document.getElementById('vc-maint-search-input')?.value);

        const filterSearch = m => {
            if (!searchQuery) return true;
            const typeMatch = normalizeText(m.type).includes(searchQuery);
            const stationMatch = normalizeText(m.station).includes(searchQuery);
            const obsMatch = normalizeText(m.obs).includes(searchQuery);
            return typeMatch || stationMatch || obsMatch;
        };

        const filterExpiredWarranty = m => {
            if (vState.historyFilter !== 'expired_warranty') return true;
            const hasW = m.hasWarranty ?? m.has_warranty ?? false;
            const wMonths = Number(m.warrantyMonths || m.warranty_months || 0);
            const lDate = m.date || m.created_at;
            if (hasW && wMonths > 0 && lDate) {
                const expDate = new Date(lDate);
                expDate.setMonth(expDate.getMonth() + wMonths);
                const diffDays = Math.ceil((expDate - now) / 86400000);
                return diffDays <= 0; // True if warranty is expired
            }
            return false;
        };

        // Sort function helper: if 'upcoming' filter is active, sort ALL records by maintenance urgency (KM or next Date only, ignoring warranty)
        const sortHistory = (a, b) => {
            if (vState.historyFilter === 'upcoming') {
                const getUrgency = m => {
                    const nextKm = m.next ?? m.next_km;
                    if (nextKm !== undefined && nextKm !== null) {
                        return Number(nextKm) - Number(currentKm);
                    }
                    const nextDate = m.nextDate || m.next_date;
                    if (nextDate) {
                        return Math.ceil((new Date(nextDate) - now) / 86400000);
                    }
                    return 99999999;
                };
                return getUrgency(a) - getUrgency(b);
            }
            return sortLogs(a, b);
        };

        const maintLogs = vState.maintenanceLogs
            .filter(m => String(m.vehicleId) === String(vState.activeVehicleId))
            .filter(filterDate)
            .filter(filterSearch)
            .filter(filterExpiredWarranty)
            .sort(sortHistory);

        if (countEl) countEl.textContent = `${maintLogs.length} registros`;
        if (maintLogs.length === 0) {
            let emptyMsg = 'Nenhuma manutenção registrada.';
            if (vState.historyFilter === 'upcoming') emptyMsg = 'Nenhuma manutenção próxima de vencer.';
            else if (vState.historyFilter === 'expired_warranty') emptyMsg = 'Nenhuma garantia vencida no momento.';
            else if (searchQuery) emptyMsg = `Nenhum serviço ou oficina encontrado para "${searchQuery}".`;
            list.innerHTML = `<p class="text-xs text-on-surface-variant text-center py-8">${emptyMsg}</p>`;
            return;
        }
        maintLogs.forEach(m => {
            const dateStr = new Date(m.date).toLocaleDateString('pt-BR');
            let kmRemaining = '—', nextKmStr = '—', intervalStr = '—', isVencida = false;
            if (m.intervalType === 'km') {
                const diff = (m.next || 0) - currentKm;
                isVencida = diff <= 0;
                kmRemaining = isVencida ? `${Math.abs(diff).toLocaleString('pt-BR')} km vencida` : `${diff.toLocaleString('pt-BR')} km`;
                nextKmStr = `${(m.next || 0).toLocaleString('pt-BR')} km`;
                intervalStr = `${(m.intervalVal || 0).toLocaleString('pt-BR')} km`;
            } else if (m.intervalType === 'date' && m.nextDate) {
                const nd = new Date(m.nextDate);
                const diff = Math.ceil((nd - new Date()) / (86400000));
                isVencida = diff <= 0;
                kmRemaining = isVencida ? 'Data Vencida' : `${diff} dias restantes`;
                nextKmStr = nd.toLocaleDateString('pt-BR');
            }

            let warrantyBadgeHtml = '';
            if (m.hasWarranty && m.warrantyMonths > 0) {
                const logDate = m.date || m.created_at;
                if (logDate) {
                    const expDate = new Date(logDate);
                    expDate.setMonth(expDate.getMonth() + Number(m.warrantyMonths));
                    const diffDays = Math.ceil((expDate - now) / 86400000);
                    const isWarrantyExpired = diffDays <= 0;
                    if (isWarrantyExpired) {
                        warrantyBadgeHtml = `<span>•</span><span class="inline-flex items-center gap-0.5 text-red-400 font-bold bg-red-400/10 border border-red-400/30 px-1.5 py-0.5 rounded-md text-[10px]" title="Garantia expirou em ${expDate.toLocaleDateString('pt-BR')}"><span class="material-symbols-outlined text-xs">verified</span>GARANTIA VENCIDA</span>`;
                    } else {
                        warrantyBadgeHtml = `<span>•</span><span class="inline-flex items-center gap-0.5 text-emerald-400 font-bold bg-emerald-400/10 border border-emerald-400/30 px-1.5 py-0.5 rounded-md text-[10px]" title="Válida até ${expDate.toLocaleDateString('pt-BR')}"><span class="material-symbols-outlined text-xs">verified</span>Garantia ${m.warrantyMonths}m (${diffDays}d)</span>`;
                    }
                }
            }

            const isConcluido = m.status === 'concluido';
            const isList = vState.historyViewMode === 'list';
            const div = document.createElement('div');

            if (isList) {
                // Compact square list row for Maintenance (matching Reserva list layout)
                div.className = `glass-card p-2.5 rounded-md border border-white/10 mb-1.5 flex items-center justify-between gap-3 text-xs hover:bg-white/10 transition-all border-l-[3px] ${isConcluido ? 'border-l-secondary-container' : isVencida ? 'border-l-tertiary' : 'border-l-amber-400'}`;
                div.innerHTML = `
                    <div class="flex items-center gap-2.5 min-w-0 flex-1">
                        <div class="w-7 h-7 rounded-lg ${isConcluido ? 'bg-secondary-container/15 text-secondary-container' : 'bg-amber-400/15 text-amber-400'} flex items-center justify-center shrink-0">
                            <span class="material-symbols-outlined text-sm" style="font-variation-settings:'FILL' 1">build</span>
                        </div>
                        <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="font-bold text-on-surface text-xs">${m.type}</span>
                                <span class="text-[11px] font-bold text-primary">R$ ${(m.cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                <span class="text-[9px] font-bold px-1.5 py-0.2 rounded ${isConcluido ? 'bg-secondary-container/15 text-secondary-container' : 'bg-amber-400/15 text-amber-400'}">${isConcluido ? 'CONCLUÍDO' : 'PENDENTE'}</span>
                            </div>
                            <div class="text-[10px] text-on-surface-variant/70 flex items-center gap-1.5 flex-wrap truncate">
                                <span>${dateStr}</span>
                                <span>• KM: ${(m.km || 0).toLocaleString('pt-BR')}</span>
                                ${m.station ? `<span>• ${m.station}</span>` : ''}
                                ${warrantyBadgeHtml ? `<span>• ${warrantyBadgeHtml}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-1 shrink-0">
                        <button onclick="vcEditMaint('${m.id}')" class="p-1 text-primary hover:bg-primary/10 rounded-lg transition-all" title="Editar"><span class="material-symbols-outlined text-base">edit</span></button>
                        <button onclick="vcDeleteMaint('${m.id}')" class="p-1 text-tertiary hover:bg-tertiary/10 rounded-lg transition-all" title="Excluir"><span class="material-symbols-outlined text-base">delete</span></button>
                    </div>
                `;
            } else {
                div.className = `glass-card rounded-2xl p-4 sm:p-5 mb-4 relative overflow-hidden transition-all duration-300 border-l-4 ${isConcluido ? 'border-l-secondary-container' : isVencida ? 'border-l-tertiary' : 'border-l-amber-400'}`;
                
                div.innerHTML = `
                <!-- Top Row: Icon + Service Name + Price & Status -->
                <div class="flex justify-between items-start gap-3 mb-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl ${isConcluido ? 'bg-secondary-container/15 text-secondary-container border border-secondary-container/30' : 'bg-amber-400/15 text-amber-400 border border-amber-400/30'} flex items-center justify-center shrink-0">
                            <span class="material-symbols-outlined text-xl" style="font-variation-settings:'FILL' 1">build</span>
                        </div>
                        <div>
                            <h4 class="font-bold text-on-surface text-base leading-snug">${m.type}</h4>
                            <div class="flex items-center flex-wrap gap-1.5 text-xs text-on-surface-variant mt-0.5">
                                <span class="flex items-center gap-1"><span class="material-symbols-outlined text-xs">calendar_today</span>${dateStr}</span>
                                ${m.station ? `<span>•</span><span class="flex items-center gap-0.5"><span class="material-symbols-outlined text-xs">store</span>${m.station}</span>` : ''}
                                ${warrantyBadgeHtml}
                            </div>
                        </div>
                    </div>
                    <div class="text-right shrink-0">
                        <p class="font-bold text-primary text-lg leading-tight">R$ ${(m.cost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <button onclick="vcToggleMaintStatus('${m.id}')" 
                            class="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full cursor-pointer mt-1.5 transition-all active:scale-95 border ${isConcluido ? 'border-secondary-container/40 text-secondary-container bg-secondary-container/10 hover:bg-secondary-container/20' : 'border-amber-400/40 text-amber-400 bg-amber-400/10 hover:bg-amber-400/20'}" 
                            title="Clique para alternar entre Pendente e Concluído">
                            <span class="material-symbols-outlined text-[12px]">${isConcluido ? 'check_circle' : 'pending_actions'}</span>
                            <span>${isConcluido ? 'CONCLUÍDO' : 'PENDENTE'}</span>
                        </button>
                    </div>
                </div>

                <!-- Stats Grid Box -->
                <div class="grid grid-cols-3 gap-2 p-3 rounded-xl bg-white/5 border border-white/10 mb-3 text-center sm:text-left">
                    <div>
                        <p class="text-[10px] uppercase font-semibold text-on-surface-variant tracking-wider">KM Realizada</p>
                        <p class="text-xs font-bold text-on-surface mt-0.5">${(m.km || 0).toLocaleString('pt-BR')} km</p>
                    </div>
                    <div>
                        <p class="text-[10px] uppercase font-semibold text-on-surface-variant tracking-wider">Próxima Troca</p>
                        <p class="text-xs font-bold text-on-surface mt-0.5">${nextKmStr}</p>
                    </div>
                    <div>
                        <p class="text-[10px] uppercase font-semibold text-on-surface-variant tracking-wider">Intervalo</p>
                        <p class="text-xs font-bold text-on-surface mt-0.5">${intervalStr}</p>
                    </div>
                </div>

                <!-- Bottom Footer Row: KM Restante Indicator & Action Buttons (Edit + Delete) -->
                <div class="flex items-center justify-between pt-1">
                    <div class="flex items-center gap-2">
                        <span class="text-[11px] font-semibold text-on-surface-variant">Vencimento:</span>
                        <span class="text-xs font-bold px-2 py-0.5 rounded-md ${isConcluido ? 'bg-white/5 text-on-surface-variant border border-white/10' : isVencida ? 'bg-tertiary/20 text-tertiary border border-tertiary/30 animate-pulse' : 'bg-amber-400/15 text-amber-300 border border-amber-400/30'}">
                            ${kmRemaining}
                        </span>
                    </div>

                    <div class="flex items-center gap-2">
                        <button onclick="vcEditMaint('${m.id}')" 
                            class="text-xs text-primary hover:bg-primary/10 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all active:scale-95">
                            <span class="material-symbols-outlined text-sm">edit</span>
                            <span>Editar</span>
                        </button>
                        <button onclick="vcDeleteMaint('${m.id}')" 
                            class="text-xs text-tertiary hover:bg-tertiary/10 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all active:scale-95">
                            <span class="material-symbols-outlined text-sm">delete</span>
                            <span>Excluir</span>
                        </button>
                    </div>
                </div>
            `;
            }
            list.appendChild(div);
        });
    }
}

// ============================================================
// FUEL FORM
// ============================================================
async function vcSubmitFuel(e) {
    e.preventDefault();
    if (!vState.activeVehicleId || !vState.vehicles || vState.vehicles.length === 0) {
        alert('Operação negada: É necessário cadastrar um veículo antes de lançar abastecimentos.');
        vcOpenVehicleModal();
        return;
    }

    const btn = e.target.querySelector('button[type="submit"]');
    const oriText = btn.textContent;
    btn.textContent = 'Salvando...';
    btn.disabled = true;

    const date = document.getElementById('vc-fuel-date').value;
    const type = document.getElementById('vc-fuel-type').value;
    const station = document.getElementById('vc-fuel-station').value || 'Não informado';
    const km = parseInt(document.getElementById('vc-fuel-km').value) || 0;
    const liters = parseFloat(document.getElementById('vc-fuel-liters').value) || 0;
    const total = parseFloat(document.getElementById('vc-fuel-total').value) || 0;
    const obs = document.getElementById('vc-fuel-obs')?.value || '';

    if (vState.editingFuelId) {
        const { data, error } = await vcDb.fuel.update(vState.editingFuelId, { date: date + 'T12:00:00Z', type, station, km, liters, total, obs });
        if (error) { alert('Erro ao editar: ' + error.message); }
        else if (data && data.length > 0) {
            const idx = vState.fuelLogs.findIndex(l => l.id === vState.editingFuelId);
            if (idx !== -1) { vState.fuelLogs[idx] = { ...data[0], vehicleId: data[0].vehicle_id }; }
        }
        vState.editingFuelId = null;
    } else {
        const newLog = { vehicle_id: vState.activeVehicleId, date: date + 'T12:00:00Z', type, station, km, liters, total, obs, consumption: 0 };
        const { data, error } = await vcDb.fuel.add(newLog);
        if (error) { alert('Erro ao salvar: ' + error.message); }
        else if (data && data.length > 0) {
            vState.fuelLogs.unshift({ ...data[0], vehicleId: data[0].vehicle_id });
        }
    }

    // Update vehicle KM
    await vcUpdateVehicleKm(km);
    vcRecalculateConsumptions();
    btn.textContent = oriText;
    btn.disabled = false;
    e.target.reset();
    document.getElementById('vc-fuel-date').value = new Date().toISOString().split('T')[0];

    // Reset button text in case it was in edit mode
    const fuelSubmitBtn = document.querySelector('#vc-form-fuel button[type="submit"]');
    if (fuelSubmitBtn) fuelSubmitBtn.innerHTML = '<span class="material-symbols-outlined text-lg">save</span> Salvar Abastecimento';

    // Switch tab to fuel first then switch view
    vcSwitchHistoryTab('fuel');
    vcSwitchView('vc-history');
}

async function vcUpdateVehicleKm(newKm) {
    const veh = vState.vehicles.find(v => v.id === vState.activeVehicleId);
    if (!veh) return;
    const allKms = vState.fuelLogs.filter(l => l.vehicleId === vState.activeVehicleId).map(l => l.km || 0);
    const maxKm = allKms.length > 0 ? Math.max(...allKms, newKm) : newKm;
    if (maxKm > (veh.km_actual || 0)) {
        veh.km_actual = maxKm;
        await vcDb.vehicles.update(veh.id, { km_actual: maxKm });
    }
}

function vcRecalculateConsumptions() {
    const vehicleFuelLogs = vState.fuelLogs.filter(l => String(l.vehicleId) === String(vState.activeVehicleId));
    // Sort chronologically ascending (oldest first) by date / KM to calculate distance driven
    const sorted = [...vehicleFuelLogs].sort((a, b) => {
        const timeA = new Date(a.date).getTime() || 0;
        const timeB = new Date(b.date).getTime() || 0;
        if (timeA !== timeB) return timeA - timeB;
        return (a.km || 0) - (b.km || 0);
    });

    for (let i = 0; i < sorted.length; i++) {
        if (i > 0) {
            const prev = sorted[i - 1];
            const kmDriven = (sorted[i].km || 0) - (prev.km || 0);
            sorted[i].kmDriven = kmDriven > 0 ? kmDriven : 0;
            sorted[i].consumption = (kmDriven > 0 && sorted[i].liters > 0) ? kmDriven / sorted[i].liters : 0;
        } else {
            sorted[i].kmDriven = 0;
            sorted[i].consumption = 0;
        }
    }

    // Update vState.fuelLogs map with calculated properties
    const calculatedMap = new Map(sorted.map(item => [item.id, item]));
    vState.fuelLogs = vState.fuelLogs.map(l => calculatedMap.get(l.id) || l);
}

function vcEditFuel(id) {
    const log = vState.fuelLogs.find(l => l.id === id);
    if (!log) return;
    vState.editingFuelId = id;
    vcSwitchView('vc-fuel-form');

    const dateVal = log.date ? String(log.date).split('T')[0] : new Date().toISOString().split('T')[0];
    document.getElementById('vc-fuel-date').value = dateVal;
    document.getElementById('vc-fuel-type').value = log.type || '';
    document.getElementById('vc-fuel-station').value = log.station || '';
    document.getElementById('vc-fuel-km').value = log.km || 0;
    document.getElementById('vc-fuel-liters').value = log.liters || 0;
    document.getElementById('vc-fuel-total').value = log.total || 0;
    if (document.getElementById('vc-fuel-obs')) document.getElementById('vc-fuel-obs').value = log.obs || '';

    const btn = document.querySelector('#vc-form-fuel button[type="submit"]');
    if (btn) btn.innerHTML = '<span class="material-symbols-outlined text-lg">save</span> Atualizar Abastecimento';
}

// ============================================================
// OCR RECEIPT SCANNER ENGINE (Tesseract.js)
// ============================================================
async function vcHandleOcrImageSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const container = document.getElementById('vc-ocr-progress-container');
    const statusText = document.getElementById('vc-ocr-status-text');
    const percentText = document.getElementById('vc-ocr-percent-text');
    const progressBar = document.getElementById('vc-ocr-progress-bar');

    if (container) container.classList.remove('hidden');
    if (progressBar) progressBar.style.width = '0%';
    if (percentText) percentText.textContent = '0%';

    try {
        if (typeof Tesseract === 'undefined') {
            throw new Error('Biblioteca Tesseract.js não foi carregada.');
        }

        if (statusText) statusText.innerHTML = `<span class="material-symbols-outlined text-sm animate-spin">sync</span> Otimizando foto...`;

        // 1. Resize & Compress image via Canvas (1800px provides crisp detail for small receipt text like "13.53 M3")
        const compressedBlob = await vcCompressImageForOcr(file, 1800);

        if (statusText) statusText.innerHTML = `<span class="material-symbols-outlined text-sm animate-spin">sync</span> Carregando motor OCR...`;

        // 2. Run Tesseract Worker
        const worker = await Tesseract.createWorker('por', 1, {
            logger: m => {
                if (m.status === 'recognizing text') {
                    const pct = Math.round((m.progress || 0) * 100);
                    if (progressBar) progressBar.style.width = `${pct}%`;
                    if (percentText) percentText.textContent = `${pct}%`;
                    if (statusText) statusText.innerHTML = `<span class="material-symbols-outlined text-sm animate-spin">sync</span> Lendo texto (${pct}%)...`;
                } else if (statusText) {
                    statusText.innerHTML = `<span class="material-symbols-outlined text-sm animate-spin">sync</span> Preparando leitura...`;
                }
            }
        });

        const { data: { text } } = await worker.recognize(compressedBlob);
        await worker.terminate();

        console.log('[OCR Result Raw Text]:\n', text);
        const extracted = vcExtractFuelDataFromText(text);

        // Populate fields
        let filledCount = 0;

        if (extracted.total) {
            const el = document.getElementById('vc-fuel-total');
            if (el) { el.value = extracted.total; el.classList.add('ring-2', 'ring-secondary-container'); setTimeout(() => el.classList.remove('ring-2', 'ring-secondary-container'), 3000); }
            filledCount++;
        }
        if (extracted.liters) {
            const el = document.getElementById('vc-fuel-liters');
            if (el) { el.value = extracted.liters; el.classList.add('ring-2', 'ring-secondary-container'); setTimeout(() => el.classList.remove('ring-2', 'ring-secondary-container'), 3000); }
            filledCount++;
        }
        if (extracted.type) {
            const el = document.getElementById('vc-fuel-type');
            if (el) { el.value = extracted.type; }
            filledCount++;
        }
        if (extracted.station) {
            const el = document.getElementById('vc-fuel-station');
            if (el) { el.value = extracted.station; }
            filledCount++;
        }
        if (extracted.km) {
            const el = document.getElementById('vc-fuel-km');
            if (el) { el.value = extracted.km; }
            filledCount++;
        }

        if (statusText) {
            statusText.innerHTML = `<span class="material-symbols-outlined text-sm text-emerald-400">check_circle</span> [BETA] ${filledCount > 0 ? `${filledCount} dados identificados. Confira os valores!` : 'Leitura em testes. Confira os valores.'}`;
        }
    } catch (err) {
        console.error('[OCR Error]:', err);
        alert('Não foi possível ler todos os dados da foto automaticamente. Preencha os campos manualmente.');
        if (statusText) statusText.innerHTML = `<span class="material-symbols-outlined text-sm text-tertiary">error</span> Erro na leitura`;
    } finally {
        event.target.value = '';
        setTimeout(() => {
            if (container) container.classList.add('hidden');
        }, 5000);
    }
}

/**
 * Robust RegEx extractor for Fuel Receipt text
 */
function vcExtractFuelDataFromText(rawText) {
    const text = rawText.toUpperCase();
    const result = { total: null, liters: null, type: null, station: null, km: null };

    // 1. Total Price (R$)
    // Looks specifically for "VALOR TOTAL R$ 53,58" or "VALOR TOTAL R$ 53.58" avoiding tax percentages like 0,75 (1,39%)
    const totalMatch = text.match(/VALOR\s*TOTAL\s*R?\$?\s*(\d+[.,]\d{2})/i)
                    || text.match(/TOTAL\s*R\$?\s*(\d+[.,]\d{2})/i)
                    || text.match(/SUBTOTAL\s*R\$?\s*(\d+[.,]\d{2})/i);
    if (totalMatch) {
        result.total = parseFloat(totalMatch[1].replace(',', '.'));
    }

    // 2. Liters / Quantity / M3 (Matches "13.53 M3" or "QTDE 13.53" or "13.53 UN")
    const litersMatch = text.match(/(\d+[.,]\d{2,3})\s*(?:M3|UN|L|LTS?|LITROS?)/i)
                     || text.match(/(?:QTDE?|QTD|VOL(?:UME)?)\.?\s*[:=]?\s*(\d+[.,]\d{2,3})/i);
    if (litersMatch) {
        result.liters = parseFloat(litersMatch[1].replace(',', '.'));
    }

    // 3. Fuel Type (GNV, Gasolina Comum, Gasolina Aditivada, Etanol, Diesel)
    if (text.includes('GNV') || text.includes('GAS NATURAL') || text.includes('M3') || text.includes('220101005')) {
        result.type = 'GNV';
    } else if (text.includes('ADITIVADA') || text.includes('ADIT')) {
        result.type = 'Gasolina Aditivada';
    } else if (text.includes('ETANOL') || text.includes('ALCOOL') || text.includes('ÁLCOOL')) {
        result.type = 'Etanol';
    } else if (text.includes('DIESEL')) {
        result.type = 'Diesel';
    } else if (text.includes('GASOLINA') || text.includes('GAS')) {
        result.type = 'Gasolina Comum';
    }

    // 4. Station Name (Clean header line ignoring noise like H$SETSEASAA)
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 5);
    for (const l of lines.slice(0, 5)) {
        if ((l.includes('POSTO') || l.includes('LTDA') || l.includes('SHELL') || l.includes('IPIRANGA') || l.includes('PETROBRAS') || l.includes('AUTO') || l.includes('RODOGAS'))
            && !l.includes('FEDERAL') && !l.includes('MUNICIPAL')) {
            result.station = l.replace(/[^A-Z0-9\s]/g, '').trim().substring(0, 35);
            break;
        }
    }

    // 5. KM (Matches "KM: 111965", "KM 111965", "ODOMETRO")
    const kmMatch = text.match(/(?:KM|ODOMETRO|ODÔMETRO)\s*[:=]?\s*(\d{4,7})/i) 
                 || text.match(/-\s*KM\s*[:=]?\s*(\d{4,7})/i);
    if (kmMatch) {
        result.km = parseInt(kmMatch[1]);
    }

    return result;
}

/**
 * Fast client-side Canvas compressor for OCR
 * Resizes 12MB+ phone camera photos down to 1000px width in milliseconds
 */
function vcCompressImageForOcr(file, maxDimension = 1000) {
    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            let width = img.width;
            let height = img.height;

            if (width > maxDimension || height > maxDimension) {
                if (width > height) {
                    height = Math.round((height * maxDimension) / width);
                    width = maxDimension;
                } else {
                    width = Math.round((width * maxDimension) / height);
                    height = maxDimension;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob((blob) => {
                resolve(blob || file);
            }, 'image/jpeg', 0.85);
        };
        img.onerror = () => resolve(file);
        img.src = url;
    });
}

// ============================================================
// BARCODE / QR CODE SCANNER ENGINE (Html5Qrcode)
// ============================================================
let html5QrCodeScannerInstance = null;

async function vcTriggerBarcodeScanner(mode = 'all') {
    const modal = document.getElementById('vc-barcode-modal');
    if (!modal) return;

    const titleEl = document.getElementById('vc-scanner-modal-title');
    const subEl = document.getElementById('vc-scanner-modal-sub');

    if (mode === 'qr') {
        if (titleEl) titleEl.textContent = 'Escanear QR Code NFC-e';
        if (subEl) subEl.textContent = 'Aponte a câmera para o QR Code da nota fiscal';
    } else if (mode === 'barcode') {
        if (titleEl) titleEl.textContent = 'Escanear Código de Barras DANFE';
        if (subEl) subEl.textContent = 'Aponte a câmera para o código de barras da nota';
    } else {
        if (titleEl) titleEl.textContent = 'Escanear QR Code / Código de Barras';
        if (subEl) subEl.textContent = 'Aponte a câmera para a nota fiscal';
    }

    modal.classList.remove('hidden');

    try {
        if (typeof Html5Qrcode === 'undefined') {
            alert('Leitor de Código de Barras/QR Code não foi carregado.');
            vcCloseBarcodeScanner();
            return;
        }

        html5QrCodeScannerInstance = new Html5Qrcode("vc-barcode-reader");
        const config = { 
            fps: 30,
            aspectRatio: 1.0,
            experimentalFeatures: {
                useBarCodeDetectorIfSupported: true
            }
        };

        await html5QrCodeScannerInstance.start(
            { facingMode: "environment" },
            config,
            (decodedText, decodedResult) => {
                console.log('[Barcode/QR Scanned Raw]:', decodedText);
                vcProcessScannedBarcode(decodedText);
                vcCloseBarcodeScanner();
            },
            (errorMessage) => {
                // scanning errors, ignore
            }
        );
    } catch (err) {
        console.error('[Barcode/QR Camera Error]:', err);
        alert('Não foi possível acessar a câmera para escanear. Verifique as permissões do seu navegador.');
        vcCloseBarcodeScanner();
    }
}

async function vcCloseBarcodeScanner() {
    const modal = document.getElementById('vc-barcode-modal');
    if (modal) modal.classList.add('hidden');

    if (html5QrCodeScannerInstance) {
        try {
            await html5QrCodeScannerInstance.stop();
            html5QrCodeScannerInstance.clear();
        } catch (e) { }
        html5QrCodeScannerInstance = null;
    }
}

/**
 * Parses DANFE Access Key (44 digits) or QR Code URL (NFC-e / Sefaz)
 */
function vcProcessScannedBarcode(scannedText) {
    let key = '';

    // Check for SEFAZ QR Code URL (e.g. http://.../consultarNFe.aspx?p=332608314585160001085500100005051491027744742 ou p=33260831458516000108|2|...)
    const urlMatch = scannedText.match(/(?:p=|chave=|chNFe=)(\d{44})/i) 
                  || scannedText.match(/(\d{44})/);
                  
    if (urlMatch) {
        key = urlMatch[1];
    } else {
        // Direct numeric barcode or piped format in QR Code (e.g. 33260831458516000108...)
        const rawDigits = scannedText.replace(/\D/g, '');
        if (rawDigits.length >= 44) {
            key = rawDigits.substring(0, 44);
        }
    }

    if (!key) {
        alert('Texto/Código lido: ' + scannedText.substring(0, 50) + '...\nNão foi possível extrair a chave de 44 dígitos da nota fiscal.');
        return;
    }

    console.log('[DANFE / NFC-e Key Extracted]:', key);

    // Decode DANFE Key structure:
    // Digits 0..2: UF (33 = RJ)
    // Digits 2..6: AAMM (e.g. 2608 = Ano 2026, Mês 08)
    // Digits 6..20: CNPJ Emitente

    const year = '20' + key.substring(2, 4);
    const month = key.substring(4, 6);
    
    // Set date if month and year are valid
    if (parseInt(month) >= 1 && parseInt(month) <= 12) {
        const elDate = document.getElementById('vc-fuel-date');
        if (elDate && !elDate.value) {
            elDate.value = `${year}-${month}-01`;
        }
    }

    alert(`✅ Nota Fiscal / QR Code lido com sucesso!\nChave NFe/NFC-e: ${key}\nPeríodo da nota: ${month}/${year}`);
}

async function vcDeleteFuel(id) {
    if (!confirm('Excluir este abastecimento?')) return;
    const { error } = await vcDb.fuel.delete(id);
    if (error) { alert('Erro ao excluir: ' + error.message); return; }
    vState.fuelLogs = vState.fuelLogs.filter(l => l.id !== id);
    vcRecalculateConsumptions();
    vcRenderHistory();
    vcRenderDashboard();
}

// ============================================================
// MAINTENANCE FORM
// ============================================================
function vcToggleControlNextExchange() {
    const isChecked = document.getElementById('vc-maint-control-next')?.checked;
    const container = document.getElementById('vc-maint-recurrence-container');
    if (container) container.style.display = isChecked ? 'block' : 'none';
}

function vcToggleWarrantyFields() {
    const isChecked = document.getElementById('vc-maint-has-warranty')?.checked;
    const container = document.getElementById('vc-maint-warranty-container');
    if (container) container.style.display = isChecked ? 'block' : 'none';
}

function vcCalculateNextMaint() {
    const km = parseInt(document.getElementById('vc-maint-km').value) || 0;
    const interval = parseInt(document.getElementById('vc-maint-interval-val').value) || 0;
    const type = document.getElementById('vc-maint-interval-type').value;
    if (type === 'km') {
        document.getElementById('vc-maint-next').value = km + interval;
    }
}

function vcToggleMaintIntervalFields() {
    const type = document.getElementById('vc-maint-interval-type').value;
    const kmFields = document.getElementById('vc-maint-fields-km');
    const dateFields = document.getElementById('vc-maint-fields-date');
    if (kmFields) kmFields.style.display = type === 'km' ? 'grid' : 'none';
    if (dateFields) dateFields.style.display = type === 'date' ? 'block' : 'none';
    vcCalculateNextMaint();
}

async function vcSubmitMaint(e) {
    e.preventDefault();
    if (!vState.activeVehicleId || !vState.vehicles || vState.vehicles.length === 0) {
        alert('Operação negada: É necessário cadastrar um veículo antes de lançar manutenções.');
        vcOpenVehicleModal();
        return;
    }

    const btn = e.target.querySelector('button[type="submit"]');
    const oriText = btn.textContent;
    btn.textContent = 'Salvando...';
    btn.disabled = true;

    const date = document.getElementById('vc-maint-date').value;
    const station = document.getElementById('vc-maint-station').value || 'Não informado';
    const type = document.getElementById('vc-maint-type').value;
    const km = parseInt(document.getElementById('vc-maint-km').value) || 0;
    const cost = parseFloat(document.getElementById('vc-maint-cost').value || 0);
    const obs = document.getElementById('vc-maint-obs').value || '';
    
    const controlNext = document.getElementById('vc-maint-control-next')?.checked ?? true;
    const intervalType = controlNext ? document.getElementById('vc-maint-interval-type').value : 'none';

    let nextKM = null, nextDate = null, intervalVal = null;
    if (controlNext) {
        if (intervalType === 'km') {
            intervalVal = parseInt(document.getElementById('vc-maint-interval-val').value) || 0;
            nextKM = km + intervalVal;
        } else if (intervalType === 'date') {
            nextDate = document.getElementById('vc-maint-next-date').value || null;
        }
    }

    const hasWarranty = document.getElementById('vc-maint-has-warranty')?.checked ?? false;
    const warrantyMonths = hasWarranty ? (parseInt(document.getElementById('vc-maint-warranty-months').value) || 0) : 0;

    const logData = {
        vehicle_id: vState.activeVehicleId,
        date: date + 'T12:00:00Z', type, station, km, cost, obs,
        interval_type: intervalType, interval_val: intervalVal,
        next_km: nextKM, next_date: nextDate, status: 'pendente',
        has_warranty: hasWarranty, warranty_months: warrantyMonths,
        control_next_exchange: controlNext
    };

    if (vState.editingMaintId) {
        const { data, error } = await vcDb.maintenance.update(vState.editingMaintId, logData);
        if (error) { alert('Erro ao editar: ' + error.message); }
        else if (data && data.length > 0) {
            const idx = vState.maintenanceLogs.findIndex(m => m.id === vState.editingMaintId);
            const mapped = { 
                ...data[0], 
                vehicleId: data[0].vehicle_id, 
                intervalType: data[0].interval_type, 
                intervalVal: data[0].interval_val, 
                next: data[0].next_km, 
                nextDate: data[0].next_date, 
                status: data[0].status || 'pendente',
                hasWarranty: data[0].has_warranty ?? false,
                warrantyMonths: data[0].warranty_months || 0,
                controlNextExchange: data[0].control_next_exchange ?? true
            };
            if (idx !== -1) vState.maintenanceLogs[idx] = mapped;
        }
        vState.editingMaintId = null;
    } else {
        const { data, error } = await vcDb.maintenance.add(logData);
        if (error) { alert('Erro ao salvar: ' + error.message); }
        else if (data && data.length > 0) {
            const mapped = { 
                ...data[0], 
                vehicleId: data[0].vehicle_id, 
                intervalType: data[0].interval_type, 
                intervalVal: data[0].interval_val, 
                next: data[0].next_km, 
                nextDate: data[0].next_date, 
                status: data[0].status || 'pendente',
                hasWarranty: data[0].has_warranty ?? false,
                warrantyMonths: data[0].warranty_months || 0,
                controlNextExchange: data[0].control_next_exchange ?? true
            };
            vState.maintenanceLogs.unshift(mapped);
        }
    }

    // Update KM
    const veh = vState.vehicles.find(v => v.id === vState.activeVehicleId);
    if (veh && km > (veh.km_actual || 0)) {
        veh.km_actual = km;
        await vcDb.vehicles.update(veh.id, { km_actual: km });
    }

    btn.textContent = oriText;
    btn.disabled = false;
    e.target.reset();
    document.getElementById('vc-maint-date').value = new Date().toISOString().split('T')[0];
    vcToggleControlNextExchange();
    vcToggleWarrantyFields();
    vcToggleMaintIntervalFields();

    // Reset button text in case it was in edit mode
    const maintSubmitBtn = document.querySelector('#vc-form-maint button[type="submit"]');
    if (maintSubmitBtn) maintSubmitBtn.innerHTML = '<span class="material-symbols-outlined text-lg">save</span> Salvar Manutenção';

    // Switch tab to maintenance first then switch view
    vcSwitchHistoryTab('maintenance');
    vcSwitchView('vc-history');
}

async function vcToggleMaintStatus(id) {
    const m = vState.maintenanceLogs.find(log => log.id === id);
    if (!m) return;
    const newStatus = m.status === 'concluido' ? 'pendente' : 'concluido';
    const { error } = await vcDb.maintenance.update(id, { status: newStatus });
    if (error) { alert('Erro: ' + error.message); return; }
    m.status = newStatus;
    vcRenderHistory();
    vcRenderDashboard();
}

function vcEditMaint(id) {
    const m = vState.maintenanceLogs.find(log => log.id === id);
    if (!m) return;
    vState.editingMaintId = id;
    vcSwitchView('vc-maint-form');

    const dateVal = m.date ? String(m.date).split('T')[0] : new Date().toISOString().split('T')[0];
    document.getElementById('vc-maint-date').value = dateVal;
    document.getElementById('vc-maint-km').value = m.km || 0;
    document.getElementById('vc-maint-type').value = m.type || '';
    document.getElementById('vc-maint-station').value = m.station || '';
    document.getElementById('vc-maint-cost').value = m.cost || 0;
    document.getElementById('vc-maint-obs').value = m.obs || '';

    // Control next exchange
    const controlNextEl = document.getElementById('vc-maint-control-next');
    if (controlNextEl) controlNextEl.checked = m.controlNextExchange ?? true;
    vcToggleControlNextExchange();

    const intervalType = m.intervalType || 'none';
    document.getElementById('vc-maint-interval-type').value = intervalType;
    vcToggleMaintIntervalFields();

    if (intervalType === 'km') {
        document.getElementById('vc-maint-interval-val').value = m.intervalVal || 0;
        document.getElementById('vc-maint-next').value = m.next || (m.km + (m.intervalVal || 0));
    } else if (intervalType === 'date' && m.nextDate) {
        document.getElementById('vc-maint-next-date').value = String(m.nextDate).split('T')[0];
    }

    // Warranty
    const hasWarrantyEl = document.getElementById('vc-maint-has-warranty');
    if (hasWarrantyEl) hasWarrantyEl.checked = m.hasWarranty ?? false;
    vcToggleWarrantyFields();
    document.getElementById('vc-maint-warranty-months').value = m.warrantyMonths || 0;

    const btn = document.querySelector('#vc-form-maint button[type="submit"]');
    if (btn) btn.innerHTML = '<span class="material-symbols-outlined text-lg">save</span> Atualizar Manutenção';
}

async function vcDeleteMaint(id) {
    if (!confirm('Excluir esta manutenção?')) return;
    const { error } = await vcDb.maintenance.delete(id);
    if (error) { alert('Erro ao excluir: ' + error.message); return; }
    vState.maintenanceLogs = vState.maintenanceLogs.filter(m => m.id !== id);
    vcRenderHistory();
    vcRenderDashboard();
}

// ============================================================
// VEHICLE MODAL (ADD/EDIT & LIMIT)
// ============================================================
function vcOpenVehicleLimitModal() {
    const modal = document.getElementById('vc-vehicle-limit-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('open'), 10);
}

function vcCloseVehicleLimitModal() {
    const modal = document.getElementById('vc-vehicle-limit-modal');
    if (!modal) return;
    modal.classList.remove('open');
    setTimeout(() => modal.style.display = 'none', 300);
}

function vcContactSupportForVehicleLimit() {
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

    const msg = `Olá! Sou *${userName}*${userEmail}. Atingi o limite de 2 veículos cadastrados no Mapa.OS e gostaria de solicitar um upgrade de plano ou inclusão adicional de veículo.`;
    const encodedMsg = encodeURIComponent(msg);
    const waUrl = `https://wa.me/5524992716045?text=${encodedMsg}`;
    
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    vcCloseVehicleLimitModal();
}

function vcOpenVehicleModal(vehicleId = null) {
    if (typeof vehicleId !== 'string' && typeof vehicleId !== 'number') {
        vehicleId = null;
    }

    // Check vehicle limit (max 2 vehicles per account) when adding a new vehicle
    if (!vehicleId && vState.vehicles && vState.vehicles.length >= 2) {
        vcCloseVehiclePicker();
        vcOpenVehicleLimitModal();
        return;
    }

    const modal = document.getElementById('vc-vehicle-modal');
    if (!modal) return;
    const form = document.getElementById('vc-form-vehicle');
    form.reset();
    document.getElementById('vc-veh-id').value = '';
    document.getElementById('vc-veh-modal-title').textContent = 'Novo Veículo';

    const deleteBtn = document.getElementById('vc-veh-delete-btn');
    if (deleteBtn) deleteBtn.style.display = 'none';

    if (vehicleId) {
        const veh = vState.vehicles.find(v => String(v.id) === String(vehicleId));
        if (veh) {
            document.getElementById('vc-veh-id').value = veh.id;
            document.getElementById('vc-veh-model').value = veh.model || '';
            document.getElementById('vc-veh-plate').value = veh.plate || '';
            document.getElementById('vc-veh-year').value = veh.year || '';
            document.getElementById('vc-veh-color').value = veh.color || '';
            document.getElementById('vc-veh-motor').value = veh.motor || '';
            document.getElementById('vc-veh-renavam').value = veh.renavam || '';
            document.getElementById('vc-veh-chassi').value = veh.chassi || '';
            document.getElementById('vc-veh-km').value = veh.initial_km || veh.km_actual || 0;
            document.getElementById('vc-veh-obs').value = veh.obs || '';
            document.getElementById('vc-veh-modal-title').textContent = 'Editar Veículo';
            if (deleteBtn) deleteBtn.style.display = 'flex';
        }
    }
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('open'), 10);
}

function vcCloseVehicleModal() {
    const modal = document.getElementById('vc-vehicle-modal');
    if (!modal) return;
    modal.classList.remove('open');
    setTimeout(() => modal.style.display = 'none', 300);
}

function vcTriggerDeleteFromModal() {
    const id = document.getElementById('vc-veh-id').value;
    if (id) {
        vcCloseVehicleModal();
        vcOpenDeleteConfirmModal(id);
    }
}

// ============================================================
// VEHICLE DELETE CONFIRMATION (6-DIGIT CODE)
// ============================================================
let vcDeleteConfirmCodeState = null;

function vcOpenDeleteConfirmModal(vehicleId) {
    const veh = vState.vehicles.find(v => String(v.id) === String(vehicleId));
    if (!veh) return;

    // Generate random 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    vcDeleteConfirmCodeState = code;

    document.getElementById('vc-delete-veh-id').value = veh.id;
    const nameEl = document.getElementById('vc-delete-veh-name');
    if (nameEl) nameEl.textContent = `${veh.model} (${veh.plate})`;

    const displayEl = document.getElementById('vc-delete-code-display');
    if (displayEl) displayEl.textContent = code;

    const inputEl = document.getElementById('vc-delete-code-input');
    if (inputEl) {
        inputEl.value = '';
    }

    const confirmBtn = document.getElementById('vc-btn-confirm-delete');
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.classList.add('opacity-50', 'cursor-not-allowed');
        confirmBtn.innerHTML = '<span class="material-symbols-outlined text-lg">delete_forever</span> Excluir Definitivamente';
    }

    const modal = document.getElementById('vc-delete-confirm-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('open'), 10);
}

function vcCloseDeleteConfirmModal() {
    vcDeleteConfirmCodeState = null;
    const modal = document.getElementById('vc-delete-confirm-modal');
    if (!modal) return;
    modal.classList.remove('open');
    setTimeout(() => modal.style.display = 'none', 300);
}

function vcVerifyDeleteCodeInput() {
    const inputEl = document.getElementById('vc-delete-code-input');
    const confirmBtn = document.getElementById('vc-btn-confirm-delete');
    if (!inputEl || !confirmBtn) return;

    const typedCode = inputEl.value.trim();
    if (typedCode === vcDeleteConfirmCodeState) {
        confirmBtn.disabled = false;
        confirmBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    } else {
        confirmBtn.disabled = true;
        confirmBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }
}

async function vcExecuteDeleteVehicle() {
    const id = document.getElementById('vc-delete-veh-id').value;
    const inputEl = document.getElementById('vc-delete-code-input');
    
    if (!id) return;
    if (inputEl.value.trim() !== vcDeleteConfirmCodeState) {
        alert('Código de confirmação incorreto.');
        return;
    }

    const btn = document.getElementById('vc-btn-confirm-delete');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Excluindo...';
    }

    const { error } = await vcDb.vehicles.delete(id);
    if (error) {
        alert('Erro ao excluir veículo: ' + error.message);
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<span class="material-symbols-outlined text-lg">delete_forever</span> Excluir Definitivamente';
        }
        return;
    }

    // Update local state
    vState.vehicles = vState.vehicles.filter(v => String(v.id) !== String(id));
    vState.fuelLogs = vState.fuelLogs.filter(l => String(l.vehicleId) !== String(id));
    vState.maintenanceLogs = vState.maintenanceLogs.filter(m => String(m.vehicleId) !== String(id));

    if (String(vState.activeVehicleId) === String(id)) {
        vState.activeVehicleId = vState.vehicles.length > 0 ? vState.vehicles[0].id : null;
        localStorage.setItem('vc_active_vehicle_id', vState.activeVehicleId || '');
    }

    vcCloseDeleteConfirmModal();
    vcCloseVehicleModal();
    vcCloseVehiclePicker();
    vcUpdateVehicleHeader();
    vcRenderVehiclePickerList();
    vcRecalculateConsumptions();
    vcRenderDashboard();

    alert('Veículo e todos os dados associados foram excluídos com sucesso.');
}

async function vcSubmitVehicle(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const oriText = btn.textContent;
    btn.textContent = 'Salvando...';
    btn.disabled = true;

    const id = document.getElementById('vc-veh-id').value;

    if (!id && vState.vehicles && vState.vehicles.length >= 2) {
        btn.textContent = oriText;
        btn.disabled = false;
        vcCloseVehicleModal();
        vcOpenVehicleLimitModal();
        return;
    }

    const vData = {
        model: document.getElementById('vc-veh-model').value,
        plate: document.getElementById('vc-veh-plate').value.toUpperCase(),
        year: parseInt(document.getElementById('vc-veh-year').value) || null,
        color: document.getElementById('vc-veh-color').value,
        motor: document.getElementById('vc-veh-motor').value,
        renavam: document.getElementById('vc-veh-renavam').value,
        chassi: document.getElementById('vc-veh-chassi').value.toUpperCase(),
        initial_km: parseInt(document.getElementById('vc-veh-km').value) || 0,
        km_actual: parseInt(document.getElementById('vc-veh-km').value) || 0,
        obs: document.getElementById('vc-veh-obs').value
    };

    if (id) {
        const { data, error } = await vcDb.vehicles.update(id, vData);
        if (error) { alert('Erro ao atualizar: ' + error.message); }
        else if (data && data.length > 0) {
            const idx = vState.vehicles.findIndex(v => v.id === id);
            const sv = { ...data[0], initialKm: data[0].initial_km };
            if (idx !== -1) vState.vehicles[idx] = sv;
        }
    } else {
        const { data, error } = await vcDb.vehicles.add(vData);
        if (error) { alert('Erro ao cadastrar: ' + error.message); }
        else if (data && data.length > 0) {
            const sv = { ...data[0], initialKm: data[0].initial_km };
            vState.vehicles.push(sv);
            vState.activeVehicleId = sv.id;
            localStorage.setItem('vc_active_vehicle_id', sv.id);
        }
    }

    btn.textContent = oriText;
    btn.disabled = false;
    vcCloseVehicleModal();
    vcUpdateVehicleHeader();
    vcRenderVehiclePickerList();
    vcRenderDashboard();
}

async function vcDeleteVehicle(id) {
    vcOpenDeleteConfirmModal(id);
}

// ============================================================
// VEHICLE PICKER (SWITCHER)
// ============================================================
function vcOpenVehiclePicker() {
    const picker = document.getElementById('vc-vehicle-picker');
    if (!picker) return;
    vcRenderVehiclePickerList();
    picker.style.display = 'flex';
    setTimeout(() => picker.classList.add('open'), 10);
}

function vcCloseVehiclePicker() {
    const picker = document.getElementById('vc-vehicle-picker');
    if (!picker) return;
    picker.classList.remove('open');
    setTimeout(() => picker.style.display = 'none', 300);
}

function vcSwitchVehicle(id) {
    vState.activeVehicleId = id;
    localStorage.setItem('vc_active_vehicle_id', id);
    vcCloseVehiclePicker();
    vcUpdateVehicleHeader();
    vcRecalculateConsumptions();
    vcRenderDashboard();
}

function vcRenderVehiclePickerList() {
    const list = document.getElementById('vc-picker-list');
    if (!list) return;
    if (vState.vehicles.length === 0) {
        list.innerHTML = '<p class="text-xs text-on-surface-variant text-center py-4">Nenhum veículo cadastrado.</p>';
        return;
    }
    list.innerHTML = vState.vehicles.map(veh => {
        const isActive = veh.id === vState.activeVehicleId;
        return `
        <div onclick="vcSwitchVehicle('${veh.id}')" class="flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all mb-2.5 ${isActive ? 'bg-primary/10 border border-primary/35' : 'bg-white/5 border border-white/10 hover:bg-white/8'}">
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl ${isActive ? 'bg-primary/20 text-primary' : 'bg-white/10 text-on-surface-variant'} flex items-center justify-center">
                    <span class="material-symbols-outlined text-xl">directions_car</span>
                </div>
                <div>
                    <div class="flex items-center gap-2">
                        <p class="text-sm font-bold text-on-surface">${veh.model}</p>
                        ${isActive ? '<span class="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-semibold">Ativo</span>' : ''}
                    </div>
                    <p class="text-xs text-on-surface-variant font-mono mt-0.5">${veh.plate}</p>
                </div>
            </div>
            <div class="flex items-center gap-1.5" onclick="event.stopPropagation()">
                <button onclick="vcCloseVehiclePicker(); vcOpenVehicleModal('${veh.id}');" title="Editar"
                    class="w-8 h-8 rounded-lg bg-white/5 border border-white/10 hover:bg-white/15 text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-all">
                    <span class="material-symbols-outlined text-base">edit</span>
                </button>
                <button onclick="vcCloseVehiclePicker(); vcOpenDeleteConfirmModal('${veh.id}');" title="Excluir"
                    class="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-all">
                    <span class="material-symbols-outlined text-base">delete</span>
                </button>
            </div>
        </div>`;
    }).join('');
}

// ============================================================
// HISTORY QUICK ADD (from header + button)
// ============================================================
function vcAddNewFromHistory() {
    if (vState.historyTab === 'fuel') {
        vcSwitchView('vc-fuel-form');
    } else {
        vcSwitchView('vc-maint-form');
    }
}

// ============================================================
// DOM READY
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    // Wait for supabase to be ready
    const waitForSupabase = setInterval(() => {
        if (typeof supabaseClientInstance !== 'undefined' && supabaseClientInstance && typeof getLoggedUserId === 'function') {
            clearInterval(waitForSupabase);
            initVehicleModule();
        }
    }, 100);
    setTimeout(() => clearInterval(waitForSupabase), 8000);
});
