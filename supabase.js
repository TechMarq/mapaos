// Supabase Integration Script for Mapa.OS
// This file manages database interactions directly using Supabase.

const SUPABASE_URL = (window.MAPAOS_ENV && window.MAPAOS_ENV.SUPABASE_URL) || localStorage.getItem('MAPAOS_SUPABASE_URL') || '';
const SUPABASE_KEY = (window.MAPAOS_ENV && window.MAPAOS_ENV.SUPABASE_KEY) || localStorage.getItem('MAPAOS_SUPABASE_KEY') || '';

let supabaseClientInstance = null;

if (SUPABASE_URL && SUPABASE_KEY && typeof supabase !== 'undefined') {
    try {
        supabaseClientInstance = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('Supabase initialized successfully!');
    } catch (err) {
        console.error('Failed to initialize Supabase:', err);
    }
} else {
    console.warn('Supabase URL/Key missing. Please configure them in Settings/Ajustes.');
}

// Helper to retrieve the current logged-in user ID
function getLoggedUserId() {
    try {
        const loggedUserRaw = localStorage.getItem('MAPAOS_LOGGED_USER');
        if (loggedUserRaw) {
            const user = JSON.parse(loggedUserRaw);
            return user ? user.id : null;
        }
    } catch (e) {
        console.error("Error reading logged user:", e);
    }
    return null;
}

// Helper to check if the current user is a Master administrator
function isLoggedUserMaster() {
    try {
        const loggedUserRaw = localStorage.getItem('MAPAOS_LOGGED_USER');
        if (loggedUserRaw) {
            const user = JSON.parse(loggedUserRaw);
            return user && user.role === 'Master';
        }
    } catch (e) {
        console.error("Error reading logged user role:", e);
    }
    return false;
}

// Helper to check if the current user's access has expired
function isUserAccessExpired() {
    try {
        const loggedUserRaw = localStorage.getItem('MAPAOS_LOGGED_USER');
        if (loggedUserRaw) {
            const user = JSON.parse(loggedUserRaw);
            if (user && user.role === 'Master') return false; // Master accounts never expire
            if (user && user.status === 'Expirado') return true;
            if (user && user.expires_at) {
                const expiryDate = new Date(user.expires_at);
                if (expiryDate < new Date()) {
                    return true;
                }
            }
        }
    } catch (e) {
        console.error("Error checking expiration status:", e);
    }
    return false;
}

// Fetch all reservations (isolated by user unless role is Master)
async function dbGetReservations() {
    if (!supabaseClientInstance) return [];
    try {
        const userId = getLoggedUserId();
        const isMaster = isLoggedUserMaster();
        
        let query = supabaseClientInstance
            .from('reservations')
            .select('*');
            
        if (userId && !isMaster) {
            query = query.eq('user_id', userId);
        }
        
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    } catch (err) {
        console.error('Supabase get error:', err);
        return [];
    }
}

// Create new reservation linked to the logged-in user
async function dbCreateReservation(reserva) {
    if (!supabaseClientInstance) return null;
    if (isUserAccessExpired()) {
        alert('Acesso Expirado! Seu período de acesso gratuito expirou. Por favor, regularize sua assinatura com o Administrador Master para registrar novas reservas.');
        return null;
    }
    try {
        const userId = getLoggedUserId();
        const resNum = reserva.reserva_number ? reserva.reserva_number.toString().trim() : '';
        
        if (!resNum) {
            alert('Erro: O número da reserva é obrigatório.');
            return null;
        }

        // Check if reserva_number already exists globally
        const { data: existing, error: checkError } = await supabaseClientInstance
            .from('reservations')
            .select('id')
            .eq('reserva_number', resNum)
            .limit(1);

        if (checkError) throw checkError;
        if (existing && existing.length > 0) {
            alert(`Erro: Já existe uma reserva cadastrada com o número "${resNum}".`);
            return null;
        }

        const { data, error } = await supabaseClientInstance
            .from('reservations')
            .insert([{
                user_id: userId,
                os_number: reserva.os_number,
                reserva_number: resNum,
                client_name: reserva.client_name,
                date: reserva.date,
                time: reserva.time,
                status: 'Pendente',
                value: '—',
                notes: reserva.notes || null
            }])
            .select();
        if (error) throw error;
        return data[0];
    } catch (err) {
        console.error('Supabase insert error:', err);
        alert('Erro ao salvar a reserva: ' + err.message);
        return null;
    }
}

