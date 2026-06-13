"use client";

import { getDaysInMonth, getDay, startOfMonth, format } from "date-fns";
import { useCallback, useEffect, useState } from "react";

import { Spinner } from "@/components/Spinner";
import { cacheGet, cacheSet } from "@/lib/client-cache";
import { formatCurrency } from "@/lib/format";
import type { PnlEntry } from "@/types/pnl";

const OVERVIEW_TTL = 2 * 60 * 1000;

const MONTH_NAMES = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

type ApiError = { message?: string };
type Props = { accountId: string };

function entryColor(profit: number, maxAbs: number): string {
  if (profit === 0) return "bg-q-border/30";
  const intensity = maxAbs > 0 ? Math.min(Math.abs(profit) / maxAbs, 1) : 1;
  const opacity = intensity > 0.5 ? "80" : "40";
  return profit > 0 ? `bg-q-profit/${opacity}` : `bg-q-loss/${opacity}`;
}

export function PnlOverview({ accountId }: Props) {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [entries, setEntries] = useState<PnlEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    const key = `pnl-overview-${accountId}-${year}`;
    const cached = cacheGet<PnlEntry[]>(key);
    if (cached) {
      setEntries(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/pnl/accounts/${accountId}/entries?year=${year}`);
      const data = (await res.json()) as { entries: PnlEntry[] } & ApiError;
      const fetched = data.entries ?? [];
      cacheSet(key, fetched, OVERVIEW_TTL);
      setEntries(fetched);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, [accountId, year]);

  useEffect(() => { void fetchEntries(); }, [fetchEntries]);

  const today = format(new Date(), "yyyy-MM-dd");

  // Max absolute profit across the year for shade scaling
  const maxAbs = entries.reduce((m, e) => Math.max(m, Math.abs(e.profit)), 0);

  // Build per-month stats
  const months = Array.from({ length: 12 }, (_, i) => {
    const monthStr = `${year}-${String(i + 1).padStart(2, "0")}`;
    const mEntries = entries.filter((e) => e.date.startsWith(monthStr));
    const total = mEntries.reduce((s, e) => s + e.profit, 0);
    return { i, monthStr, total, count: mEntries.length, mEntries };
  });

  const withData = months.filter((m) => m.count > 0);
  const bestMonth = withData.length
    ? withData.reduce((a, b) => (a.total >= b.total ? a : b))
    : null;
  const worstMonth = withData.length
    ? withData.reduce((a, b) => (a.total <= b.total ? a : b))
    : null;

  const btnClass =
    "rounded-lg border border-q-border bg-q-surface px-3 py-1.5 text-xs font-medium text-q-text-2 transition hover:bg-q-hover hover:text-q-text";

  return (
    <div className="flex flex-1 flex-col gap-5">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setYear((y) => y - 1)} className={btnClass}>
            ←
          </button>
          <span className="w-12 text-center text-base font-semibold text-q-text">{year}</span>
          <button type="button" onClick={() => setYear((y) => y + 1)} className={btnClass}>
            →
          </button>
        </div>

        {bestMonth && (
          <div className="text-sm">
            <span className="text-q-text-3">Best Month: </span>
            <span className="font-semibold text-q-profit">
              {MONTH_NAMES[bestMonth.i]} {formatCurrency(bestMonth.total)}
            </span>
          </div>
        )}
        {worstMonth && worstMonth !== bestMonth && (
          <div className="text-sm">
            <span className="text-q-text-3">Lowest Month: </span>
            <span className="font-semibold text-q-loss">
              {MONTH_NAMES[worstMonth.i]} {formatCurrency(worstMonth.total)}
            </span>
          </div>
        )}

        {/* Legend */}
        <div className="ml-auto flex items-center gap-3 text-xs text-q-text-3">
          <div className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm bg-q-loss/80" />
            <span className="h-3 w-3 rounded-sm bg-q-loss/40" />
            Loss
          </div>
          <div className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm bg-q-profit/40" />
            <span className="h-3 w-3 rounded-sm bg-q-profit/80" />
            Profit
          </div>
        </div>
      </div>

      {/* Month grid */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-2 gap-3 auto-rows-fr sm:grid-cols-3 lg:grid-cols-4">
          {months.map(({ i, monthStr, total, count, mEntries }) => {
            const date = new Date(year, i, 1);
            const daysCount = getDaysInMonth(date);
            const firstWeekday = getDay(startOfMonth(date));
            const mEntryMap = new Map(mEntries.map((e) => [e.date, e]));

            const cells: (string | null)[] = [];
            for (let x = 0; x < firstWeekday; x++) cells.push(null);
            for (let d = 1; d <= daysCount; d++) {
              cells.push(`${monthStr}-${String(d).padStart(2, "0")}`);
            }
            while (cells.length % 7 !== 0) cells.push(null);

            return (
              <div
                key={monthStr}
                className="flex flex-col rounded-xl border border-q-border bg-q-surface p-3"
              >
                {/* Header */}
                <div className="mb-2 flex items-baseline justify-between">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-semibold text-q-text">
                      {MONTH_NAMES[i]}
                    </span>
                    <span
                      className={`text-sm font-bold tabular-nums ${
                        total > 0
                          ? "text-q-profit"
                          : total < 0
                            ? "text-q-loss"
                            : "text-q-text-3"
                      }`}
                    >
                      {total > 0 ? "+" : ""}
                      {formatCurrency(total)}
                    </span>
                  </div>
                  <span className="text-xs text-q-text-3">
                    {count} {count === 1 ? "Trade" : "Trades"}
                  </span>
                </div>

                {/* Mini calendar heatmap — fills remaining card height */}
                <div className="flex-1 grid grid-cols-7 auto-rows-fr gap-0.5">
                  {cells.map((dateStr, idx) => {
                    if (!dateStr) {
                      return <div key={`empty-${idx}`} />;
                    }
                    const entry = mEntryMap.get(dateStr);
                    const isToday = dateStr === today;
                    const color = entry
                      ? entryColor(entry.profit, maxAbs)
                      : "bg-q-border/25";

                    return (
                      <div
                        key={dateStr}
                        title={
                          entry
                            ? `${dateStr}: ${entry.profit > 0 ? "+" : ""}${formatCurrency(entry.profit)}`
                            : dateStr
                        }
                        className={`rounded-sm ${color} ${isToday ? "ring-1 ring-q-brand" : ""}`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
