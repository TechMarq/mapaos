// Supabase Integration Script for Mapa.OS
// This file manages database interactions. If Supabase config is missing, it falls back to LocalStorage.

const SUPABASE_URL = (window.MAPAOS_ENV && window.MAPAOS_ENV.SUPABASE_URL) || localStorage.getItem('MAPAOS_SUPABASE_URL') || '';
const SUPABASE_KEY = (window.MAPAOS_ENV && window.MAPAOS_ENV.SUPABASE_KEY) || localStorage.getItem('MAPAOS_SUPABASE_KEY') || '';

let supabaseClientInstance = null;
let isSupabaseActive = false;

if (SUPABASE_URL && SUPABASE_KEY && typeof supabase !== 'undefined') {
    try {
        supabaseClientInstance = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        isSupabaseActive = true;
        console.log('Supabase initialized successfully!');
    } catch (err) {
        console.error('Failed to initialize Supabase:', err);
    }
} else {
    console.log('Running in Offline/LocalStorage fallback mode.');
}

/* 
SQL SCHEMA FOR SUPABASE TABLE:
---------------------------------------------
create table reservations (
    id uuid default gen_random_uuid() primary key,
    os_number text not null,
    reserva_number text not null,
    client_name text not null,
    date text not null,
    time text not null,
    status text default 'Pendente',
    value text default null,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS & Select/Insert/Update policies for public access (anon):
alter table reservations enable row level security;
create policy "Allow all public actions" on reservations for all using (true) with check (true);
---------------------------------------------
*/

// Initial seed data for Mock/Offline Mode (starts empty)
const defaultReservations = [];

// Clean up old mock reservations with dummy data if present
const existingMock = localStorage.getItem('MAPAOS_MOCK_RESERVATIONS');
if (existingMock && existingMock.includes('ARCELOMITTAL')) {
    localStorage.setItem('MAPAOS_MOCK_RESERVATIONS', JSON.stringify([]));
}

if (!localStorage.getItem('MAPAOS_MOCK_RESERVATIONS')) {
    localStorage.setItem('MAPAOS_MOCK_RESERVATIONS', JSON.stringify(defaultReservations));
}

// Fetch all reservations
async function dbGetReservations() {
    if (isSupabaseActive) {
        try {
            const { data, error } = await supabaseClientInstance
                .from('reservations')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Supabase get error, falling back:', err);
        }
    }
    return JSON.parse(localStorage.getItem('MAPAOS_MOCK_RESERVATIONS'));
}

// Create new reservation
async function dbCreateReservation(reserva) {
    if (isSupabaseActive) {
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
            console.error('Supabase insert error, falling back:', err);
        }
    }
    const mockList = JSON.parse(localStorage.getItem('MAPAOS_MOCK_RESERVATIONS'));
    const newRes = {
        id: String(Date.now()),
        os_number: reserva.os_number,
        reserva_number: reserva.reserva_number,
        client_name: reserva.client_name,
        date: reserva.date,
        time: reserva.time,
        status: 'Pendente',
        value: '—'
    };
    mockList.unshift(newRes);
    localStorage.setItem('MAPAOS_MOCK_RESERVATIONS', JSON.stringify(mockList));
    return newRes;
}

// Reconcile/liquidate all pending reservations
async function dbReconcileReservations(fileValueMap = {}) {
    // In a real scenario, the file values reconcile each reservation. 
    // For this simulation, we set status to 'Paga' and set a simulated value (e.g. random value or specific file value).
    if (isSupabaseActive) {
        try {
            const { data: pendings, error: getErr } = await supabaseClientInstance
                .from('reservations')
                .select('id, os_number')
                .eq('status', 'Pendente');
            if (getErr) throw getErr;

            let updatedCount = 0;
            for (let item of pendings) {
                // Generate a random simulated receipt value between 300 and 1500
                const simulatedVal = (Math.floor(Math.random() * 1200) + 300).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                const { error: updErr } = await supabaseClientInstance
                    .from('reservations')
                    .update({ status: 'Paga', value: simulatedVal })
                    .eq('id', item.id);
                if (!updErr) updatedCount++;
            }
            return updatedCount;
        } catch (err) {
            console.error('Supabase reconciliation error, falling back:', err);
        }
    }
    const mockList = JSON.parse(localStorage.getItem('MAPAOS_MOCK_RESERVATIONS'));
    let updatedCount = 0;
    const updatedList = mockList.map(item => {
        if (item.status === 'Pendente') {
            updatedCount++;
            const simulatedVal = (Math.floor(Math.random() * 1200) + 300).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            return { ...item, status: 'Paga', value: simulatedVal };
        }
        return item;
    });
    localStorage.setItem('MAPAOS_MOCK_RESERVATIONS', JSON.stringify(updatedList));
    return updatedCount;
}

