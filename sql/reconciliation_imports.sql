-- SQL Query to setup 'reconciliation_imports' table in Supabase
-- Copy and paste this directly into the Supabase SQL Editor

create table if not exists reconciliation_imports (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete set null, -- Associated user profile who did the import
    filename text not null, -- Import spreadsheet file name
    row_count integer default 0, -- Number of reconciled records
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Add import_id to reservations referencing reconciliation_imports
alter table reservations add column if not exists import_id uuid references public.reconciliation_imports(id) on delete set null;

-- Enable Row Level Security (RLS)
alter table reconciliation_imports enable row level security;

-- Drop existing policies to prevent "already exists" errors when running the script again
drop policy if exists "Allow select reconciliation_imports" on reconciliation_imports;
drop policy if exists "Allow insert reconciliation_imports" on reconciliation_imports;
drop policy if exists "Allow delete reconciliation_imports" on reconciliation_imports;

-- Create Policies to enforce user-level data isolation
-- Standard users can only view/manage their own records. Master users can view/manage all records.
create policy "Allow select reconciliation_imports" on reconciliation_imports for select using (
    (select role from public.profiles where id = auth.uid()) = 'Master' or auth.uid() = user_id
);
create policy "Allow insert reconciliation_imports" on reconciliation_imports for insert with check (
    auth.uid() = user_id
);
create policy "Allow delete reconciliation_imports" on reconciliation_imports for delete using (
    (select role from public.profiles where id = auth.uid()) = 'Master' or auth.uid() = user_id
);
