import type { OpenTrade } from "@/types/trading";
import {
  formatCurrency,
  formatDuration,
  formatNumber,
  profitTone,
} from "@/lib/format";

export function OpenTradesTable({ trades }: { trades: OpenTrade[] }) {
  if (trades.length === 0) {
    return (
      <div className="rounded-xl border border-q-border bg-q-surface px-5 py-10 text-center">
        <p className="text-sm text-q-text-2">No open positions.</p>
        <p className="mt-1 text-xs text-q-text-3">
          Syncing from MT5 when the QuatraSync indicator is running.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-q-border bg-q-surface">
      <div className="flex items-center justify-between border-b border-q-border px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-q-text">Open positions</h2>
          <p className="mt-0.5 text-xs text-q-text-3">
            {trades.length} active
          </p>
        </div>
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-q-brand/20 px-1.5 text-xs font-semibold text-q-brand">
          {trades.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-180 text-left text-sm">
          <thead>
            <tr className="border-b border-q-border bg-q-surface-2">
              {["Symbol", "Type", "Volume", "Open", "Price", "P/L", "Duration"].map(
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
            {trades.map((trade, i) => {
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
                    i === trades.length - 1 ? "border-0" : ""
                  }`}
                >
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
                  <td className="px-4 py-3.5 text-q-text-3 font-mono text-xs">
                    {trade.openTime}
                  </td>
                  <td className="px-4 py-3.5 tabular-nums text-q-text-2">
                    {trade.openPrice != null
                      ? formatNumber(trade.openPrice, 5)
                      : "—"}
                  </td>
                  <td className={`px-4 py-3.5 tabular-nums font-semibold ${plClass}`}>
                    {formatCurrency(trade.profit)}
                  </td>
                  <td className="px-4 py-3.5 text-q-text-3">
                    {formatDuration(trade.durationInMinutes)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
