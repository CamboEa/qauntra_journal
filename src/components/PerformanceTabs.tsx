"use client";

import { useEffect, useState } from "react";

import { Mt5SetupPrompt } from "@/components/Mt5SetupPrompt";
import { PerformanceView } from "@/components/PerformanceView";

export function PerformanceTabs({
  defaultStart,
  defaultEnd,
}: {
  defaultStart: string;
  defaultEnd: string;
}) {
  const [mt5Linked, setMt5Linked] = useState<boolean | null>(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch("/api/config");
        const data = (await res.json()) as { configured?: boolean };
        setMt5Linked(Boolean(data.configured));
      } catch {
        setMt5Linked(false);
      }
    }

    void loadConfig();
  }, []);

  if (mt5Linked === false) {
    return <Mt5SetupPrompt />;
  }

  if (mt5Linked === null) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-q-text-3">
        Loading performance…
      </div>
    );
  }

  return <PerformanceView defaultStart={defaultStart} defaultEnd={defaultEnd} />;
}
