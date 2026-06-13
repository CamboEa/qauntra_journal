"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { BotCompareChart } from "@/components/bots/BotCompareChart";
import { uniqueIds } from "@/components/bots/shared";
import { formatCurrency, formatPercent, profitTone } from "@/lib/format";
import type {
  Bot,
  BotCompareResponse,
  BotPerformanceStats,
  BotTrade,
  BotsListResponse,
} from "@/types/bots";
import type { ApiErrorBody } from "@/types/trading";

export function BotComparePanel() {
  const searchParams = useSearchParams();
  const initialIds = uniqueIds(
    (searchParams.get("ids") ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );

  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialIds);
  const [compare, setCompare] = useState<BotPerformanceStats[]>([]);
  const [chartTrades, setChartTrades] = useState<
    { botId: string; name: string; color: string; trades: BotTrade[] }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCompared, setHasCompared] = useState(initialIds.length > 0);

  const loadBots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/bots");
      const data = (await res.json()) as BotsListResponse & ApiErrorBody;
      if (!res.ok) throw new Error(data.message ?? "Failed to load bots");
      setBots(data.bots);
      setSelectedIds((prev) => {
        const valid = uniqueIds(prev.filter((id) => data.bots.some((b) => b.id === id)));
        return valid.length > 0 ? valid : data.bots.filter((b) => b.tradeCount > 0).map((b) => b.id);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load bots");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBots();
  }, [loadBots]);

  async function runCompare(ids: string[]) {
    const unique = uniqueIds(ids);
    if (unique.length === 0) {
      setCompare([]);
      setChartTrades([]);
      return;
    }

    setComparing(true);
    setError(null);
    try {
      const params = new URLSearchParams({ ids: unique.join(",") });
      const [compareRes, ...tradeResponses] = await Promise.all([
        fetch(`/api/bots/compare?${params}`),
        ...unique.map((id) => fetch(`/api/bots/${id}/trades`)),
      ]);

      const compareData = (await compareRes.json()) as BotCompareResponse & ApiErrorBody;
      if (!compareRes.ok) {
        throw new Error(compareData.message ?? "Failed to compare bots");
      }

      const tradesByBot: typeof chartTrades = [];
      for (let i = 0; i < unique.length; i += 1) {
        const bot = bots.find((b) => b.id === unique[i]);
        const tradeData = (await tradeResponses[i].json()) as { trades: BotTrade[] };
        if (bot) {
          tradesByBot.push({
            botId: bot.id,
            name: bot.name,
            color: bot.color,
            trades: tradeData.trades ?? [],
          });
        }
      }

      setCompare(compareData.bots);
      setChartTrades(tradesByBot);
      setHasCompared(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to compare bots");
    } finally {
      setComparing(false);
    }
  }

  useEffect(() => {
    if (!loading && initialIds.length > 0 && bots.length > 0) {
      void runCompare(initialIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, bots.length]);

  function toggleBot(botId: string) {
    setSelectedIds((prev) =>
      uniqueIds(
        prev.includes(botId) ? prev.filter((id) => id !== botId) : [...prev, botId],
      ),
    );
    setHasCompared(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-q-text-3">
        Loading bots…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard/bots"
            className="inline-flex items-center gap-1 text-sm text-q-text-2 transition hover:text-q-brand"
          >
            ← Back to bots
          </Link>
          <h1 className="mt-3 text-2xl font-semibold text-q-text">Compare bots</h1>
          <p className="mt-1 text-sm text-q-text-2">
            Select two or more bots to compare performance side by side.
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-q-loss/30 bg-q-loss/10 px-4 py-3 text-sm text-q-loss">
          {error}
        </div>
      ) : null}

      {bots.length === 0 ? (
        <div className="rounded-xl border border-q-border bg-q-surface px-6 py-14 text-center">
          <p className="text-sm text-q-text-2">No bots to compare yet.</p>
          <Link
            href="/dashboard/bots"
            className="mt-4 inline-block rounded-xl bg-q-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-q-brand-h"
          >
            Add a bot
          </Link>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-q-border bg-q-surface p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-widest text-q-text-2">
                Select bots
              </p>
              <p className="text-xs text-q-text-3">
                {uniqueIds(selectedIds).length} selected
              </p>
            </div>
            <div className="space-y-2">
              {bots.map((bot) => {
                const selected = selectedIds.includes(bot.id);
                const disabled = bot.tradeCount === 0;
                return (
                  <label
                    key={bot.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${
                      disabled
                        ? "cursor-not-allowed border-q-border/50 bg-q-surface-2 opacity-60"
                        : selected
                          ? "border-q-brand/40 bg-q-brand/5"
                          : "border-q-border bg-q-surface-2 hover:border-q-border-2"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={disabled}
                      onChange={() => toggleBot(bot.id)}
                      className="h-4 w-4 rounded border-q-border accent-q-brand"
                    />
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: bot.color }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="font-medium text-q-text">{bot.name}</span>
                      <span className="ml-2 text-xs text-q-text-3">
                        {bot.tradeCount} trade{bot.tradeCount === 1 ? "" : "s"}
                        {disabled ? " · upload trades first" : ""}
                      </span>
                    </span>
                    <Link
                      href={`/dashboard/bots/${bot.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-q-text-3 transition hover:text-q-brand"
                    >
                      View
                    </Link>
                  </label>
                );
              })}
            </div>
            <button
              type="button"
              disabled={comparing || uniqueIds(selectedIds).length < 2}
              onClick={() => void runCompare(selectedIds)}
              className="mt-4 rounded-xl bg-q-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-q-brand-h disabled:opacity-60"
            >
              {comparing ? "Comparing…" : "Compare selected"}
            </button>
          </div>

          {hasCompared && compare.length > 0 ? (
            <>
              <div className="overflow-hidden rounded-xl border border-q-border bg-q-surface">
                <div className="border-b border-q-border px-5 py-4">
                  <p className="text-xs font-medium uppercase tracking-widest text-q-text-2">
                    Bot ranking
                  </p>
                  <p className="mt-1 text-xs text-q-text-3">
                    Sorted by total P/L — higher is better
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-160 text-left text-sm">
                    <thead>
                      <tr className="border-b border-q-border bg-q-surface-2 text-xs uppercase tracking-widest text-q-text-3">
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Bot</th>
                        <th className="px-4 py-3">Trades</th>
                        <th className="px-4 py-3">Total P/L</th>
                        <th className="px-4 py-3">Win rate</th>
                        <th className="px-4 py-3">Profit factor</th>
                        <th className="px-4 py-3">Avg win</th>
                        <th className="px-4 py-3">Best</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compare.map((bot, index) => {
                        const plTone = profitTone(bot.totalProfit);
                        const plClass =
                          plTone === "profit"
                            ? "text-q-profit"
                            : plTone === "loss"
                              ? "text-q-loss"
                              : "text-q-text";
                        return (
                          <tr
                            key={bot.botId}
                            className="border-b border-q-border/50 hover:bg-q-hover"
                          >
                            <td className="px-4 py-3.5 text-q-text-3">
                              {index === 0 ? (
                                <span className="rounded-md bg-q-brand/15 px-2 py-0.5 text-xs font-semibold text-q-brand">
                                  Best
                                </span>
                              ) : (
                                index + 1
                              )}
                            </td>
                            <td className="px-4 py-3.5">
                              <Link
                                href={`/dashboard/bots/${bot.botId}`}
                                className="flex items-center gap-2 font-medium text-q-text hover:text-q-brand"
                              >
                                <span
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={{ backgroundColor: bot.color }}
                                />
                                {bot.name}
                              </Link>
                            </td>
                            <td className="px-4 py-3.5 tabular-nums text-q-text-2">
                              {bot.tradeCount}
                            </td>
                            <td className={`px-4 py-3.5 tabular-nums font-semibold ${plClass}`}>
                              {formatCurrency(bot.totalProfit)}
                            </td>
                            <td className="px-4 py-3.5 tabular-nums text-q-text-2">
                              {formatPercent(bot.winRate)}
                            </td>
                            <td className="px-4 py-3.5 tabular-nums text-q-text-2">
                              {bot.profitFactor === Infinity
                                ? "∞"
                                : bot.profitFactor.toFixed(2)}
                            </td>
                            <td className="px-4 py-3.5 tabular-nums text-q-text-2">
                              {bot.avgWin != null ? formatCurrency(bot.avgWin) : "—"}
                            </td>
                            <td className="px-4 py-3.5 tabular-nums text-q-profit">
                              {bot.bestTrade != null ? formatCurrency(bot.bestTrade) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-xl border border-q-border bg-q-surface p-5">
                <p className="mb-4 text-xs font-medium uppercase tracking-widest text-q-text-2">
                  Cumulative P/L comparison
                </p>
                <BotCompareChart series={chartTrades} />
              </div>
            </>
          ) : hasCompared && uniqueIds(selectedIds).length >= 2 ? null : (
            <p className="text-center text-sm text-q-text-3">
              Select at least two bots with trades, then click Compare selected.
            </p>
          )}
        </>
      )}
    </div>
  );
}
