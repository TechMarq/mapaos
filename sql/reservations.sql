-- SQL Query to setup 'reservations' table in Supabase
-- Copy and paste this directly into the Supabase SQL Editor

create table if not exists reservations (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete set null, -- Associated user profile
    os_number text not null,
    reserva_number text not null,
    client_name text not null,
    date text not null,
    time text not null,
    status text default 'Pendente',
    value text default null, -- Total Value
    net_value text default null, -- Liquid Value (70% of Total)
    plate text default null, -- Placa
    driver text default null, -- Motorista
    notes text default null, -- Observations
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Safe addition of columns if table already exists:
alter table reservations add column if not exists user_id uuid references public.profiles(id) on delete set null;
alter table reservations add column if not exists net_value text default null;
alter table reservations add column if not exists plate text default null;
alter table reservations add column if not exists driver text default null;
alter table reservations add column if not exists notes text default null;

-- Enable Row Level Security (RLS)
alter table reservations enable row level security;

-- Create Policies to enforce user-level data isolation
-- Standard users can only view/manage their own records. Master users can view/manage all records.
create policy "Allow select reservations" on reservations for select using (
    (select role from public.profiles where id = auth.uid()) = 'Master' or auth.uid() = user_id
);
create policy "Allow insert reservations" on reservations for insert with check (
    auth.uid() = user_id
);
create policy "Allow update reservations" on reservations for update using (
    (select role from public.profiles where id = auth.uid()) = 'Master' or auth.uid() = user_id
);
create policy "Allow delete reservations" on reservations for delete using (
    (select role from public.profiles where id = auth.uid()) = 'Master' or auth.uid() = user_id
);
