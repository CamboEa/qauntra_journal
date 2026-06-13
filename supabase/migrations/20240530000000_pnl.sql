create table public.pnl_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_profit numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.pnl_entries (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.pnl_accounts(id) on delete cascade,
  date date not null,
  profit numeric not null default 0,
  note text,
  created_at timestamptz not null default now(),
  unique (account_id, date)
);

create index pnl_entries_account_id_idx on public.pnl_entries(account_id);
create index pnl_accounts_user_id_idx on public.pnl_accounts(user_id);

alter table public.pnl_accounts enable row level security;
alter table public.pnl_entries enable row level security;

create policy "Users manage own pnl accounts" on public.pnl_accounts
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own pnl entries" on public.pnl_entries
  using (exists (select 1 from public.pnl_accounts a where a.id = pnl_entries.account_id and a.user_id = auth.uid()))
  with check (exists (select 1 from public.pnl_accounts a where a.id = pnl_entries.account_id and a.user_id = auth.uid()));