// User Auth Control Logic

/*
SQL SCHEMA FOR USER PROFILES:
---------------------------------------------
create table profiles (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    email text unique not null,
    phone text,
    status text default 'Pendente', -- 'Pendente', 'Aprovado', 'Rejeitado'
    role text default 'User', -- 'User', 'Master'
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS & Select/Insert/Update policies for public access (anon):
alter table profiles enable row level security;
create policy "Allow all public actions" on profiles for all using (true) with check (true);
---------------------------------------------
*/

// Initial seed data for Mock/Offline Mode profiles
const defaultProfiles = [
    { id: 'master-user', name: 'Administrador Master', email: 'master@mapaos.com', phone: '(00) 00000-0000', status: 'Aprovado', role: 'Master' }
];

if (!localStorage.getItem('MAPAOS_MOCK_PROFILES')) {
    localStorage.setItem('MAPAOS_MOCK_PROFILES', JSON.stringify(defaultProfiles));
}

// Log in a user (Checks if email exists and returns status)
async function dbLoginUser(email) {
    const formattedEmail = email.toLowerCase().trim();
    if (isSupabaseActive) {
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
            }
        } catch (err) {
            console.error('Supabase login check error:', err);
        }
    }

    const mockProfiles = JSON.parse(localStorage.getItem('MAPAOS_MOCK_PROFILES'));
    const user = mockProfiles.find(p => p.email === formattedEmail);
    if (user) {
        localStorage.setItem('MAPAOS_LOGGED_USER', JSON.stringify(user));
        return { success: true, user };
    }
    
    // Auto-create as Pendente if logging in for first time to make testing Google Auth easy!
    const newUser = await dbRegisterUser({
        name: formattedEmail.split('@')[0].toUpperCase(),
        email: formattedEmail,
        phone: '—'
    });
    return { success: true, user: newUser };
}

// Register a new user profile
async function dbRegisterUser(profile) {
    const formattedEmail = profile.email.toLowerCase().trim();
    const newProfile = {
        name: profile.name,
        email: formattedEmail,
        phone: profile.phone || '—',
        status: 'Pendente',
        role: 'User'
    };

    if (isSupabaseActive) {
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
        }
    }

    const mockProfiles = JSON.parse(localStorage.getItem('MAPAOS_MOCK_PROFILES'));
    const exists = mockProfiles.find(p => p.email === formattedEmail);
    if (exists) return exists;

    newProfile.id = String(Date.now());
    mockProfiles.push(newProfile);
    localStorage.setItem('MAPAOS_MOCK_PROFILES', JSON.stringify(mockProfiles));
    return newProfile;
}

// Get all pending profiles
async function dbGetPendingUsers() {
    if (isSupabaseActive) {
        try {
            const { data, error } = await supabaseClientInstance
                .from('profiles')
                .select('*')
                .eq('status', 'Pendente');
            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Supabase get pending profiles error:', err);
        }
    }
    const mockProfiles = JSON.parse(localStorage.getItem('MAPAOS_MOCK_PROFILES'));
    return mockProfiles.filter(p => p.status === 'Pendente');
}

// Approve a user profile
async function dbApproveUser(userId) {
    if (isSupabaseActive) {
        try {
            const { data, error } = await supabaseClientInstance
                .from('profiles')
                .update({ status: 'Aprovado' })
                .eq('id', userId)
                .select();
            if (error) throw error;
            return true;
        } catch (err) {
            console.error('Supabase approve profile error:', err);
        }
    }
    const mockProfiles = JSON.parse(localStorage.getItem('MAPAOS_MOCK_PROFILES'));
    const updated = mockProfiles.map(p => {
        if (p.id === userId) return { ...p, status: 'Aprovado' };
        return p;
    });
    localStorage.setItem('MAPAOS_MOCK_PROFILES', JSON.stringify(updated));
    return true;
}

// Reject/Delete a user profile
async function dbRejectUser(userId) {
    if (isSupabaseActive) {
        try {
            const { error } = await supabaseClientInstance
                .from('profiles')
                .delete()
                .eq('id', userId);
            if (error) throw error;
            return true;
        } catch (err) {
            console.error('Supabase reject profile error:', err);
        }
    }
    const mockProfiles = JSON.parse(localStorage.getItem('MAPAOS_MOCK_PROFILES'));
    const filtered = mockProfiles.filter(p => p.id !== userId);
    localStorage.setItem('MAPAOS_MOCK_PROFILES', JSON.stringify(filtered));
    return true;
}
