export type PnlAccount = {
  id: string;
  name: string;
  balance: number;
  targetProfit: number;
  createdAt: string;
};

export type TradeDirection = "buy" | "sell";
export type TradeOutcome = "sl" | "be" | "tp";

export type PnlEntry = {
  id: string;
  accountId: string;
  date: string; // "YYYY-MM-DD"
  profit: number;
  note: string | null;
  direction: TradeDirection | null;
  outcome: TradeOutcome | null;
  tradeCount: number;
  tpCount: number;
  beCount: number;
  slCount: number;
};
