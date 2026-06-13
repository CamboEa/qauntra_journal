-- Quatra Journal: Supabase PostgreSQL schema (migrated from Firestore)

create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  account_id uuid,
  created_at timestamptz not null default now()
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  api_key_hash text not null,
  mt5_login text,
  balance numeric not null default 0,
  equity numeric not null default 0,
  margin numeric not null default 0,
  free_margin numeric not null default 0,
  last_sync_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_account_id_fkey
  foreign key (account_id) references public.accounts (id) on delete set null;

create index accounts_api_key_hash_idx on public.accounts (api_key_hash);

create table public.deals (
  account_id uuid not null references public.accounts (id) on delete cascade,
  ticket bigint not null,
  symbol text not null,
  profit numeric not null default 0,
  volume numeric not null default 0,
  type text not null default 'unknown',
  open_time text not null,
  close_time text not null,
  open_price numeric,
  close_price numeric,
  success text not null check (success in ('won', 'lost', 'breakeven')),
  primary key (account_id, ticket)
);

create table public.positions (
  account_id uuid not null references public.accounts (id) on delete cascade,
  ticket bigint not null,
  symbol text not null,
  profit numeric not null default 0,
  volume numeric not null default 0,
  type text not null default 'unknown',
  open_time text not null,
  open_price numeric,
  primary key (account_id, ticket)
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.deals enable row level security;
alter table public.positions enable row level security;

create policy "Users read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users read own account"
  on public.accounts for select
  using (auth.uid() = user_id);

create policy "Users read own deals"
  on public.deals for select
  using (
    exists (
      select 1 from public.accounts a
      where a.id = deals.account_id and a.user_id = auth.uid()
    )
  );

create policy "Users read own positions"
  on public.positions for select
  using (
    exists (
      select 1 from public.accounts a
      where a.id = positions.account_id and a.user_id = auth.uid()
    )
  );

create or replace function public.apply_sync(
  p_account_id uuid,
  p_mt5_login text,
  p_balance numeric,
  p_equity numeric,
  p_margin numeric,
  p_free_margin numeric,
  p_deals jsonb,
  p_positions jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.accounts
  set
    mt5_login = p_mt5_login,
    balance = p_balance,
    equity = p_equity,
    margin = p_margin,
    free_margin = p_free_margin,
    last_sync_at = now()
  where id = p_account_id;

  insert into public.deals (
    account_id, ticket, symbol, profit, volume, type,
    open_time, close_time, open_price, close_price, success
  )
  select
    p_account_id,
    (d->>'ticket')::bigint,
    d->>'symbol',
    coalesce((d->>'profit')::numeric, 0),
    coalesce((d->>'volume')::numeric, 0),
    coalesce(d->>'type', 'unknown'),
    d->>'open_time',
    d->>'close_time',
    nullif(d->>'open_price', '')::numeric,
    nullif(d->>'close_price', '')::numeric,
    d->>'success'
  from jsonb_array_elements(coalesce(p_deals, '[]'::jsonb)) as d
  on conflict (account_id, ticket) do update set
    symbol = excluded.symbol,
    profit = excluded.profit,
    volume = excluded.volume,
    type = excluded.type,
    open_time = excluded.open_time,
    close_time = excluded.close_time,
    open_price = excluded.open_price,
    close_price = excluded.close_price,
    success = excluded.success;

  delete from public.positions where account_id = p_account_id;

  insert into public.positions (
    account_id, ticket, symbol, profit, volume, type, open_time, open_price
  )
  select
    p_account_id,
    (p->>'ticket')::bigint,
    p->>'symbol',
    coalesce((p->>'profit')::numeric, 0),
    coalesce((p->>'volume')::numeric, 0),
    coalesce(p->>'type', 'unknown'),
    p->>'open_time',
    nullif(p->>'open_price', '')::numeric
  from jsonb_array_elements(coalesce(p_positions, '[]'::jsonb)) as p;
end;
$$;
