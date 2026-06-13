"use client";

import { useEffect, useMemo, useState } from "react";
import { parseISO } from "date-fns";

import type { ApiErrorBody, Metrics, Trade, TradesResponse } from "@/types/trading";
import { Mt5SetupPrompt } from "@/components/Mt5SetupPrompt";
import { formatCurrency, formatPercent, profitTone } from "@/lib/format";

function parseTradeTime(value: string): Date {
  const iso = parseISO(value);
  if (!Number.isNaN(iso.getTime())) return iso;
  return new Date(value.replace(/\./g, "-").replace(" ", "T"));
}

// ---------------------------------------------------------------------------
// Stat card (matches MetricsCards visual style)
// ---------------------------------------------------------------------------
function StatCard({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "profit" | "loss" | "neutral";
}) {
  const valueClass =
    tone === "profit"
      ? "text-q-profit"
      : tone === "loss"
        ? "text-q-loss"
        : "text-q-text";
  const topBorder =
    tone === "profit"
      ? "border-t-2 border-q-profit/60"
      : tone === "loss"
        ? "border-t-2 border-q-loss/60"
        : "border-t-2 border-q-border-2";

  return (
    <div
      className={`rounded-xl border border-q-border bg-q-surface p-5 ${topBorder} transition-colors hover:bg-q-hover`}
    >
      <p className="text-xs font-medium uppercase tracking-widest text-q-text-2">
        {label}
      </p>
      <p className={`mt-2.5 text-2xl font-semibold tabular-nums ${valueClass}`}>
        {value}
      </p>
      {sub ? <p className="mt-1.5 text-xs text-q-text-3">{sub}</p> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cumulative P&L SVG line chart
// ---------------------------------------------------------------------------
function CumulativeChart({ trades }: { trades: Trade[] }) {
  const points = useMemo(() => {
    const sorted = [...trades]
      .filter((t) => t.closeTime)
      .sort(
        (a, b) =>
          parseTradeTime(a.closeTime!).getTime() -
          parseTradeTime(b.closeTime!).getTime(),
      );

    let sum = 0;
    return sorted.map((t) => {
      sum += t.profit;
      return sum;
    });
  }, [trades]);

  if (points.length < 2) {
    return (
      <p className="py-10 text-center text-sm text-q-text-3">
        Not enough trades to plot a chart.
      </p>
    );
  }

  const W = 800;
  const H = 180;
  const PL = 4;
  const PR = 4;
  const PT = 12;
  const PB = 4;
  const CW = W - PL - PR;
  const CH = H - PT - PB;

  const minVal = Math.min(0, ...points);
  const maxVal = Math.max(0, ...points);
  const range = maxVal - minVal || 1;

  const toX = (i: number) =>
    PL + (i / Math.max(points.length - 1, 1)) * CW;
  const toY = (v: number) => PT + CH - ((v - minVal) / range) * CH;

  const zeroY = toY(0);
  const isProfit = points[points.length - 1] >= 0;
  const lineColor = isProfit ? "var(--color-q-profit)" : "var(--color-q-loss)";

  const pathD = points
    .map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`)
    .join(" ");

  const areaD =
    pathD +
    ` L${toX(points.length - 1).toFixed(1)},${zeroY.toFixed(1)} L${toX(0).toFixed(1)},${zeroY.toFixed(1)} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="h-44 w-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="pnl-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.18" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Zero line */}
      <line
        x1={PL}
        y1={zeroY}
        x2={W - PR}
        y2={zeroY}
        stroke="currentColor"
        strokeOpacity="0.12"
        strokeWidth="1"
        strokeDasharray="4 4"
        className="text-q-border"
      />
      {/* Fill */}
      <path d={areaD} fill="url(#pnl-fill)" />
      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke={lineColor}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* End dot */}
      <circle
        cx={toX(points.length - 1)}
        cy={toY(points[points.length - 1])}
        r="3.5"
        fill={lineColor}
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// P&L by symbol – horizontal bar chart
// ---------------------------------------------------------------------------
function SymbolBreakdown({ trades }: { trades: Trade[] }) {
  const rows = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of trades) {
      const sym = t.symbol ?? "Unknown";
      map.set(sym, (map.get(sym) ?? 0) + t.profit);
    }
    return Array.from(map.entries())
      .map(([symbol, profit]) => ({ symbol, profit }))
      .sort((a, b) => Math.abs(b.profit) - Math.abs(a.profit));
  }, [trades]);

  if (rows.length === 0) return null;

  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.profit)), 1);

  return (
    <div className="space-y-2.5">
      {rows.map(({ symbol, profit }) => {
        const tone = profitTone(profit);
        const barClass =
          tone === "profit" ? "bg-q-profit" : tone === "loss" ? "bg-q-loss" : "bg-q-border";
        const textClass =
          tone === "profit"
            ? "text-q-profit"
            : tone === "loss"
              ? "text-q-loss"
              : "text-q-text-2";
        const widthPct = (Math.abs(profit) / maxAbs) * 100;

        return (
          <div key={symbol} className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-right text-xs font-medium text-q-text">
              {symbol}
            </span>
            <div className="relative h-5 flex-1 overflow-hidden rounded-md bg-q-surface-2">
              <div
                className={`absolute inset-y-0 left-0 rounded-md opacity-80 ${barClass}`}
                style={{ width: `${widthPct}%` }}
              />
            </div>
            <span className={`w-20 shrink-0 text-xs font-semibold tabular-nums ${textClass}`}>
              {formatCurrency(profit)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Win / Loss donut
// ---------------------------------------------------------------------------
function WinLossRing({ winRate }: { winRate: number }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const winArc = (winRate / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width="104" height="104" viewBox="0 0 104 104" aria-hidden="true">
        <circle cx="52" cy="52" r={r} fill="none" stroke="currentColor" strokeWidth="12" className="text-q-surface-2" />
        <circle
          cx="52"
          cy="52"
          r={r}
          fill="none"
          stroke="var(--color-q-profit)"
          strokeWidth="12"
          strokeDasharray={`${winArc} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 52 52)"
        />
      </svg>
      <div className="text-center">
        <p className="text-2xl font-semibold text-q-profit">{formatPercent(winRate)}</p>
        <p className="text-xs text-q-text-3">win rate</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function PerformanceView({
  defaultStart,
  defaultEnd,
}: {
  defaultStart: string;
  defaultEnd: string;
}) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        start: new Date(`${defaultStart}T00:00:00`).toISOString(),
        end: new Date(`${defaultEnd}T23:59:59`).toISOString(),
      });

      try {
        const [tradesRes, metricsRes] = await Promise.all([
          fetch(`/api/trades?${params}`),
          fetch("/api/metrics"),
        ]);

        const tradesData = (await tradesRes.json()) as TradesResponse | ApiErrorBody;
        const metricsData = (await metricsRes.json()) as Metrics | ApiErrorBody;

        if (!tradesRes.ok) throw new Error((tradesData as ApiErrorBody).message ?? "Failed to load trades");
        if (!metricsRes.ok) throw new Error((metricsData as ApiErrorBody).message ?? "Failed to load metrics");

        setTrades((tradesData as TradesResponse).trades);
        setMetrics(metricsData as Metrics);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [defaultStart, defaultEnd]);

  const stats = useMemo(() => {
    if (trades.length === 0) return null;
    const wins = trades.filter((t) => t.profit > 0);
    const losses = trades.filter((t) => t.profit < 0);
    const grossProfit = wins.reduce((s, t) => s + t.profit, 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.profit, 0));
    const totalProfit = trades.reduce((s, t) => s + t.profit, 0);
    const winRate = (wins.length / trades.length) * 100;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : Infinity;
    const avgWin = wins.length ? grossProfit / wins.length : null;
    const avgLoss = losses.length ? -grossLoss / losses.length : null;
    const bestTrade = wins.length ? Math.max(...wins.map((t) => t.profit)) : null;
    const worstTrade = losses.length ? Math.min(...losses.map((t) => t.profit)) : null;

    return { wins, losses, grossProfit, grossLoss, totalProfit, winRate, profitFactor, avgWin, avgLoss, bestTrade, worstTrade };
  }, [trades]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-q-text-3">
        Loading performance data…
      </div>
    );
  }

  if (error) {
    const needsSetup =
      error.includes("sync key") ||
      error.includes("QuatraSync") ||
      error.includes("NOT_CONNECTED");

    if (needsSetup) {
      return <Mt5SetupPrompt />;
    }

    return (
      <div className="rounded-xl border border-q-loss/30 bg-q-loss/10 px-4 py-3 text-sm text-q-loss">
        {error}
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="rounded-xl border border-q-border bg-q-surface px-6 py-14 text-center text-sm text-q-text-3">
        No closed trades in this period.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      {stats && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total P/L"
            value={formatCurrency(stats.totalProfit)}
            sub={`${trades.length} closed trades`}
            tone={profitTone(stats.totalProfit)}
          />
          <StatCard
            label="Win rate"
            value={formatPercent(stats.winRate)}
            sub={`${stats.wins.length}W · ${stats.losses.length}L`}
          />
          <StatCard
            label="Profit factor"
            value={
              stats.profitFactor === Infinity
                ? "∞"
                : stats.profitFactor.toFixed(2)
            }
            sub={
              stats.profitFactor >= 1
                ? "Above breakeven"
                : "Below breakeven"
            }
            tone={stats.profitFactor >= 1 ? "profit" : "loss"}
          />
          <StatCard
            label="Avg win / loss"
            value={
              stats.avgWin != null
                ? formatCurrency(stats.avgWin)
                : "—"
            }
            sub={
              stats.avgLoss != null
                ? `Avg loss ${formatCurrency(Math.abs(stats.avgLoss))}`
                : undefined
            }
            tone="profit"
          />
          {stats.bestTrade != null && (
            <StatCard
              label="Best trade"
              value={formatCurrency(stats.bestTrade)}
              tone="profit"
            />
          )}
          {stats.worstTrade != null && (
            <StatCard
              label="Worst trade"
              value={formatCurrency(stats.worstTrade)}
              tone="loss"
            />
          )}
          {metrics?.balance != null && (
            <StatCard label="Balance" value={formatCurrency(metrics.balance)} />
          )}
          {metrics?.equity != null && (
            <StatCard
              label="Equity"
              value={formatCurrency(metrics.equity)}
              sub={`Floating ${formatCurrency(metrics.equity - (metrics.balance ?? 0))}`}
              tone={profitTone(metrics.equity - (metrics.balance ?? 0))}
            />
          )}
        </div>
      )}

      {/* Cumulative P&L chart */}
      <div className="rounded-xl border border-q-border bg-q-surface p-5">
        <p className="mb-4 text-xs font-medium uppercase tracking-widest text-q-text-2">
          Cumulative P/L
        </p>
        <CumulativeChart trades={trades} />
      </div>

      {/* Symbol breakdown + win/loss ring */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-q-border bg-q-surface p-5">
          <p className="mb-4 text-xs font-medium uppercase tracking-widest text-q-text-2">
            P/L by symbol
          </p>
          <SymbolBreakdown trades={trades} />
        </div>

        <div className="rounded-xl border border-q-border bg-q-surface p-5 flex flex-col items-center justify-center gap-6">
          <p className="self-start text-xs font-medium uppercase tracking-widest text-q-text-2">
            Win / Loss
          </p>
          {stats && <WinLossRing winRate={stats.winRate} />}
          {stats && (
            <div className="flex w-full justify-around text-center text-xs text-q-text-3">
              <div>
                <p className="text-base font-semibold text-q-profit">{stats.wins.length}</p>
                <p>wins</p>
              </div>
              <div>
                <p className="text-base font-semibold text-q-loss">{stats.losses.length}</p>
                <p>losses</p>
              </div>
              <div>
                <p className="text-base font-semibold text-q-text">
                  {trades.length - stats.wins.length - stats.losses.length}
                </p>
                <p>breakeven</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Period metrics from server metrics */}
      {metrics?.periods && (
        <div className="rounded-xl border border-q-border bg-q-surface p-5">
          <p className="mb-4 text-xs font-medium uppercase tracking-widest text-q-text-2">
            Period performance
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                { key: "today", label: "Today", data: metrics.periods.today },
                { key: "thisWeek", label: "This week", data: metrics.periods.thisWeek },
                { key: "thisMonth", label: "This month", data: metrics.periods.thisMonth },
              ] as const
            )
              .filter((item) => item.data)
              .map((item) => {
                const tone = profitTone(item.data!.profit);
                const valClass =
                  tone === "profit"
                    ? "text-q-profit"
                    : tone === "loss"
                      ? "text-q-loss"
                      : "text-q-text";
                return (
                  <div
                    key={item.key}
                    className="rounded-xl border border-q-border bg-q-surface-2 p-4"
                  >
                    <p className="text-xs font-medium uppercase tracking-widest text-q-text-3">
                      {item.label}
                    </p>
                    <p className={`mt-2 text-xl font-semibold tabular-nums ${valClass}`}>
                      {formatCurrency(item.data!.profit)}
                    </p>
                    <p className="mt-1.5 text-xs text-q-text-3">
                      {item.data!.trades} trades &middot;{" "}
                      {formatPercent(item.data!.wonTradesPercent)} wins
                    </p>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
