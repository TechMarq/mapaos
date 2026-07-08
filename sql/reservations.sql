-- SQL Query to setup 'reservations' table in Supabase
-- Copy and paste this directly into the Supabase SQL Editor

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

-- Enable Row Level Security (RLS)
alter table reservations enable row level security;

-- Create Policies to allow anonymous public access (Anon key)
create policy "Allow public read reservations" on reservations for select using (true);
create policy "Allow public insert reservations" on reservations for insert with check (true);
create policy "Allow public update reservations" on reservations for update using (true);
create policy "Allow public delete reservations" on reservations for delete using (true);
