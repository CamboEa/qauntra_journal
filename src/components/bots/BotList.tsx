"use client";

import { format, parseISO } from "date-fns";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { AddBotDialog } from "@/components/bots/AddBotDialog";
import { PageLoader } from "@/components/Spinner";
import { cacheGet, cacheSet } from "@/lib/client-cache";
import type { Bot, BotStatus, BotsListResponse } from "@/types/bots";
import type { ApiErrorBody } from "@/types/trading";

const BOTS_CACHE_KEY = "bots-list";
const BOTS_TTL = 2 * 60 * 1000;

const STATUS_CONFIG: Record<BotStatus, { label: string; className: string }> = {
  testing:    { label: "Testing",    className: "bg-q-brand/10 text-q-brand" },
  profitable: { label: "Profitable", className: "bg-q-profit/10 text-q-profit" },
  losing:     { label: "Losing",     className: "bg-q-loss/10 text-q-loss" },
};

function fmtDate(value: string): string {
  try {
    return format(parseISO(value), "MMM d, yyyy");
  } catch {
    return value;
  }
}

const PAGE_SIZE = 10;

export function BotList() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [savingStatus, setSavingStatus] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  async function setStatus(botId: string, status: BotStatus | null) {
    setSavingStatus(botId);
    try {
      const res = await fetch(`/api/bots/${botId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) return;
      setBots((prev) => {
        const next = prev.map((b) => (b.id === botId ? { ...b, status } : b));
        cacheSet(BOTS_CACHE_KEY, next, BOTS_TTL);
        return next;
      });
    } finally {
      setSavingStatus(null);
    }
  }

  const loadBots = useCallback(async () => {
    const cached = cacheGet<Bot[]>(BOTS_CACHE_KEY);
    if (cached) {
      setBots(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/bots");
      const data = (await res.json()) as BotsListResponse & ApiErrorBody;
      if (!res.ok) throw new Error(data.message ?? "Failed to load bots");
      cacheSet(BOTS_CACHE_KEY, data.bots, BOTS_TTL);
      setBots(data.bots);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load bots");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBots();
  }, [loadBots]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-q-text">Bots</h1>
          <p className="mt-1 text-sm text-q-text-2">Strategy bots from MT5 Strategy Tester reports.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/bots/compare"
            className="rounded-xl border border-q-border bg-q-surface px-4 py-2.5 text-sm font-medium text-q-text-2 transition hover:bg-q-hover hover:text-q-text"
          >
            Compare bots
          </Link>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="rounded-xl bg-q-brand px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-q-brand/20 transition hover:bg-q-brand-h"
          >
            Add bot
          </button>
        </div>
      </div>

      {loading ? (
        <PageLoader label="Loading bots…" />
      ) : error ? (
        <div className="rounded-xl border border-q-loss/30 bg-q-loss/10 px-4 py-3 text-sm text-q-loss">
          {error}
        </div>
      ) : bots.length === 0 ? (
        <div className="rounded-xl border border-q-border bg-q-surface px-6 py-16 text-center">
          <p className="text-sm text-q-text-2">No bots yet.</p>
          <p className="mt-1 text-sm text-q-text-3">
            Add a bot and upload a CSV or XLSX Strategy Tester report.
          </p>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="mt-6 rounded-xl bg-q-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-q-brand-h"
          >
            Add your first bot
          </button>
        </div>
      ) : (() => {
        const totalPages = Math.max(1, Math.ceil(bots.length / PAGE_SIZE));
        const paginated = bots.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
        return (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-xl border border-q-border bg-q-surface">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-q-border bg-q-surface-2">
                    {["Bot", "Trades", "Created", "Status", ""].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-left text-xs font-medium uppercase tracking-widest text-q-text-3"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((bot, i) => {
                    const cfg = bot.status ? STATUS_CONFIG[bot.status] : null;
                    return (
                      <tr
                        key={bot.id}
                        className={`group transition-colors hover:bg-q-hover ${
                          i === paginated.length - 1 ? "" : "border-b border-q-border/50"
                        }`}
                      >
                        <td className="px-5 py-4">
                          <span className="font-semibold text-q-text transition-colors group-hover:text-q-brand">
                            {bot.name}
                          </span>
                        </td>
                        <td className="px-5 py-4 tabular-nums text-q-text-2">
                          {bot.tradeCount}
                        </td>
                        <td className="px-5 py-4 text-q-text-3">
                          {fmtDate(bot.createdAt)}
                        </td>
                        <td className="px-5 py-4">
                          <select
                            value={bot.status ?? ""}
                            disabled={savingStatus === bot.id}
                            onChange={(e) =>
                              void setStatus(bot.id, (e.target.value as BotStatus) || null)
                            }
                            className={`cursor-pointer rounded-lg border-0 py-1 pl-2.5 pr-7 text-xs font-semibold outline-none transition focus:ring-2 focus:ring-q-brand/30 disabled:opacity-50 ${
                              cfg ? cfg.className : "bg-q-surface-2 text-q-text-3"
                            }`}
                          >
                            <option value="">— Unset —</option>
                            <option value="testing">Testing</option>
                            <option value="profitable">Profitable</option>
                            <option value="losing">Losing</option>
                          </select>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/dashboard/bots/${bot.id}`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-q-text-3 transition hover:text-q-brand"
                          >
                            View
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {bots.length > PAGE_SIZE && (
              <div className="flex items-center justify-between px-1">
                <p className="text-xs text-q-text-3">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, bots.length)} of {bots.length}
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
                        <span key={`ellipsis-${idx}`} className="px-1 text-xs text-q-text-3">…</span>
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
      })()}

      <AddBotDialog open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  );
}
