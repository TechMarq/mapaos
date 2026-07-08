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

// Log in a user (Checks if email exists and returns status)
async function dbLoginUser(email) {
    const formattedEmail = email.toLowerCase().trim();
    if (!supabaseClientInstance) {
        alert("Erro: Banco de dados não conectado. Configure as chaves nas configurações.");
        return { success: false };
    }
    
    try {
        const { data, error } = await supabaseClientInstance
            .from('profiles')
            .select('*')
            .eq('email', formattedEmail)
            .single();
            
        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is not found
        
        if (data) {
            localStorage.setItem('MAPAOS_LOGGED_USER', JSON.stringify(data));
            return { success: true, user: data };
        } else {
            // Auto-create as Pendente if logging in for the first time
            const newUser = await dbRegisterUser({
                name: formattedEmail.split('@')[0].toUpperCase(),
                email: formattedEmail,
                phone: '—'
            });
            return { success: true, user: newUser };
        }
    } catch (err) {
        console.error('Supabase login check error:', err);
        return { success: false };
    }
}

// Register a new user profile
async function dbRegisterUser(profile) {
    if (!supabaseClientInstance) return null;
    const formattedEmail = profile.email.toLowerCase().trim();
    const newProfile = {
        name: profile.name,
        email: formattedEmail,
        phone: profile.phone || '—',
        status: 'Pendente',
        role: 'User'
    };

    try {
        const { data, error } = await supabaseClientInstance
            .from('profiles')
            .insert([newProfile])
            .select()
            .single();
        if (error) throw error;
        return data;
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

// Approve a user profile
async function dbApproveUser(userId) {
    if (!supabaseClientInstance) return false;
    try {
        const { error } = await supabaseClientInstance
            .from('profiles')
            .update({ status: 'Aprovado' })
            .eq('id', userId);
        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Supabase approve profile error:', err);
        return false;
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
