import { format, subDays } from "date-fns";

import { PerformanceTabs } from "@/components/PerformanceTabs";
import { getHistoryDays } from "@/lib/env";

export default function PerformancePage() {
  const historyDays = getHistoryDays();
  const now = new Date();
  const defaultStart = format(subDays(now, historyDays), "yyyy-MM-dd");
  const defaultEnd = format(now, "yyyy-MM-dd");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-q-text">Performance</h1>
        <p className="mt-1 text-sm text-q-text-2">
          Analyze closed trades synced from your connected MT5 account.
        </p>
      </header>
      <PerformanceTabs defaultStart={defaultStart} defaultEnd={defaultEnd} />
    </div>
  );
}
