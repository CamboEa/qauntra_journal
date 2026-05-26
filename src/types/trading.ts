/** Subset of MetaStats trade shapes used by the dashboard. */
export type Trade = {
  _id: string;
  accountId: string;
  volume: number;
  durationInMinutes: number;
  profit: number;
  gain: number;
  success: string;
  openTime: string;
  type: string;
  symbol?: string;
  closeTime?: string;
  openPrice?: number;
  closePrice?: number;
  pips?: number;
  riskInBalancePercent?: number;
  riskInPips?: number;
  comment?: string;
  marketValue?: number;
};

export type OpenTrade = Trade;

export type Metrics = {
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel?: number;
  trades: number;
  profit?: number;
  gain?: number;
  wonTradesPercent?: number;
  lostTradesPercent?: number;
  averageWin?: number;
  averageLoss?: number;
  bestTrade?: number;
  worstTrade?: number;
  deposits?: number;
  withdrawals?: number;
  periods?: {
    today?: PeriodMetrics;
    thisWeek?: PeriodMetrics;
    thisMonth?: PeriodMetrics;
  };
};

export type PeriodMetrics = {
  profit: number;
  pips: number;
  lots: number;
  gain: number;
  trades: number;
  wonTradesPercent: number;
};

export type TradesResponse = {
  trades: Trade[];
  count: number;
};

export type ApiErrorBody = {
  error: string;
  message: string;
};
