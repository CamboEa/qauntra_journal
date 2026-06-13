alter table public.bots
  add column if not exists status text check (status in ('testing', 'profitable', 'losing'));
