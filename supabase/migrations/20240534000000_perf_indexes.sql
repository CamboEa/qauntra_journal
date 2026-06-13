-- Composite index covers both account_id filter AND date range scan in one index.
-- Replaces the weaker single-column pnl_entries_account_id_idx for these queries.
CREATE INDEX IF NOT EXISTS pnl_entries_account_date_idx
  ON pnl_entries (account_id, date);

-- Composite index for the common bot_trades query pattern (filter by bot + sort by close_time).
CREATE INDEX IF NOT EXISTS bot_trades_bot_close_idx
  ON bot_trades (bot_id, close_time);
