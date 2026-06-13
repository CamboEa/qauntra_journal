-- Bot performance: user-defined bots with CSV-imported trades

create table public.bots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  color text not null default '#1A4ECC',
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.bot_trades (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots (id) on delete cascade,
  ticket bigint,
  symbol text not null,
  profit numeric not null default 0,
  volume numeric not null default 0,
  type text not null default 'unknown',
  open_time text not null,
  close_time text not null,
  open_price numeric,
  close_price numeric,
  success text not null check (success in ('won', 'lost', 'breakeven')),
  created_at timestamptz not null default now()
);

create index bot_trades_bot_id_idx on public.bot_trades (bot_id);
create index bots_user_id_idx on public.bots (user_id);

alter table public.bots enable row level security;
alter table public.bot_trades enable row level security;

create policy "Users read own bots"
  on public.bots for select
  using (auth.uid() = user_id);

create policy "Users insert own bots"
  on public.bots for insert
  with check (auth.uid() = user_id);

create policy "Users update own bots"
  on public.bots for update
  using (auth.uid() = user_id);

create policy "Users delete own bots"
  on public.bots for delete
  using (auth.uid() = user_id);

create policy "Users read own bot trades"
  on public.bot_trades for select
  using (
    exists (
      select 1 from public.bots b
      where b.id = bot_trades.bot_id and b.user_id = auth.uid()
    )
  );

create policy "Users insert own bot trades"
  on public.bot_trades for insert
  with check (
    exists (
      select 1 from public.bots b
      where b.id = bot_trades.bot_id and b.user_id = auth.uid()
    )
  );

create policy "Users delete own bot trades"
  on public.bot_trades for delete
  using (
    exists (
      select 1 from public.bots b
      where b.id = bot_trades.bot_id and b.user_id = auth.uid()
    )
  );
