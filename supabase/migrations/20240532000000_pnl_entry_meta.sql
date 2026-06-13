alter table pnl_entries
  add column if not exists direction text check (direction in ('buy', 'sell')),
  add column if not exists outcome   text check (outcome   in ('sl', 'be', 'tp'));
