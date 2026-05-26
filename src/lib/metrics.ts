import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

import type { DealDoc } from "@/lib/firebase/types";
import type { Metrics, PeriodMetrics, Trade } from "@/types/trading";

function parseDealTime(value: string): Date {
  const iso = parseISO(value);
  if (!Number.isNaN(iso.getTime())) return iso;
  // MT5 format: "2024.01.15 14:30:00" → "2024-01-15T14:30:00"
  return new Date(value.replace(/\./g, "-").replace(" ", "T"));
}

function periodMetrics(deals: DealDoc[], start: Date, end: Date): PeriodMetrics {
  const inRange = deals.filter((deal) => {
    const time = parseDealTime(deal.closeTime);
    return isWithinInterval(time, { start, end });
  });

  const profit = inRange.reduce((sum, deal) => sum + deal.profit, 0);
  const wins = inRange.filter((deal) => deal.profit > 0).length;

  return {
    profit,
    pips: 0,
    lots: inRange.reduce((sum, deal) => sum + deal.volume, 0),
    gain: 0,
    trades: inRange.length,
    wonTradesPercent: inRange.length ? (wins / inRange.length) * 100 : 0,
  };
}

export function computeMetrics(
  account: {
    balance: number;
    equity: number;
    margin: number;
    freeMargin: number;
  },
  deals: DealDoc[],
): Metrics {
  const wins = deals.filter((deal) => deal.profit > 0);
  const losses = deals.filter((deal) => deal.profit < 0);
  const totalProfit = deals.reduce((sum, deal) => sum + deal.profit, 0);
  const winProfits = wins.map((deal) => deal.profit);
  const lossProfits = losses.map((deal) => deal.profit);

  const now = new Date();

  return {
    balance: account.balance,
    equity: account.equity,
    margin: account.margin,
    freeMargin: account.freeMargin,
    marginLevel:
      account.margin > 0 ? (account.equity / account.margin) * 100 : undefined,
    trades: deals.length,
    profit: totalProfit,
    wonTradesPercent: deals.length ? (wins.length / deals.length) * 100 : 0,
    lostTradesPercent: deals.length ? (losses.length / deals.length) * 100 : 0,
    averageWin: winProfits.length
      ? winProfits.reduce((a, b) => a + b, 0) / winProfits.length
      : undefined,
    averageLoss: lossProfits.length
      ? lossProfits.reduce((a, b) => a + b, 0) / lossProfits.length
      : undefined,
    bestTrade: winProfits.length ? Math.max(...winProfits) : undefined,
    worstTrade: lossProfits.length ? Math.min(...lossProfits) : undefined,
    periods: {
      today: periodMetrics(deals, startOfDay(now), endOfDay(now)),
      thisWeek: periodMetrics(
        deals,
        startOfWeek(now, { weekStartsOn: 1 }),
        endOfWeek(now, { weekStartsOn: 1 }),
      ),
      thisMonth: periodMetrics(deals, startOfMonth(now), endOfMonth(now)),
    },
  };
}

export function dealToTrade(accountId: string, deal: DealDoc): Trade {
  return {
    _id: String(deal.ticket),
    accountId,
    volume: deal.volume,
    durationInMinutes: 0,
    profit: deal.profit,
    gain: 0,
    success: deal.success,
    openTime: deal.openTime,
    closeTime: deal.closeTime,
    type: deal.type,
    symbol: deal.symbol,
    openPrice: deal.openPrice,
    closePrice: deal.closePrice,
  };
}

export function positionToOpenTrade(
  accountId: string,
  position: {
    ticket: number;
    symbol: string;
    profit: number;
    volume: number;
    type: string;
    openTime: string;
    openPrice?: number;
  },
): Trade {
  return {
    _id: String(position.ticket),
    accountId,
    volume: position.volume,
    durationInMinutes: 0,
    profit: position.profit,
    gain: 0,
    success: profitSuccess(position.profit),
    openTime: position.openTime,
    type: position.type,
    symbol: position.symbol,
    openPrice: position.openPrice,
  };
}

function profitSuccess(profit: number): "won" | "lost" | "breakeven" {
  if (profit > 0) return "won";
  if (profit < 0) return "lost";
  return "breakeven";
}

export function dealSuccess(profit: number): "won" | "lost" | "breakeven" {
  return profitSuccess(profit);
}