// Delete a reservation by ID (ensures ownership unless Master)
async function dbDeleteReservation(reservaId) {
    if (!supabaseClientInstance) return false;
    if (isUserAccessExpired()) {
        alert('Acesso Expirado! Por favor, regularize sua assinatura com o Administrador Master.');
        return false;
    }
    try {
        const userId = getLoggedUserId();
        const isMaster = isLoggedUserMaster();
        
        let query = supabaseClientInstance
            .from('reservations')
            .delete()
            .eq('id', reservaId);
            
        if (userId && !isMaster) {
            query = query.eq('user_id', userId);
        }
        
        const { error } = await query;
        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Supabase delete reservation error:', err);
        return false;
    }
}

// Update an existing reservation details (ensures ownership unless Master)
async function dbUpdateReservation(reservaId, updates) {
    if (!supabaseClientInstance) return null;
    if (isUserAccessExpired()) {
        alert('Acesso Expirado! Seu período de acesso gratuito expirou. Por favor, regularize sua assinatura com o Administrador Master para editar reservas.');
        return null;
    }
    try {
        const userId = getLoggedUserId();
        const isMaster = isLoggedUserMaster();
        const resNum = updates.reserva_number ? updates.reserva_number.toString().trim() : '';

        if (!resNum) {
            alert('Erro: O número da reserva é obrigatório.');
            return null;
        }

        // Check if another reservation has the same reserva_number
        const { data: existing, error: checkError } = await supabaseClientInstance
            .from('reservations')
            .select('id')
            .eq('reserva_number', resNum)
            .neq('id', reservaId)
            .limit(1);

        if (checkError) throw checkError;
        if (existing && existing.length > 0) {
            alert(`Erro: Já existe outra reserva cadastrada com o número "${resNum}".`);
            return null;
        }
        
        let query = supabaseClientInstance
            .from('reservations')
            .update({
                client_name: updates.client_name,
                date: updates.date,
                time: updates.time,
                os_number: updates.os_number,
                reserva_number: resNum,
                notes: updates.notes || null
            })
            .eq('id', reservaId);
            
        if (userId && !isMaster) {
            query = query.eq('user_id', userId);
        }
        
        const { data, error } = await query.select();
        if (error) throw error;
        return data[0];
    } catch (err) {
        console.error('Supabase update reservation error:', err);
        alert('Erro ao atualizar a reserva: ' + err.message);
        return null;
    }
}

// Reconcile pending reservations with uploaded spreadsheet data
async function dbReconcileReservations(records) {
    if (!supabaseClientInstance || !records || records.length === 0) {
        return { success: false, error: 'Nenhum registro para conciliação.' };
    }
    if (isUserAccessExpired()) {
        return { success: false, error: 'Acesso Expirado! Por favor, regularize sua assinatura com o Administrador Master para conciliar reservas.' };
    }
    try {
        const userId = getLoggedUserId();
        const isMaster = isLoggedUserMaster();
        
        let query = supabaseClientInstance
            .from('reservations')
            .select('reserva_number, id, status');
            
        if (userId && !isMaster) {
            query = query.eq('user_id', userId);
        }
        
        // Fetch all existing reservations to cross-reference
        const { data: dbReservations, error: getErr } = await query;
        if (getErr) throw getErr;

        // Map existing reservation numbers (normalized)
        const dbResMap = new Map();
        dbReservations.forEach(item => {
            if (item.reserva_number) {
                const cleanedNum = item.reserva_number.toString().replace(/\D/g, '').trim();
                if (cleanedNum) {
                    dbResMap.set(cleanedNum, item);
                }
            }
        });

        // Pre-validate all spreadsheet rows: check if Reserva exists in database
        const missingReservations = [];
        for (const record of records) {
            const rawRes = record.reserva ? record.reserva.toString().trim() : '';
            if (!rawRes) continue; // Skip empty cells

            const cleanedRes = rawRes.replace(/\D/g, '').trim();
            // Skip actual header row or other text fields containing no digits
            if (!cleanedRes || rawRes.toLowerCase() === 'reserva') continue;

            if (!dbResMap.has(cleanedRes)) {
                missingReservations.push(rawRes);
            }
        }

        // If there are any missing reservations, ABORT the transaction and report them
        if (missingReservations.length > 0) {
            return {
                success: false,
                validationError: true,
                missing: missingReservations,
                error: `Importação Abortada: Algumas reservas na planilha não constam registradas no sistema.`
            };
        }

        // All matched! Now execute the update operations
        let reconciledCount = 0;
        for (const record of records) {
            const rawRes = record.reserva ? record.reserva.toString().trim() : '';
            if (!rawRes) continue;

            const cleanedRes = rawRes.replace(/\D/g, '').trim();
            if (!cleanedRes || rawRes.toLowerCase() === 'reserva') continue;

            const dbMatch = dbResMap.get(cleanedRes);
            if (dbMatch) {
                const totalVal = record.total || 0;
                const netVal = record.netValue || 0;
                const plateVal = record.plate ? record.plate.toString().trim() : '';
                const driverVal = record.driver ? record.driver.toString().trim() : '';

                const { error: updateErr } = await supabaseClientInstance
                    .from('reservations')
                    .update({
                        status: 'Paga',
                        value: totalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                        net_value: netVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                        plate: plateVal,
                        driver: driverVal
                    })
                    .eq('id', dbMatch.id);
                
                if (updateErr) {
                    console.error('Reconciliation update failed for reservation:', dbMatch.id, updateErr);
                    throw updateErr;
                }
                reconciledCount++;
            }
        }

        return { success: true, count: reconciledCount };
    } catch (err) {
        console.error('Supabase reconciliation error:', err);
        const errMsg = err.message || (typeof err === 'string' ? err : JSON.stringify(err));
        return { success: false, error: `Erro de banco de dados: ${errMsg}` };
    }
}

