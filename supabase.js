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

// Fetch all reservations
async function dbGetReservations() {
    if (!supabaseClientInstance) return [];
    try {
        const { data, error } = await supabaseClientInstance
            .from('reservations')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    } catch (err) {
        console.error('Supabase get error:', err);
        return [];
    }
}

// Create new reservation
async function dbCreateReservation(reserva) {
    if (!supabaseClientInstance) return null;
    try {
        const { data, error } = await supabaseClientInstance
            .from('reservations')
            .insert([{
                os_number: reserva.os_number,
                reserva_number: reserva.reserva_number,
                client_name: reserva.client_name,
                date: reserva.date,
                time: reserva.time,
                status: 'Pendente',
                value: '—'
            }])
            .select();
        if (error) throw error;
        return data[0];
    } catch (err) {
        console.error('Supabase insert error:', err);
        return null;
    }
}

// Reconcile/liquidate all pending reservations
async function dbReconcileReservations() {
    if (!supabaseClientInstance) return 0;
    try {
        const { data: pendings, error: getErr } = await supabaseClientInstance
            .from('reservations')
            .select('id, os_number')
            .eq('status', 'Pendente');
        if (getErr) throw getErr;

        let updatedCount = 0;
        for (let item of pendings) {
            const simulatedVal = (Math.floor(Math.random() * 1200) + 300).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const { error: updErr } = await supabaseClientInstance
                .from('reservations')
                .update({ status: 'Paga', value: simulatedVal })
                .eq('id', item.id);
            if (!updErr) updatedCount++;
        }
        return updatedCount;
    } catch (err) {
        console.error('Supabase reconciliation error:', err);
        return 0;
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

        // If not approved, sign out natively immediately
        if (profile.status !== 'Aprovado' && profile.role !== 'Master') {
            await supabaseClientInstance.auth.signOut();
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
