-- Run this in Supabase SQL Editor

create table folders (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  parent_id uuid references folders(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table files (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  folder_id uuid references folders(id) on delete cascade,
  topic text,
  content text not null,
  simulation_output text,
  simulation_input text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table folders enable row level security;
alter table files enable row level security;

create policy "Public read folders" on folders for select using (true);
create policy "Public read files" on files for select using (true);
create policy "Admin insert folders" on folders for insert to authenticated with check (true);
create policy "Admin update folders" on folders for update to authenticated using (true);
create policy "Admin delete folders" on folders for delete to authenticated using (true);
create policy "Admin insert files" on files for insert to authenticated with check (true);
create policy "Admin update files" on files for update to authenticated using (true);
create policy "Admin delete files" on files for delete to authenticated using (true);