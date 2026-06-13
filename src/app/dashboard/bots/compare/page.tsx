import { Suspense } from "react";

import { BotComparePanel } from "@/components/bots/BotComparePanel";

export default function BotComparePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20 text-sm text-q-text-3">
          Loading…
        </div>
      }
    >
      <BotComparePanel />
    </Suspense>
  );
}
