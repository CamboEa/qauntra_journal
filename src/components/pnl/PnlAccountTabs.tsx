"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { PnlCalendarView } from "@/components/pnl/PnlCalendarView";
import { PnlOverview } from "@/components/pnl/PnlOverview";
import { PageLoader } from "@/components/Spinner";
import { cacheGet, cacheSet } from "@/lib/client-cache";
import type { PnlAccount } from "@/types/pnl";

const ACCOUNT_TTL = 5 * 60 * 1000;

type Tab = "overview" | "calendar";
type ApiError = { message?: string };

type Props = { accountId: string };

export function PnlAccountTabs({ accountId }: Props) {
  const [tab, setTab] = useState<Tab>("overview");
  const [account, setAccount] = useState<PnlAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccount = useCallback(async () => {
    const key = `pnl-account-${accountId}`;
    const cached = cacheGet<PnlAccount>(key);
    if (cached) {
      setAccount(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/pnl/accounts/${accountId}`);
      const data = (await res.json()) as { account: PnlAccount } & ApiError;
      if (!res.ok) throw new Error(data.message ?? "Failed to load account");
      cacheSet(key, data.account, ACCOUNT_TTL);
      setAccount(data.account);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load account");
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => { void fetchAccount(); }, [fetchAccount]);

  if (loading) return <PageLoader />;

  if (error) {
    return (
      <div className="rounded-xl border border-q-loss/30 bg-q-loss/10 px-4 py-3 text-sm text-q-loss">
        {error}
      </div>
    );
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overall Analytics" },
    { id: "calendar", label: "Calendar View" },
  ];

  return (
    <div className="flex flex-1 flex-col gap-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-q-text-3">
        <Link href="/dashboard/pnl" className="transition hover:text-q-text">
          PNL Tracker
        </Link>
        <span>/</span>
        <span className="text-q-text">{account?.name ?? "Account"}</span>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border border-q-border bg-q-surface p-1 w-fit">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
              tab === id
                ? "bg-q-bg text-q-text shadow-sm"
                : "text-q-text-3 hover:text-q-text"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "overview" ? (
        <PnlOverview accountId={accountId} />
      ) : (
        <PnlCalendarView accountId={accountId} hideBreadcrumb initialAccount={account ?? undefined} onYearlyView={() => setTab("overview")} />
      )}
    </div>
  );
}
