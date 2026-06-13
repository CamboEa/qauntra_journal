export type BotStatus = "testing" | "profitable" | "losing";

export type Bot = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  tradeCount: number;
  createdAt: string;
  startBalance: number | null;
  status: BotStatus | null;
};

export type BotTrade = {
  id: string;
  botId: string;
  ticket: number | null;
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

export type BotPerformanceStats = {
  botId: string;
  name: string;
  color: string;
  tradeCount: number;
  totalProfit: number;
  winRate: number;
  profitFactor: number;
  avgWin: number | null;
  avgLoss: number | null;
  bestTrade: number | null;
  worstTrade: number | null;
  wins: number;
  losses: number;
  startBalance: number | null;
  endBalance: number | null;
};

export type BotCompareResponse = {
  bots: BotPerformanceStats[];
  rankedByProfit: string[];
};

export type BotsListResponse = {
  bots: Bot[];
};

export type BotUploadResponse = {
  imported: number;
  skipped: number;
  total: number;
};
