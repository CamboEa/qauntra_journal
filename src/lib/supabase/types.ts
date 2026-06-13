export type AccountDoc = {
  userId: string;
  apiKeyHash: string;
  mt5Login: string | null;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  lastSyncAt: string | null;
  createdAt: string;
};

export type DealDoc = {
  ticket: number;
  symbol: string;
  profit: number;
  volume: number;
  type: string;
  openTime: string;
  closeTime: string;
  openPrice?: number;
  closePrice?: number;
  success: "won" | "lost" | "breakeven";
};

export type PositionDoc = {
  ticket: number;
  symbol: string;
  profit: number;
  volume: number;
  type: string;
  openTime: string;
  openPrice?: number;
};

export type SyncPayload = {
  login: number | string;
  balance: number;
  equity: number;
  margin?: number;
  freeMargin?: number;
  deals?: SyncDealPayload[];
  positions?: SyncPositionPayload[];
};

export type SyncDealPayload = {
  ticket: number;
  symbol: string;
  profit: number;
  volume: number;
  type?: string;
  openTime?: string;
  closeTime?: string;
  openPrice?: number;
  closePrice?: number;
  time?: string;
};

export type SyncPositionPayload = {
  ticket: number;
  symbol: string;
  profit: number;
  volume: number;
  type?: string;
  openTime?: string;
  openPrice?: number;
};

type AccountRow = {
  id: string;
  user_id: string;
  api_key_hash: string;
  mt5_login: string | null;
  balance: number;
  equity: number;
  margin: number;
  free_margin: number;
  last_sync_at: string | null;
  created_at: string;
};

type DealRow = {
  ticket: number;
  symbol: string;
  profit: number;
  volume: number;
  type: string;
  open_time: string;
  close_time: string;
  open_price: number | null;
  close_price: number | null;
  success: "won" | "lost" | "breakeven";
};

type PositionRow = {
  ticket: number;
  symbol: string;
  profit: number;
  volume: number;
  type: string;
  open_time: string;
  open_price: number | null;
};

export function mapAccountRow(row: AccountRow): AccountDoc {
  return {
    userId: row.user_id,
    apiKeyHash: row.api_key_hash,
    mt5Login: row.mt5_login,
    balance: Number(row.balance),
    equity: Number(row.equity),
    margin: Number(row.margin),
    freeMargin: Number(row.free_margin),
    lastSyncAt: row.last_sync_at,
    createdAt: row.created_at,
  };
}

export function mapDealRow(row: DealRow): DealDoc {
  return {
    ticket: Number(row.ticket),
    symbol: row.symbol,
    profit: Number(row.profit),
    volume: Number(row.volume),
    type: row.type,
    openTime: row.open_time,
    closeTime: row.close_time,
    openPrice: row.open_price ?? undefined,
    closePrice: row.close_price ?? undefined,
    success: row.success,
  };
}

export function mapPositionRow(row: PositionRow): PositionDoc {
  return {
    ticket: Number(row.ticket),
    symbol: row.symbol,
    profit: Number(row.profit),
    volume: Number(row.volume),
    type: row.type,
    openTime: row.open_time,
    openPrice: row.open_price ?? undefined,
  };
}
