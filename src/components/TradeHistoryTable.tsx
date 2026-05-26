"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";

import { DateRangeFilter } from "@/components/DateRangeFilter";
import type { ApiErrorBody, Trade, TradesResponse } from "@/types/trading";
import {
  formatCurrency,
  formatDuration,
  formatNumber,
  profitTone,
} from "@/lib/format";

function toInputDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

const selectClass =
  "rounded-xl border border-q-border bg-q-bg px-3 py-2 text-sm text-q-text outline-none transition focus:border-q-brand focus:ring-2 focus:ring-q-brand/20";

export function TradeHistoryTable({
  defaultStart,
  defaultEnd,
}: {
  defaultStart: string;
  defaultEnd: string;
}) {
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [symbolFilter, setSymbolFilter] = useState("");
  const [sortKey, setSortKey] = useState<"closeTime" | "profit">("closeTime");

  const loadTrades = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      start: new Date(`${start}T00:00:00`).toISOString(),
      end: new Date(`${end}T23:59:59`).toISOString(),
    });

    try {
      const res = await fetch(`/api/trades?${params}`);
      const data = (await res.json()) as TradesResponse | ApiErrorBody;

      if (!res.ok) {
        const err = data as ApiErrorBody;
        throw new Error(err.message ?? "Failed to load trades");
      }

      setTrades((data as TradesResponse).trades);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load trades");
      setTrades([]);
    } finally {
      setLoading(false);
    }
  }, [start, end]);

  useEffect(() => {
    void loadTrades();
  }, [loadTrades]);

  const symbols = useMemo(() => {
    const set = new Set(
      trades.map((t) => t.symbol).filter((s): s is string => Boolean(s)),
    );
    return Array.from(set).sort();
  }, [trades]);

  const filtered = useMemo(() => {
    let list = [...trades];
    if (symbolFilter) {
      list = list.filter((t) => t.symbol === symbolFilter);
    }
    list.sort((a, b) => {
      if (sortKey === "profit") return b.profit - a.profit;
      const aTime = a.closeTime ?? a.openTime;
      const bTime = b.closeTime ?? b.openTime;
      return bTime.localeCompare(aTime);
    });
    return list;
  }, [trades, symbolFilter, sortKey]);

  const totals = useMemo(() => {
    const profit = filtered.reduce((sum, t) => sum + t.profit, 0);
    const wins = filtered.filter((t) => t.profit > 0).length;
    return { profit, wins, count: filtered.length };
  }, [filtered]);

  const netTone = profitTone(totals.profit);
  const netClass =
    netTone === "profit"
      ? "text-q-profit"
      : netTone === "loss"
        ? "text-q-loss"
        : "text-q-text";

  return (
    <div className="space-y-5">
      {/* Filters row */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <DateRangeFilter
          start={start}
          end={end}
          loading={loading}
          onStartChange={setStart}
          onEndChange={setEnd}
          onApply={() => void loadTrades()}
        />

        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-q-text-3">
              Symbol
            </span>
            <select
              value={symbolFilter}
              onChange={(e) => setSymbolFilter(e.target.value)}
              className={selectClass}
            >
              <option value="">All symbols</option>
              {symbols.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-q-text-3">
              Sort by
            </span>
            <select
              value={sortKey}
              onChange={(e) =>
                setSortKey(e.target.value as "closeTime" | "profit")
              }
              className={selectClass}
            >
              <option value="closeTime">Close time</option>
              <option value="profit">Profit</option>
            </select>
          </label>
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-q-border bg-q-surface px-5 py-3 text-sm">
        <span className="text-q-text-2">
          <span className="font-semibold text-q-text">{totals.count}</span>{" "}
          trades
        </span>
        <span className="text-q-text-2">
          Net P/L{" "}
          <span className={`font-semibold ${netClass}`}>
            {formatCurrency(totals.profit)}
          </span>
        </span>
        <span className="text-q-text-2">
          Wins{" "}
          <span className="font-semibold text-q-text">{totals.wins}</span>
        </span>
      </div>

      {error ? (
        <div className="rounded-xl border border-q-loss/30 bg-q-loss/10 px-4 py-3 text-sm text-q-loss">
          {error}
        </div>
      ) : null}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-q-border bg-q-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-240 text-left text-sm">
            <thead>
              <tr className="border-b border-q-border bg-q-surface-2">
                {[
                  "Close",
                  "Symbol",
                  "Type",
                  "Volume",
                  "Open",
                  "Close px",
                  "Pips",
                  "Profit",
                  "Duration",
                  "Comment",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-xs font-medium uppercase tracking-widest text-q-text-3"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-14 text-center text-sm text-q-text-3">
                    Loading trade history…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-14 text-center text-sm text-q-text-3">
                    No trades in this range.
                  </td>
                </tr>
              ) : (
                filtered.map((trade, i) => {
                  const tone = profitTone(trade.profit);
                  const plClass =
                    tone === "profit"
                      ? "text-q-profit"
                      : tone === "loss"
                        ? "text-q-loss"
                        : "text-q-text-2";

                  return (
                    <tr
                      key={trade._id}
                      className={`border-b border-q-border/50 transition-colors hover:bg-q-hover ${
                        i === filtered.length - 1 ? "border-0" : ""
                      }`}
                    >
                      <td className="px-4 py-3.5 font-mono text-xs text-q-text-3">
                        {trade.closeTime ?? "—"}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-q-text">
                        {trade.symbol ?? "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                            trade.type?.toLowerCase() === "buy"
                              ? "bg-q-profit/15 text-q-profit"
                              : trade.type?.toLowerCase() === "sell"
                                ? "bg-q-loss/15 text-q-loss"
                                : "bg-q-surface-2 text-q-text-2"
                          }`}
                        >
                          {trade.type}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 tabular-nums text-q-text-2">
                        {formatNumber(trade.volume, 2)}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-q-text-3">
                        {trade.openTime}
                      </td>
                      <td className="px-4 py-3.5 tabular-nums text-q-text-2">
                        {trade.closePrice != null
                          ? formatNumber(trade.closePrice, 5)
                          : "—"}
                      </td>
                      <td className="px-4 py-3.5 tabular-nums text-q-text-2">
                        {trade.pips != null ? formatNumber(trade.pips, 1) : "—"}
                      </td>
                      <td className={`px-4 py-3.5 tabular-nums font-semibold ${plClass}`}>
                        {formatCurrency(trade.profit)}
                      </td>
                      <td className="px-4 py-3.5 text-q-text-3">
                        {formatDuration(trade.durationInMinutes)}
                      </td>
                      <td
                        className="max-w-48 truncate px-4 py-3.5 text-q-text-3"
                        title={trade.comment}
                      >
                        {trade.comment ?? "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
