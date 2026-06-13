alter table pnl_entries
  add column if not exists trade_count integer not null default 0,
  add column if not exists tp_count    integer not null default 0,
  add column if not exists be_count    integer not null default 0,
  add column if not exists sl_count    integer not null default 0;
