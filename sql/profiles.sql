-- SQL Query to setup 'profiles' table in Supabase
-- Copy and paste this directly into the Supabase SQL Editor

create table if not exists profiles (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    email text unique not null,
    phone text,
    password text not null default '123456', -- Default fallback password
    status text default 'Pendente', -- 'Pendente', 'Aprovado', 'Expirado', 'Rejeitado'
    role text default 'User',       -- 'User', 'Master'
    expires_at timestamp with time zone default null, -- Set when approved (now + 30 days)
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- If the table already exists, add the columns (safe):
alter table profiles add column if not exists expires_at timestamp with time zone default null;
alter table profiles add column if not exists password text default '123456';
alter table profiles add column if not exists frozen_days_remaining integer default null;

-- Enable Row Level Security (RLS)
alter table profiles enable row level security;

-- Create Policies to allow anonymous public access (Anon key)
create policy "Allow public read profiles"   on profiles for select using (true);
create policy "Allow public insert profiles" on profiles for insert with check (true);
create policy "Allow public update profiles" on profiles for update using (true);
create policy "Allow public delete profiles" on profiles for delete using (true);

-- Insert Default Master Account Seed (Password: master123)
insert into profiles (name, email, phone, password, status, role)
values ('Administrador Master', 'master@mapaos.com', '(00) 00000-0000', 'master123', 'Aprovado', 'Master')
on conflict (email) do nothing;
