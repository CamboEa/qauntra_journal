"use client";

import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Check,
  Pencil,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { BotCompareChart } from "@/components/bots/BotCompareChart";
import { BotTradesTable } from "@/components/bots/BotTradesTable";
import { uniqueIds } from "@/components/bots/shared";
import { formatCurrency, formatPercent, profitTone } from "@/lib/format";
import type {
  Bot,
  BotCompareResponse,
  BotPerformanceStats,
  BotTrade,
  BotUploadResponse,
} from "@/types/bots";
import type { ApiErrorBody } from "@/types/trading";

type BotDetailProps = {
  botId: string;
};

export function BotDetail({ botId }: BotDetailProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [bot, setBot] = useState<Bot | null>(null);
  const [stats, setStats] = useState<BotPerformanceStats | null>(null);
  const [trades, setTrades] = useState<BotTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editingBalance, setEditingBalance] = useState(false);
  const [balanceInput, setBalanceInput] = useState("");
  const [tab, setTab] = useState<"overview" | "chart" | "positions">("overview");

  const loadBot = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [botRes, compareRes, tradesRes] = await Promise.all([
        fetch(`/api/bots/${botId}`),
        fetch(`/api/bots/compare?ids=${encodeURIComponent(botId)}`),
        fetch(`/api/bots/${botId}/trades`),
      ]);

      const botData = (await botRes.json()) as { bot: Bot } & ApiErrorBody;
      if (!botRes.ok) throw new Error(botData.message ?? "Bot not found");

      const compareData = (await compareRes.json()) as BotCompareResponse & ApiErrorBody;
      if (!compareRes.ok) {
        throw new Error(compareData.message ?? "Failed to load stats");
      }

      const tradesData = (await tradesRes.json()) as { trades: BotTrade[] } & ApiErrorBody;
      if (!tradesRes.ok) {
        throw new Error(tradesData.message ?? "Failed to load trades");
      }

      setBot(botData.bot);
      setStats(compareData.bots[0] ?? null);
      setTrades(tradesData.trades ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load bot");
    } finally {
      setLoading(false);
    }
  }, [botId]);

  useEffect(() => {
    void loadBot();
  }, [loadBot]);

  async function uploadFile(file: File) {
    setMessage(null);
    setError(null);
    const form = new FormData();
    form.set("file", file);
    form.set("replace", "true");

    try {
      const res = await fetch(`/api/bots/${botId}/trades`, {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as BotUploadResponse & ApiErrorBody;
      if (!res.ok) throw new Error(data.message ?? "Upload failed");
      setMessage(`Imported ${data.imported} trade${data.imported === 1 ? "" : "s"}.`);
      await loadBot();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    }
  }

  async function deleteBot() {
    if (!bot || !confirm(`Delete bot "${bot.name}" and all its trades?`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/bots/${botId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json()) as ApiErrorBody;
        throw new Error(data.message ?? "Failed to delete bot");
      }
      router.push("/dashboard/bots");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete bot");
    }
  }

  function startEditingBalance() {
    setBalanceInput(bot?.startBalance != null ? String(bot.startBalance) : "");
    setEditingBalance(true);
  }

  async function saveStartBalance() {
    const parsed = balanceInput.trim() === "" ? null : Number(balanceInput.replace(/,/g, ""));
    if (parsed !== null && !Number.isFinite(parsed)) return;
    try {
      const res = await fetch(`/api/bots/${botId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startBalance: parsed }),
      });
      if (!res.ok) {
        const data = (await res.json()) as ApiErrorBody;
        throw new Error(data.message ?? "Failed to save balance");
      }
      setBot((prev) => (prev ? { ...prev, startBalance: parsed } : prev));
      setStats((prev) =>
        prev
          ? {
              ...prev,
              startBalance: parsed,
              endBalance: parsed != null ? parsed + prev.totalProfit : null,
            }
          : prev,
      );
      setEditingBalance(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save balance");
      setEditingBalance(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-q-text-3">
        Loading bot…
      </div>
    );
  }

  if (error && !bot) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/bots"
          className="inline-flex items-center gap-1 text-sm text-q-text-2 transition hover:text-q-brand"
        >
          ← Back to bots
        </Link>
        <div className="rounded-xl border border-q-loss/30 bg-q-loss/10 px-4 py-3 text-sm text-q-loss">
          {error}
        </div>
      </div>
    );
  }

  if (!bot) return null;

  const plTone = stats ? profitTone(stats.totalProfit) : "neutral";
  const plClass =
    plTone === "profit"
      ? "text-q-profit"
      : plTone === "loss"
        ? "text-q-loss"
        : "text-q-text";

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
          <div className="mt-3 flex items-center gap-3">
            <span
              className="h-4 w-4 shrink-0 rounded-full"
              style={{ backgroundColor: bot.color }}
            />
            <div>
              <h1 className="text-2xl font-semibold text-q-text">{bot.name}</h1>
              {bot.description ? (
                <p className="mt-1 text-sm text-q-text-2">{bot.description}</p>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/dashboard/bots/compare?ids=${encodeURIComponent(uniqueIds([botId]).join(","))}`}
            className="rounded-xl border border-q-border bg-q-surface px-4 py-2.5 text-sm font-medium text-q-text-2 transition hover:bg-q-hover hover:text-q-text"
          >
            Compare
          </Link>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadFile(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-xl bg-q-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-q-brand-h"
          >
            Upload CSV / XLSX
          </button>
          <button
            type="button"
            onClick={() => void deleteBot()}
            className="rounded-xl px-4 py-2.5 text-sm text-q-text-3 transition hover:text-q-loss"
          >
            Delete
          </button>
        </div>
      </div>

      {message ? (
        <div className="rounded-xl border border-q-profit/30 bg-q-profit/10 px-4 py-3 text-sm text-q-profit">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-q-loss/30 bg-q-loss/10 px-4 py-3 text-sm text-q-loss">
          {error}
        </div>
      ) : null}

      {stats && stats.tradeCount > 0 ? (
        <>
          {/* Tab bar */}
          <div className="flex items-center gap-1 rounded-xl border border-q-border bg-q-surface p-1">
            {(
              [
                { key: "overview", label: "Overview" },
                { key: "chart", label: "Chart" },
                { key: "positions", label: `Positions (${trades.length})` },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
                  tab === key
                    ? "bg-q-brand text-white shadow-sm"
                    : "text-q-text-2 hover:bg-q-hover hover:text-q-text"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Overview tab */}
          {tab === "overview" && (
            <div className="overflow-hidden rounded-xl border border-q-border bg-q-surface">
              <table className="w-full text-sm">
                <tbody>
                  {/* Section: Performance */}
                  <tr className="border-b border-q-border bg-q-surface-2">
                    <td colSpan={2} className="px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-q-text-3">
                      Performance
                    </td>
                  </tr>

                  <OverviewRow
                    icon={plTone === "loss" ? TrendingDown : TrendingUp}
                    iconClass={plTone === "profit" ? "text-q-profit" : plTone === "loss" ? "text-q-loss" : "text-q-text-3"}
                    label="Total P/L"
                    value={formatCurrency(stats.totalProfit)}
                    valueClass={plClass}
                  />
                  <OverviewRow
                    icon={Target}
                    iconClass="text-q-brand"
                    label="Win rate"
                    value={formatPercent(stats.winRate)}
                  />
                  <OverviewRow
                    icon={Zap}
                    iconClass="text-q-brand"
                    label="Profit factor"
                    value={stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2)}
                  />

                  {/* Section: Trade breakdown */}
                  <tr className="border-b border-q-border bg-q-surface-2">
                    <td colSpan={2} className="px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-q-text-3">
                      Trade breakdown
                    </td>
                  </tr>

                  <OverviewRow
                    icon={Activity}
                    iconClass="text-q-text-3"
                    label="Total trades"
                    value={String(stats.tradeCount)}
                  />
                  <OverviewRow
                    icon={ArrowUpRight}
                    iconClass="text-q-profit"
                    label="Buys"
                    value={String(trades.filter((t) => t.type.toLowerCase().includes("buy")).length)}
                    valueClass="text-q-profit"
                  />
                  <OverviewRow
                    icon={ArrowDownRight}
                    iconClass="text-q-loss"
                    label="Sells"
                    value={String(trades.filter((t) => t.type.toLowerCase().includes("sell")).length)}
                    valueClass="text-q-loss"
                  />
                  <OverviewRow
                    icon={TrendingUp}
                    iconClass="text-q-profit"
                    label="Wins"
                    value={String(stats.wins)}
                    valueClass="text-q-profit"
                  />
                  <OverviewRow
                    icon={TrendingDown}
                    iconClass="text-q-loss"
                    label="Losses"
                    value={String(stats.losses)}
                    valueClass="text-q-loss"
                  />

                  {/* Section: Balance */}
                  <tr className="border-b border-q-border bg-q-surface-2">
                    <td colSpan={2} className="px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-q-text-3">
                      Balance
                    </td>
                  </tr>

                  {/* Start balance — inline editable */}
                  <tr className="border-b border-q-border/50 last:border-0">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5 text-q-text-2">
                        <Wallet size={15} strokeWidth={2} className="shrink-0 text-q-text-3" />
                        Start balance
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {editingBalance ? (
                        <div className="flex items-center justify-end gap-2">
                          <input
                            type="number"
                            value={balanceInput}
                            onChange={(e) => setBalanceInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void saveStartBalance();
                              if (e.key === "Escape") setEditingBalance(false);
                            }}
                            placeholder="e.g. 10000"
                            autoFocus
                            className="w-36 rounded-lg border border-q-border bg-q-surface-2 px-3 py-1.5 text-sm tabular-nums text-q-text outline-none focus:border-q-brand"
                          />
                          <button
                            type="button"
                            onClick={() => void saveStartBalance()}
                            className="rounded-lg bg-q-brand p-1.5 text-white transition hover:bg-q-brand-h"
                          >
                            <Check size={13} strokeWidth={2.5} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingBalance(false)}
                            className="rounded-lg bg-q-surface-2 p-1.5 text-q-text-2 transition hover:text-q-text"
                          >
                            <X size={13} strokeWidth={2.5} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <span className={`font-semibold tabular-nums ${stats.startBalance != null ? "text-q-text" : "text-q-text-3"}`}>
                            {stats.startBalance != null ? formatCurrency(stats.startBalance) : "—"}
                          </span>
                          <button
                            type="button"
                            onClick={startEditingBalance}
                            className="text-q-text-3 transition hover:text-q-brand"
                            title="Set start balance"
                          >
                            <Pencil size={13} strokeWidth={2} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>

                  <OverviewRow
                    icon={Wallet}
                    iconClass={
                      stats.endBalance != null && stats.startBalance != null
                        ? profitTone(stats.endBalance - stats.startBalance) === "profit"
                          ? "text-q-profit"
                          : profitTone(stats.endBalance - stats.startBalance) === "loss"
                            ? "text-q-loss"
                            : "text-q-text-3"
                        : "text-q-text-3"
                    }
                    label="End balance"
                    value={stats.endBalance != null ? formatCurrency(stats.endBalance) : "—"}
                    valueClass={
                      stats.endBalance != null && stats.startBalance != null
                        ? profitTone(stats.endBalance - stats.startBalance) === "profit"
                          ? "text-q-profit"
                          : profitTone(stats.endBalance - stats.startBalance) === "loss"
                            ? "text-q-loss"
                            : "text-q-text"
                        : "text-q-text-3"
                    }
                    last
                  />
                </tbody>
              </table>
            </div>
          )}

          {/* Chart tab */}
          {tab === "chart" && (
            <div className="rounded-xl border border-q-border bg-q-surface p-5">
              <p className="mb-4 text-xs font-medium uppercase tracking-widest text-q-text-2">
                Cumulative P/L
              </p>
              <BotCompareChart
                series={[{ botId: bot.id, name: bot.name, color: bot.color, trades }]}
              />
            </div>
          )}

          {/* Positions tab */}
          {tab === "positions" && <BotTradesTable trades={trades} />}
        </>
      ) : (
        <div className="rounded-xl border border-q-border bg-q-surface px-6 py-14 text-center">
          <p className="text-sm text-q-text-2">No trades uploaded yet.</p>
          <p className="mt-1 text-sm text-q-text-3">
            Upload a CSV or XLSX Strategy Tester report to see performance stats.
          </p>
          <p className="mt-4 text-xs text-q-text-3">
            Sample format:{" "}
            <a
              href="/sample/ReportTester-304216.xlsx"
              download
              className="font-medium text-q-brand underline-offset-2 hover:underline"
            >
              ReportTester-304216.xlsx
            </a>
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  valueClass = "text-q-text",
  icon: Icon,
  iconClass = "bg-q-surface-2 text-q-text-2",
}: {
  label: string;
  value: string;
  valueClass?: string;
  icon?: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  iconClass?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-q-border bg-q-surface p-4">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-widest text-q-text-3">{label}</p>
        <p className={`mt-2 text-2xl font-bold tabular-nums ${valueClass}`}>{value}</p>
      </div>
      {Icon && (
        <div className={`shrink-0 rounded-lg p-2 ${iconClass}`}>
          <Icon size={18} strokeWidth={2} />
        </div>
      )}
    </div>
  );
}

function BalanceCard({
  label,
  value,
  editing,
  inputValue,
  onInputChange,
  onEdit,
  onSave,
  onCancel,
}: {
  label: string;
  value: number | null;
  editing: boolean;
  inputValue: string;
  onInputChange: (v: string) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-q-border bg-q-surface p-4">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-widest text-q-text-3">{label}</p>
        {editing ? (
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSave();
                if (e.key === "Escape") onCancel();
              }}
              placeholder="e.g. 10000"
              autoFocus
              className="w-full rounded-lg border border-q-border bg-q-surface-2 px-3 py-1.5 text-sm tabular-nums text-q-text outline-none focus:border-q-brand"
            />
            <button
              type="button"
              onClick={onSave}
              className="shrink-0 rounded-lg bg-q-brand p-1.5 text-white transition hover:bg-q-brand-h"
            >
              <Check size={14} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="shrink-0 rounded-lg bg-q-surface-2 p-1.5 text-q-text-2 transition hover:text-q-text"
            >
              <X size={14} strokeWidth={2.5} />
            </button>
          </div>
        ) : (
          <div className="mt-2 flex items-baseline gap-2">
            <p className={`text-2xl font-bold tabular-nums ${value != null ? "text-q-text" : "text-q-text-3"}`}>
              {value != null ? formatCurrency(value) : "—"}
            </p>
            <button
              type="button"
              onClick={onEdit}
              className="text-q-text-3 transition hover:text-q-brand"
              title="Set start balance"
            >
              <Pencil size={13} strokeWidth={2} />
            </button>
          </div>
        )}
      </div>
      <div className="shrink-0 rounded-lg bg-q-surface-2 p-2 text-q-text-2">
        <Wallet size={18} strokeWidth={2} />
      </div>
    </div>
  );
}

function OverviewRow({
  icon: Icon,
  iconClass = "text-q-text-3",
  label,
  value,
  valueClass = "text-q-text",
  last = false,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  iconClass?: string;
  label: string;
  value: string;
  valueClass?: string;
  last?: boolean;
}) {
  return (
    <tr className={`${last ? "" : "border-b border-q-border/50"} hover:bg-q-hover transition-colors`}>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2.5 text-q-text-2">
          <Icon size={15} strokeWidth={2} className={`shrink-0 ${iconClass}`} />
          {label}
        </div>
      </td>
      <td className={`px-5 py-3.5 text-right font-semibold tabular-nums ${valueClass}`}>
        {value}
      </td>
    </tr>
  );
}