// Log in a user securely via Supabase Auth (GoTrue)
async function dbLoginUser(email, password) {
    const formattedEmail = email.toLowerCase().trim();
    if (!supabaseClientInstance) {
        alert("Erro: Banco de dados não conectado. Configure as chaves nas configurações.");
        return { success: false, error: 'Banco de dados desconectado.' };
    }
    
    try {
        // Native Supabase sign-in
        const { data: authData, error: authError } = await supabaseClientInstance.auth.signInWithPassword({
            email: formattedEmail,
            password: password
        });

        if (authError) {
            // Handle common translation to Portuguese
            let errMsg = authError.message;
            if (errMsg === 'Invalid login credentials') {
                errMsg = 'Email ou senha incorretos.';
            }
            return { success: false, error: errMsg };
        }

        const userId = authData.user.id;

        // Fetch corresponding profile for authorization status check
        const { data: profile, error: profileError } = await supabaseClientInstance
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (profileError || !profile) {
            // Create fallback profile row if missing (useful for migrated accounts)
            const fallbackProfile = {
                id: userId,
                name: formattedEmail.split('@')[0].toUpperCase(),
                email: formattedEmail,
                phone: '—',
                status: formattedEmail === 'master@mapaos.com' ? 'Aprovado' : 'Pendente',
                role: formattedEmail === 'master@mapaos.com' ? 'Master' : 'User'
            };
            const { data: newProfile } = await supabaseClientInstance
                .from('profiles')
                .insert([fallbackProfile])
                .select()
                .single();
            
            if (newProfile && newProfile.status === 'Pendente') {
                await supabaseClientInstance.auth.signOut();
                return { success: true, user: newProfile };
            }
            localStorage.setItem('MAPAOS_LOGGED_USER', JSON.stringify(newProfile || fallbackProfile));
            return { success: true, user: newProfile || fallbackProfile };
        }

        // Check if access has expired
        if (profile.status === 'Aprovado' && profile.expires_at) {
            const expiresAt = new Date(profile.expires_at);
            if (expiresAt < new Date()) {
                await supabaseClientInstance
                    .from('profiles')
                    .update({ status: 'Expirado' })
                    .eq('id', userId);
                profile.status = 'Expirado';
            }
        }

        // If not approved and not expired (e.g. Pendente or Rejeitado), sign out natively immediately
        if (profile.status !== 'Aprovado' && profile.status !== 'Expirado' && profile.role !== 'Master') {
            await supabaseClientInstance.auth.signOut();
            return { success: false, error: 'Seu cadastro está pendente de aprovação.' };
        }

        localStorage.setItem('MAPAOS_LOGGED_USER', JSON.stringify(profile));
        return { success: true, user: profile };

    } catch (err) {
        console.error('Supabase login check error:', err);
        return { success: false, error: 'Erro de conexão com o banco.' };
    }
}

