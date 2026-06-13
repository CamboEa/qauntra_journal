"use client";

import {
  addMonths,
  format,
  getDay,
  getDaysInMonth,
  startOfMonth,
  subMonths,
} from "date-fns";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { formatCurrency } from "@/lib/format";
import type { PnlAccount, PnlEntry, TradeDirection, TradeOutcome } from "@/types/pnl";

type ApiError = { message?: string };

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toDateString(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function todayString(): string {
  return toDateString(new Date());
}

type Props = {
  accountId: string;
  hideBreadcrumb?: boolean;
  onYearlyView?: () => void;
  /** Pass the already-fetched account to skip a redundant network round-trip. */
  initialAccount?: PnlAccount;
};

export function PnlCalendarView({ accountId, hideBreadcrumb = false, onYearlyView, initialAccount }: Props) {
  const [account, setAccount] = useState<PnlAccount | null>(initialAccount ?? null);
  const [entries, setEntries] = useState<PnlEntry[]>([]);
  const [currentMonth, setCurrentMonth] = useState<Date>(() =>
    startOfMonth(new Date()),
  );
  const [loadingAccount, setLoadingAccount] = useState(!initialAccount);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // Day editor state
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editProfit, setEditProfit] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editDirection, setEditDirection] = useState<TradeDirection | null>(null);
  const [editOutcome, setEditOutcome] = useState<TradeOutcome | null>(null);
  const [editTradeCount, setEditTradeCount] = useState("");
  const [editTpCount, setEditTpCount] = useState("");
  const [editBeCount, setEditBeCount] = useState("");
  const [editSlCount, setEditSlCount] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const monthParam = format(currentMonth, "yyyy-MM");

  const fetchAccount = useCallback(async () => {
    if (initialAccount) return; // already provided by parent — skip the fetch
    setLoadingAccount(true);
    try {
      const res = await fetch(`/api/pnl/accounts/${accountId}`);
      const data = (await res.json()) as { account: PnlAccount } & ApiError;
      if (!res.ok) throw new Error(data.message ?? "Failed to load account");
      setAccount(data.account);
    } catch (e) {
      setPageError(e instanceof Error ? e.message : "Failed to load account");
    } finally {
      setLoadingAccount(false);
    }
  }, [accountId, initialAccount]);

  const fetchEntries = useCallback(async () => {
    setLoadingEntries(true);
    try {
      const res = await fetch(`/api/pnl/accounts/${accountId}/entries?month=${monthParam}`);
      const data = (await res.json()) as { entries: PnlEntry[] } & ApiError;
      if (!res.ok) throw new Error(data.message ?? "Failed to load entries");
      setEntries(data.entries);
    } catch {
      // non-fatal
    } finally {
      setLoadingEntries(false);
    }
  }, [accountId, monthParam]);

  useEffect(() => { void fetchAccount(); }, [fetchAccount]);
  useEffect(() => { void fetchEntries(); }, [fetchEntries]);

  const entryMap = new Map<string, PnlEntry>();
  for (const entry of entries) entryMap.set(entry.date, entry);

  const totalProfit = entries.reduce((sum, e) => sum + e.profit, 0);

  // Best / worst day stats
  const daysWithEntries = entries.filter((e) => e.profit !== 0);
  const bestEntry = daysWithEntries.length
    ? daysWithEntries.reduce((a, b) => (a.profit >= b.profit ? a : b))
    : null;
  const worstEntry = daysWithEntries.length
    ? daysWithEntries.reduce((a, b) => (a.profit <= b.profit ? a : b))
    : null;

  function fmtStatDate(dateStr: string) {
    return format(new Date(dateStr + "T00:00:00"), "d-MMM");
  }

  function selectDay(dateStr: string) {
    const existing = entryMap.get(dateStr);
    setSelectedDate(dateStr);
    setEditProfit(existing ? String(existing.profit) : "");
    setEditNote(existing?.note ?? "");
    setEditDirection(existing?.direction ?? null);
    setEditOutcome(existing?.outcome ?? null);
    setEditTradeCount(existing ? String(existing.tradeCount) : "");
    setEditTpCount(existing ? String(existing.tpCount) : "");
    setEditBeCount(existing ? String(existing.beCount) : "");
    setEditSlCount(existing ? String(existing.slCount) : "");
    setSaveError(null);
  }

  function cancelEdit() {
    setSelectedDate(null);
    setSaveError(null);
  }

  async function saveEntry(
    profit: number,
    note: string | null,
    direction: TradeDirection | null,
    outcome: TradeOutcome | null,
    tradeCount: number,
    tpCount: number,
    beCount: number,
    slCount: number,
  ) {
    if (!selectedDate) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/pnl/accounts/${accountId}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate, profit, note, direction, outcome, tradeCount, tpCount, beCount, slCount }),
      });
      const data = (await res.json()) as { entry: PnlEntry } & ApiError;
      if (!res.ok) throw new Error(data.message ?? "Failed to save entry");
      setEntries((prev) => {
        const next = prev.filter((e) => e.date !== selectedDate);
        next.push(data.entry);
        return next.sort((a, b) => a.date.localeCompare(b.date));
      });
      setSelectedDate(null);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save entry");
    } finally {
      setSaving(false);
    }
  }

  function toCount(v: string) {
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const profit = parseFloat(editProfit);
    await saveEntry(
      Number.isFinite(profit) ? profit : 0,
      editNote.trim() || null,
      editDirection,
      editOutcome,
      toCount(editTradeCount),
      toCount(editTpCount),
      toCount(editBeCount),
      toCount(editSlCount),
    );
  }

  async function handleClear() {
    await saveEntry(0, null, null, null, 0, 0, 0, 0);
  }

  // Build calendar cells
  const daysInMonth = getDaysInMonth(currentMonth);
  const firstWeekday = getDay(startOfMonth(currentMonth));
  const today = todayString();

  const cells: Array<{ day: number; dateStr: string } | null> = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, dateStr: `${monthParam}-${String(d).padStart(2, "0")}` });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  // Group into weeks
  const weeks: Array<typeof cells> = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const navBtnClass =
    "flex h-7 w-7 items-center justify-center rounded-lg border border-q-border bg-q-surface text-q-text-2 transition hover:bg-q-hover hover:text-q-text text-sm";

  if (loadingAccount) {
    return <div className="flex items-center justify-center py-20 text-sm text-q-text-3">Loading…</div>;
  }

  if (pageError) {
    return (
      <div className="rounded-xl border border-q-loss/30 bg-q-loss/10 px-4 py-3 text-sm text-q-loss">
        {pageError}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* Breadcrumb */}
      {!hideBreadcrumb && (
        <div className="flex items-center gap-2 text-sm text-q-text-3">
          <Link href="/dashboard/pnl" className="transition hover:text-q-text">PNL Tracker</Link>
          <span>/</span>
          <span className="text-q-text">{account?.name ?? "Account"}</span>
        </div>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Highest Profitable Date", value: bestEntry ? fmtStatDate(bestEntry.date) : "—", color: "text-q-text" },
          { label: "Highest Profitable Day",  value: bestEntry ? formatCurrency(bestEntry.profit) : "—", color: "text-q-profit" },
          { label: "Highest Losing Date",     value: worstEntry ? fmtStatDate(worstEntry.date) : "—", color: "text-q-text" },
          { label: "Highest Losing Day",      value: worstEntry ? formatCurrency(worstEntry.profit) : "—", color: "text-q-loss" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-q-border bg-q-surface px-4 py-3">
            <p className="text-xs text-q-text-3">{label}</p>
            <p className={`mt-1 text-lg font-bold tabular-nums ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setCurrentMonth((m) => startOfMonth(subMonths(m, 1)))} className={navBtnClass}>←</button>
          <button type="button" onClick={() => setCurrentMonth((m) => startOfMonth(addMonths(m, 1)))} className={navBtnClass}>→</button>
          <h2 className="text-base font-semibold text-q-text">
            {format(currentMonth, "MMM yyyy")}
          </h2>
          <span className={`ml-2 text-base font-bold tabular-nums ${totalProfit > 0 ? "text-q-profit" : totalProfit < 0 ? "text-q-loss" : "text-q-text-3"}`}>
            {totalProfit > 0 ? "+" : ""}{formatCurrency(totalProfit)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onYearlyView && (
            <button
              type="button"
              onClick={onYearlyView}
              className="rounded-lg border border-q-border bg-q-surface px-3 py-1.5 text-xs font-medium text-q-text-2 transition hover:bg-q-hover hover:text-q-text"
            >
              Yearly View
            </button>
          )}
          <button
            type="button"
            onClick={() => setCurrentMonth(startOfMonth(new Date()))}
            className="rounded-lg bg-q-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-q-brand-h"
          >
            Today
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-q-border">
        {/* Day-of-week header */}
        <div className="grid border-b border-q-border bg-q-surface-2" style={{ gridTemplateColumns: "repeat(7, 1fr) 130px" }}>
          {DAY_LABELS.map((label) => (
            <div key={label} className="py-2 text-center text-xs font-medium uppercase tracking-widest text-q-text-3">
              {label}
            </div>
          ))}
          <div className="py-2 text-center text-xs font-medium uppercase tracking-widest text-q-text-3">
            Weekly
          </div>
        </div>

        {/* Week rows */}
        <div className="flex flex-1 flex-col">
        {weeks.map((week, wi) => {
          const weekProfit = week.reduce((s, c) => s + (c ? (entryMap.get(c.dateStr)?.profit ?? 0) : 0), 0);
          const weekTrades = week.reduce((s, c) => s + (c ? (entryMap.get(c.dateStr)?.tradeCount ?? 0) : 0), 0);

          return (
            <div
              key={wi}
              className={`flex-1 grid min-h-16 ${wi < weeks.length - 1 ? "border-b border-q-border" : ""}`}
              style={{ gridTemplateColumns: "repeat(7, 1fr) 130px" }}
            >
              {week.map((cell, ci) => {
                const isLastCol = ci === 6;
                const borderR = !isLastCol ? "border-r border-q-border" : "";

                if (!cell) {
                  return <div key={`e-${wi}-${ci}`} className={`bg-q-surface-2/40 ${borderR}`} />;
                }

                const { day, dateStr } = cell;
                const entry = entryMap.get(dateStr);
                const isToday = dateStr === today;
                const hasProfit = entry && entry.profit > 0;
                const hasLoss = entry && entry.profit < 0;

                let cellBg = "bg-q-surface hover:bg-q-hover";
                let textColor = "text-q-text";
                let subColor = "text-q-text-3";
                let dayNumColor = isToday ? "text-q-brand font-bold" : "text-q-text-3";

                if (hasProfit) {
                  cellBg = "bg-q-profit hover:bg-q-profit/90";
                  textColor = "text-white";
                  subColor = "text-white/80";
                  dayNumColor = isToday ? "text-white font-bold underline" : "text-white/70";
                } else if (hasLoss) {
                  cellBg = "bg-q-loss hover:bg-q-loss/90";
                  textColor = "text-white";
                  subColor = "text-white/80";
                  dayNumColor = isToday ? "text-white font-bold underline" : "text-white/70";
                }

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => selectDay(dateStr)}
                    className={`relative flex h-full w-full flex-col p-2 text-left transition-colors ${cellBg} ${borderR}`}
                  >
                    <span className={`text-xs ${dayNumColor}`}>{day}</span>
                    {entry && (
                      <div className="flex flex-1 flex-col items-center justify-center gap-0.5">
                        <span className={`text-base font-bold tabular-nums leading-tight ${textColor}`}>
                          {entry.profit > 0 ? "+" : ""}{formatCurrency(entry.profit)}
                        </span>
                        {entry.tradeCount > 0 && (
                          <span className={`text-xs ${subColor}`}>{entry.tradeCount} Trades</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}

              {/* Weekly summary cell */}
              <div className="flex flex-col items-center justify-center border-l border-q-border px-3 py-2 text-center">
                {weekTrades > 0 ? (
                  <>
                    <span className={`text-sm font-bold tabular-nums ${weekProfit > 0 ? "text-q-profit" : weekProfit < 0 ? "text-q-loss" : "text-q-text-3"}`}>
                      {weekProfit > 0 ? "+" : ""}{formatCurrency(weekProfit)}
                    </span>
                    <span className="mt-0.5 text-xs text-q-text-3">{weekTrades} Trades</span>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-bold text-q-text-3">{formatCurrency(0)}</span>
                    <span className="mt-0.5 text-xs text-q-text-3">0 Trades</span>
                  </>
                )}
              </div>
            </div>
          );
        })}

        </div>{/* end weeks wrapper */}

        {loadingEntries && (
          <div className="border-t border-q-border px-5 py-2 text-xs text-q-text-3">
            Loading entries…
          </div>
        )}
      </div>

      {/* Day editor modal */}
      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-q-text/20 backdrop-blur-sm"
            onClick={cancelEdit}
          />
          <form
            onSubmit={(e) => void handleSave(e)}
            className="relative w-full max-w-md rounded-2xl border border-q-border bg-q-surface p-6 shadow-xl"
          >
            <h2 className="text-lg font-semibold text-q-text">
              {format(new Date(selectedDate + "T00:00:00"), "MMMM d, yyyy")}
            </h2>
            <p className="mt-1 text-sm text-q-text-2">Enter your P&amp;L for this day.</p>

            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Trades", value: editTradeCount, set: setEditTradeCount, color: "text-q-text" },
                  { label: "TP",     value: editTpCount,    set: setEditTpCount,    color: "text-q-profit" },
                  { label: "BE",     value: editBeCount,    set: setEditBeCount,    color: "text-q-text-2" },
                  { label: "SL",     value: editSlCount,    set: setEditSlCount,    color: "text-q-loss" },
                ].map(({ label, value, set, color }) => (
                  <label key={label} className="block space-y-1.5">
                    <span className={`text-xs font-semibold uppercase tracking-wide ${color}`}>{label}</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={value}
                      onChange={(e) => set(e.target.value)}
                      placeholder="0"
                      className="w-full rounded-xl border border-q-border bg-q-bg px-3 py-2 text-sm text-q-text placeholder:text-q-text-3 outline-none focus:border-q-brand focus:ring-2 focus:ring-q-brand/20 transition"
                    />
                  </label>
                ))}
              </div>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-q-text-2">P&amp;L amount</span>
                <input
                  type="number"
                  step="0.01"
                  value={editProfit}
                  onChange={(e) => setEditProfit(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                  className="w-full rounded-xl border border-q-border bg-q-bg px-3 py-2 text-sm text-q-text placeholder:text-q-text-3 outline-none focus:border-q-brand focus:ring-2 focus:ring-q-brand/20 transition"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-q-text-2">Note (optional)</span>
                <textarea
                  rows={3}
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Add a note…"
                  className="w-full resize-none rounded-xl border border-q-border bg-q-bg px-3 py-2 text-sm text-q-text placeholder:text-q-text-3 outline-none focus:border-q-brand focus:ring-2 focus:ring-q-brand/20 transition"
                />
              </label>
            </div>

            {saveError && (
              <p className="mt-4 rounded-xl border border-q-loss/30 bg-q-loss/10 px-3.5 py-2.5 text-sm text-q-loss">
                {saveError}
              </p>
            )}

            <div className="mt-6 flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleClear()}
                className="rounded-xl border border-q-border px-4 py-2 text-sm text-q-text-3 transition hover:bg-q-hover hover:text-q-text disabled:opacity-50"
              >
                Clear
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-xl border border-q-border px-4 py-2 text-sm font-medium text-q-text-2 transition hover:bg-q-hover"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-q-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-q-brand-h disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
