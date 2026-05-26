import { format, subDays } from "date-fns";

import { DashboardGate } from "@/components/DashboardGate";
import { TradeHistoryTable } from "@/components/TradeHistoryTable";
import { getHistoryDays } from "@/lib/env";

export const dynamic = "force-dynamic";

export default function HistoryPage() {
  const historyDays = getHistoryDays();
  const now = new Date();
  const defaultStart = format(subDays(now, historyDays), "yyyy-MM-dd");
  const defaultEnd = format(now, "yyyy-MM-dd");

  return (
    <DashboardGate
      title="Trade history"
      description="Closed trades synced from MT5 via the QuatraSync indicator."
    >
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold text-q-text">Trade history</h1>
          <p className="mt-1 text-sm text-q-text-2">
            Closed trades from your connected MT5 account.
          </p>
        </header>
        <TradeHistoryTable defaultStart={defaultStart} defaultEnd={defaultEnd} />
      </div>
    </DashboardGate>
  );
}
