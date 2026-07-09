-- SQL Query to setup 'clients' table in Supabase
-- Copy and paste this directly into the Supabase SQL Editor

create table if not exists clients (
    id uuid default gen_random_uuid() primary key,
    name text not null unique,
    photo_url text,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Populate default clients
insert into clients (name) values
    ('ARCELOMITTAL'),
    ('BENTELER'),
    ('FORVIA'),
    ('JAGUAR'),
    ('JSL'),
    ('MAG'),
    ('MULTITERMINAIS'),
    ('NISSAN'),
    ('NISSAN NEWS'),
    ('PERNORD'),
    ('SESE'),
    ('STELLANTS'),
    ('TECNOPOLO')
on conflict (name) do nothing;

-- Enable Row Level Security (RLS)
alter table clients enable row level security;

-- Drop existing policies if any
drop policy if exists "Allow select clients" on clients;
drop policy if exists "Allow master manage clients" on clients;

-- Standard users and masters can select clients
create policy "Allow select clients" on clients for select using (
    auth.role() = 'authenticated'
);

-- Only Master users can manage clients (insert, update, delete)
create policy "Allow master manage clients" on clients for all using (
    (select role from public.profiles where id = auth.uid()) = 'Master'
);
