-- SQL Query to setup 'profiles' table in Supabase
-- Copy and paste this directly into the Supabase SQL Editor

create table profiles (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    email text unique not null,
    phone text,
    status text default 'Pendente', -- 'Pendente', 'Aprovado', 'Rejeitado'
    role text default 'User', -- 'User', 'Master'
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
alter table profiles enable row level security;

-- Create Policies to allow anonymous public access (Anon key)
create policy "Allow public read profiles" on profiles for select using (true);
create policy "Allow public insert profiles" on profiles for insert with check (true);
create policy "Allow public update profiles" on profiles for update using (true);
create policy "Allow public delete profiles" on profiles for delete using (true);

-- Insert Default Master Account Seed
insert into profiles (name, email, phone, status, role)
values ('Administrador Master', 'master@mapaos.com', '(00) 00000-0000', 'Aprovado', 'Master')
on conflict (email) do nothing;
