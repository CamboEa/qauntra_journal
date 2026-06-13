import type { Trade } from "@/types/trading";
import { profitTone } from "@/lib/format";

export type TradePerformanceStats = {
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
};

type MinimalTrade = Pick<Trade, "profit">;

export function computeTradeStats(trades: MinimalTrade[]): TradePerformanceStats | null {
  if (trades.length === 0) return null;

  const wins = trades.filter((t) => t.profit > 0);
  const losses = trades.filter((t) => t.profit < 0);
  const grossProfit = wins.reduce((s, t) => s + t.profit, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.profit, 0));
  const totalProfit = trades.reduce((s, t) => s + t.profit, 0);
  const winRate = (wins.length / trades.length) * 100;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : Infinity;

  return {
    tradeCount: trades.length,
    totalProfit,
    winRate,
    profitFactor,
    avgWin: wins.length ? grossProfit / wins.length : null,
    avgLoss: losses.length ? -grossLoss / losses.length : null,
    bestTrade: wins.length ? Math.max(...wins.map((t) => t.profit)) : null,
    worstTrade: losses.length ? Math.min(...losses.map((t) => t.profit)) : null,
    wins: wins.length,
    losses: losses.length,
  };
}

export { profitTone };
