"use client";

import { format, parseISO } from "date-fns";
import { useMemo, useState } from "react";

import { formatCurrency, formatNumber, profitTone } from "@/lib/format";
import type { BotTrade } from "@/types/bots";

const PAGE_SIZE = 15;

function parseTime(value: string): Date {
  const iso = parseISO(value);
  if (!Number.isNaN(iso.getTime())) return iso;
  return new Date(value.replace(/\./g, "-").replace(" ", "T"));
}

function fmtTime(value: string): string {
  try {
    return format(parseTime(value), "MMM d, yyyy HH:mm");
  } catch {
    return value;
  }
}


type SortKey = "closeTime" | "profit";
type TypeFilter = "all" | "buy" | "sell";

const selectClass =
  "rounded-xl border border-q-border bg-q-surface px-3 py-2 text-sm text-q-text outline-none transition focus:border-q-brand focus:ring-2 focus:ring-q-brand/20";

export function BotTradesTable({ trades }: { trades: BotTrade[] }) {
  const [symbolFilter, setSymbolFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("closeTime");
  const [page, setPage] = useState(1);

  const symbols = useMemo(() => {
    const set = new Set(trades.map((t) => t.symbol).filter(Boolean));
    return Array.from(set).sort();
  }, [trades]);

  const filtered = useMemo(() => {
    let list = [...trades];
    if (symbolFilter) list = list.filter((t) => t.symbol === symbolFilter);
    if (typeFilter !== "all") {
      list = list.filter((t) => t.type.toLowerCase().includes(typeFilter));
    }
    list.sort((a, b) => {
      if (sortKey === "profit") return b.profit - a.profit;
      return parseTime(b.closeTime).getTime() - parseTime(a.closeTime).getTime();
    });
    return list;
  }, [trades, symbolFilter, typeFilter, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totals = useMemo(() => {
    const profit = filtered.reduce((s, t) => s + t.profit, 0);
    const wins = filtered.filter((t) => t.success === "won").length;
    return { profit, wins, count: filtered.length };
  }, [filtered]);

  const netTone = profitTone(totals.profit);
  const netClass =
    netTone === "profit" ? "text-q-profit" : netTone === "loss" ? "text-q-loss" : "text-q-text";

  function handleFilter<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }

  if (trades.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-q-text-2">Positions</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={symbolFilter}
            onChange={(e) => handleFilter(setSymbolFilter)(e.target.value)}
            className={selectClass}
          >
            <option value="">All symbols</option>
            {symbols.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => handleFilter(setTypeFilter)(e.target.value as TypeFilter)}
            className={selectClass}
          >
            <option value="all">Buy &amp; Sell</option>
            <option value="buy">Buy only</option>
            <option value="sell">Sell only</option>
          </select>

          <select
            value={sortKey}
            onChange={(e) => handleFilter(setSortKey)(e.target.value as SortKey)}
            className={selectClass}
          >
            <option value="closeTime">Latest first</option>
            <option value="profit">Best P/L first</option>
          </select>
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-q-border bg-q-surface px-5 py-3 text-sm">
        <span className="text-q-text-2">
          <span className="font-semibold text-q-text">{totals.count}</span> positions
        </span>
        <span className="text-q-text-2">
          Net P/L{" "}
          <span className={`font-semibold ${netClass}`}>{formatCurrency(totals.profit)}</span>
        </span>
        <span className="text-q-text-2">
          Wins <span className="font-semibold text-q-text">{totals.wins}</span>
        </span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-q-border bg-q-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-q-border bg-q-surface-2">
                {["#", "Symbol", "Type", "Volume", "Open time", "Close time", "Open px", "Close px", "P/L", "Result"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-xs font-medium uppercase tracking-widest text-q-text-3"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-14 text-center text-sm text-q-text-3">
                    No positions match the current filters.
                  </td>
                </tr>
              ) : (
                paginated.map((trade, i) => {
                  const tone = profitTone(trade.profit);
                  const plClass =
                    tone === "profit"
                      ? "text-q-profit"
                      : tone === "loss"
                        ? "text-q-loss"
                        : "text-q-text-2";
                  const rowNum = (page - 1) * PAGE_SIZE + i + 1;
                  const typeLow = trade.type.toLowerCase();

                  return (
                    <tr
                      key={trade.id}
                      className={`border-b border-q-border/50 transition-colors hover:bg-q-hover ${
                        i === paginated.length - 1 ? "border-0" : ""
                      }`}
                    >
                      <td className="px-4 py-3.5 tabular-nums text-xs text-q-text-3">
                        {trade.ticket ?? rowNum}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-q-text">{trade.symbol}</td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${
                            typeLow.includes("buy")
                              ? "bg-q-profit/15 text-q-profit"
                              : typeLow.includes("sell")
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
                        {fmtTime(trade.openTime)}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-q-text-3">
                        {fmtTime(trade.closeTime)}
                      </td>
                      <td className="px-4 py-3.5 tabular-nums text-q-text-2">
                        {trade.openPrice != null ? formatNumber(trade.openPrice, 5) : "—"}
                      </td>
                      <td className="px-4 py-3.5 tabular-nums text-q-text-2">
                        {trade.closePrice != null ? formatNumber(trade.closePrice, 5) : "—"}
                      </td>
                      <td className={`px-4 py-3.5 tabular-nums font-semibold ${plClass}`}>
                        {formatCurrency(trade.profit)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`rounded-md px-2 py-0.5 text-xs font-medium capitalize ${
                            trade.success === "won"
                              ? "bg-q-profit/10 text-q-profit"
                              : trade.success === "lost"
                                ? "bg-q-loss/10 text-q-loss"
                                : "bg-q-surface-2 text-q-text-2"
                          }`}
                        >
                          {trade.success}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-q-text-3">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of{" "}
            {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-q-border bg-q-surface px-3 py-1.5 text-xs text-q-text-2 transition hover:bg-q-hover disabled:pointer-events-none disabled:opacity-40"
            >
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                if (idx > 0 && (arr[idx - 1] as number) < p - 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) =>
                item === "..." ? (
                  <span key={`ellipsis-${idx}`} className="px-1 text-xs text-q-text-3">
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setPage(item as number)}
                    className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                      page === item
                        ? "border-q-brand bg-q-brand text-white"
                        : "border-q-border bg-q-surface text-q-text-2 hover:bg-q-hover"
                    }`}
                  >
                    {item}
                  </button>
                ),
              )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-q-border bg-q-surface px-3 py-1.5 text-xs text-q-text-2 transition hover:bg-q-hover disabled:pointer-events-none disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