// Register a new user profile securely via Supabase Auth
async function dbRegisterUser(profile) {
    if (!supabaseClientInstance) return null;
    const formattedEmail = profile.email.toLowerCase().trim();

    try {
        // 1. Native Supabase Sign Up (Creates secure encrypted credential under auth.users)
        const { data: authData, error: authError } = await supabaseClientInstance.auth.signUp({
            email: formattedEmail,
            password: profile.password,
            options: {
                data: {
                    name: profile.name,
                    phone: profile.phone || '—'
                }
            }
        });

        if (authError) throw authError;

        if (!authData || !authData.user) return null;

        const userId = authData.user.id;

        // 2. Populate public.profiles table using the native Auth UUID
        const newProfile = {
            id: userId, // Match same ID
            name: profile.name,
            email: formattedEmail,
            phone: profile.phone || '—',
            status: 'Pendente',
            role: 'User'
        };

        const { data: createdProfile, error: profileErr } = await supabaseClientInstance
            .from('profiles')
            .insert([newProfile])
            .select()
            .single();

        if (profileErr) throw profileErr;
        return createdProfile;

    } catch (err) {
        console.error('Supabase registration error:', err);
        return null;
    }
}

// Get all pending profiles
async function dbGetPendingUsers() {
    if (!supabaseClientInstance) return [];
    try {
        const { data, error } = await supabaseClientInstance
            .from('profiles')
            .select('*')
            .eq('status', 'Pendente');
        if (error) throw error;
        return data;
    } catch (err) {
        console.error('Supabase get pending profiles error:', err);
        return [];
    }
}

// Approve a user profile (sets expires_at = now + 30 days)
async function dbApproveUser(userId) {
    if (!supabaseClientInstance) return false;
    try {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        const { error } = await supabaseClientInstance
            .from('profiles')
            .update({ status: 'Aprovado', expires_at: expiresAt.toISOString() })
            .eq('id', userId);
        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Supabase approve profile error:', err);
        return false;
    }
}

// Renew a user profile access (+30 days from today)
async function dbRenewUser(userId) {
    if (!supabaseClientInstance) return false;
    try {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        const { error } = await supabaseClientInstance
            .from('profiles')
            .update({ status: 'Aprovado', expires_at: expiresAt.toISOString() })
            .eq('id', userId);
        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Supabase renew profile error:', err);
        return false;
    }
}

// Get ALL profiles (Master use only)
async function dbGetAllUsers() {
    if (!supabaseClientInstance) return [];
    try {
        const { data, error } = await supabaseClientInstance
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    } catch (err) {
        console.error('Supabase get all profiles error:', err);
        return [];
    }
}

// Reject/Delete a user profile
async function dbRejectUser(userId) {
    if (!supabaseClientInstance) return false;
    try {
        const { error } = await supabaseClientInstance
            .from('profiles')
            .delete()
            .eq('id', userId);
        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Supabase reject profile error:', err);
        return false;
    }
}

// Update a user profile name and phone
async function dbUpdateProfile(userId, updates) {
    if (!supabaseClientInstance) return false;
    try {
        const { error } = await supabaseClientInstance
            .from('profiles')
            .update({
                name: updates.name,
                phone: updates.phone
            })
            .eq('id', userId);
        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Supabase update profile error:', err);
        return false;
    }
}

// Fetch all clients sorted alphabetically
async function dbGetClients() {
    if (!supabaseClientInstance) return [];
    try {
        const { data, error } = await supabaseClientInstance
            .from('clients')
            .select('*')
            .order('name', { ascending: true });
        if (error) throw error;
        return data;
    } catch (err) {
        console.error('Supabase get clients error:', err);
        return [];
    }
}

// Create a new client (Master only)
async function dbCreateClient(name) {
    if (!supabaseClientInstance) return null;
    try {
        const { data, error } = await supabaseClientInstance
            .from('clients')
            .insert([{ name: name.trim().toUpperCase() }])
            .select();
        if (error) throw error;
        return data[0];
    } catch (err) {
        console.error('Supabase create client error:', err);
        alert('Erro ao cadastrar cliente: ' + (err.message || 'Já existe um cliente com este nome.'));
        return null;
    }
}

// Delete a client (Master only)
async function dbDeleteClient(id) {
    if (!supabaseClientInstance) return false;
    try {
        const { error } = await supabaseClientInstance
            .from('clients')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Supabase delete client error:', err);
        alert('Erro ao excluir cliente: ' + err.message);
        return false;
    }
}
