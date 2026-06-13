"use client";

import { format, parseISO } from "date-fns";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Pencil, Trash2 } from "lucide-react";

import { PnlCreateDialog } from "@/components/pnl/PnlCreateDialog";
import { PnlEditDialog } from "@/components/pnl/PnlEditDialog";
import { PageLoader } from "@/components/Spinner";
import { cacheGet, cacheSet } from "@/lib/client-cache";
import { formatCurrency } from "@/lib/format";
import type { PnlAccount } from "@/types/pnl";

const ACCOUNTS_KEY = "pnl-accounts";
const ACCOUNTS_TTL = 2 * 60 * 1000;

type ApiError = { message?: string };

function fmtDate(value: string): string {
  try {
    return format(parseISO(value), "MMM d, yyyy");
  } catch {
    return value;
  }
}

export function PnlAccountList() {
  const [accounts, setAccounts] = useState<PnlAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);

  // Edit state
  const [editingAccount, setEditingAccount] = useState<PnlAccount | null>(null);

  // Delete state
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    const cached = cacheGet<PnlAccount[]>(ACCOUNTS_KEY);
    if (cached) {
      setAccounts(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pnl/accounts");
      const data = (await res.json()) as { accounts: PnlAccount[] } & ApiError;
      if (!res.ok) throw new Error(data.message ?? "Failed to load accounts");
      cacheSet(ACCOUNTS_KEY, data.accounts, ACCOUNTS_TTL);
      setAccounts(data.accounts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this PNL account and all its entries?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/pnl/accounts/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json()) as ApiError;
        throw new Error(data.message ?? "Failed to delete");
      }
      setAccounts((prev) => {
        const next = prev.filter((a) => a.id !== id);
        cacheSet(ACCOUNTS_KEY, next, ACCOUNTS_TTL);
        return next;
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete account");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-q-text">PNL Tracker</h1>
          <p className="mt-1 text-sm text-q-text-2">
            Track daily profit & loss across named accounts.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="rounded-xl bg-q-brand px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-q-brand/20 transition hover:bg-q-brand-h"
        >
          New account
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <PageLoader label="Loading accounts…" />
      ) : error ? (
        <div className="rounded-xl border border-q-loss/30 bg-q-loss/10 px-4 py-3 text-sm text-q-loss">
          {error}
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-xl border border-q-border bg-q-surface px-6 py-16 text-center">
          <p className="text-sm text-q-text-2">No accounts yet.</p>
          <p className="mt-1 text-sm text-q-text-3">
            Create a PNL account to start tracking daily profits.
          </p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="mt-6 rounded-xl bg-q-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-q-brand-h"
          >
            Create your first account
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="group flex flex-col rounded-xl border border-q-border bg-q-surface p-5 transition hover:border-q-brand/40 hover:shadow-sm"
            >
              {/* Card header */}
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/dashboard/pnl/${account.id}`}
                  className="text-base font-semibold text-q-text transition-colors group-hover:text-q-brand"
                >
                  {account.name}
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingAccount(account)}
                    className="text-q-text-3 transition hover:text-q-brand"
                    aria-label="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={deleting === account.id}
                    onClick={() => void handleDelete(account.id)}
                    className="text-q-loss transition hover:text-q-loss/80 disabled:opacity-40"
                    aria-label="Delete"
                  >
                    {deleting === account.id ? "…" : <Trash2 size={14} />}
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="mt-4 flex flex-col gap-3">
                <div className="rounded-lg bg-q-surface-2 px-3 py-2.5">
                  <p className="text-xs text-q-text-3">Balance</p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums text-q-text">
                    {formatCurrency(account.balance)}
                  </p>
                </div>
                <div className="rounded-lg bg-q-surface-2 px-3 py-2.5">
                  <p className="text-xs text-q-text-3">Goal target</p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums text-q-profit">
                    {formatCurrency(account.targetProfit)}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <p className="mt-4 text-xs text-q-text-3">Created {fmtDate(account.createdAt)}</p>
            </div>
          ))}
        </div>
      )}

      <PnlCreateDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(account) => {
          setAccounts((prev) => {
            const next = [...prev, account];
            cacheSet(ACCOUNTS_KEY, next, ACCOUNTS_TTL);
            return next;
          });
        }}
      />

      <PnlEditDialog
        account={editingAccount}
        onClose={() => setEditingAccount(null)}
        onSaved={(updated) => {
          setAccounts((prev) => {
            const next = prev.map((a) => (a.id === updated.id ? updated : a));
            cacheSet(ACCOUNTS_KEY, next, ACCOUNTS_TTL);
            return next;
          });
          setEditingAccount(null);
        }}
      />
    </div>
  );
}
