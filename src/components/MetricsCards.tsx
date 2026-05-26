import type { Metrics } from "@/types/trading";
import { formatCurrency, formatPercent, profitTone } from "@/lib/format";

type Tone = "profit" | "loss" | "neutral";

type Props = { metrics: Metrics };

function StatCard({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: Tone;
}) {
  const valueClass =
    tone === "profit"
      ? "text-q-profit"
      : tone === "loss"
        ? "text-q-loss"
        : "text-q-text";

  const topBorderClass =
    tone === "profit"
      ? "border-t-2 border-q-profit/60"
      : tone === "loss"
        ? "border-t-2 border-q-loss/60"
        : "border-t-2 border-q-border-2";

  return (
    <div className={`rounded-xl border border-q-border bg-q-surface p-5 ${topBorderClass} transition-colors hover:bg-q-hover`}>
      <p className="text-xs font-medium uppercase tracking-widest text-q-text-2">
        {label}
      </p>
      <p className={`mt-2.5 text-2xl font-semibold tabular-nums ${valueClass}`}>
        {value}
      </p>
      {sub ? (
        <p className="mt-1.5 text-xs text-q-text-3">{sub}</p>
      ) : null}
    </div>
  );
}

export function MetricsCards({ metrics }: Props) {
  const floatingPnl = metrics.equity - metrics.balance;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Balance" value={formatCurrency(metrics.balance)} />
      <StatCard
        label="Equity"
        value={formatCurrency(metrics.equity)}
        sub={`Floating ${formatCurrency(floatingPnl)}`}
        tone={profitTone(floatingPnl)}
      />
      <StatCard
        label="Free margin"
        value={formatCurrency(metrics.freeMargin)}
        sub={
          metrics.marginLevel != null
            ? `Level ${formatPercent(metrics.marginLevel)}`
            : undefined
        }
      />
      <StatCard
        label="Closed trades"
        value={String(metrics.trades)}
        sub={
          metrics.wonTradesPercent != null
            ? `Win rate ${formatPercent(metrics.wonTradesPercent)}`
            : undefined
        }
      />
      {metrics.profit != null ? (
        <StatCard
          label="Total profit"
          value={formatCurrency(metrics.profit)}
          tone={profitTone(metrics.profit)}
        />
      ) : null}
      {metrics.gain != null ? (
        <StatCard
          label="Gain"
          value={formatPercent(metrics.gain)}
          tone={profitTone(metrics.gain)}
        />
      ) : null}
      {metrics.bestTrade != null ? (
        <StatCard
          label="Best trade"
          value={formatCurrency(metrics.bestTrade)}
          tone="profit"
        />
      ) : null}
      {metrics.worstTrade != null ? (
        <StatCard
          label="Worst trade"
          value={formatCurrency(metrics.worstTrade)}
          tone="loss"
        />
      ) : null}
      {metrics.averageWin != null ? (
        <StatCard
          label="Avg win"
          value={formatCurrency(metrics.averageWin)}
          tone="profit"
        />
      ) : null}
      {metrics.averageLoss != null ? (
        <StatCard
          label="Avg loss"
          value={formatCurrency(Math.abs(metrics.averageLoss))}
          tone="loss"
        />
      ) : null}
    </div>
  );
}

export function PeriodSummary({ metrics }: Props) {
  const periods = metrics.periods;
  if (!periods) return null;

  const items = [
    { key: "today", label: "Today", data: periods.today },
    { key: "thisWeek", label: "This week", data: periods.thisWeek },
    { key: "thisMonth", label: "This month", data: periods.thisMonth },
  ].filter((item) => item.data);

  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-q-border bg-q-surface p-5">
      <h2 className="text-xs font-medium uppercase tracking-widest text-q-text-2">
        Period performance
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {items.map((item) => {
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
  );
}
