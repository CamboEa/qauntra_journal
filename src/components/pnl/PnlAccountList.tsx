"use client";

import { format, parseISO } from "date-fns";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { PnlEditDialog } from "@/components/pnl/PnlEditDialog";
import { PageLoader } from "@/components/Spinner";
import { cacheDelete, cacheGet, cacheSet } from "@/lib/client-cache";
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

  // New account form state
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBalance, setNewBalance] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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

  function openForm() {
    setNewName("");
    setNewBalance("");
    setNewTarget("");
    setFormError(null);
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setFormError(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) {
      setFormError("Name is required.");
      return;
    }
    const balance = parseFloat(newBalance) || 0;
    const targetProfit = parseFloat(newTarget) || 0;
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch("/api/pnl/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, balance, targetProfit }),
      });
      const data = (await res.json()) as { account: PnlAccount } & ApiError;
      if (!res.ok) throw new Error(data.message ?? "Failed to create account");
      setAccounts((prev) => {
        const next = [...prev, data.account];
        cacheSet(ACCOUNTS_KEY, next, ACCOUNTS_TTL);
        return next;
      });
      setShowForm(false);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to create account");
    } finally {
      setSaving(false);
    }
  }

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
        {!showForm && (
          <button
            type="button"
            onClick={openForm}
            className="rounded-xl bg-q-brand px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-q-brand/20 transition hover:bg-q-brand-h"
          >
            New account
          </button>
        )}
      </div>

      {/* Inline new-account form */}
      {showForm && (
        <form
          onSubmit={(e) => void handleCreate(e)}
          className="rounded-xl border border-q-border bg-q-surface p-5"
        >
          <p className="mb-4 text-sm font-medium text-q-text">New PNL account</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-q-text-2">Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Main account"
                className="rounded-lg border border-q-border bg-q-bg px-3 py-2 text-sm text-q-text placeholder:text-q-text-3 focus:outline-none focus:ring-2 focus:ring-q-brand/30"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-q-text-2">Balance</label>
              <input
                type="number"
                step="0.01"
                value={newBalance}
                onChange={(e) => setNewBalance(e.target.value)}
                placeholder="0.00"
                className="rounded-lg border border-q-border bg-q-bg px-3 py-2 text-sm text-q-text placeholder:text-q-text-3 focus:outline-none focus:ring-2 focus:ring-q-brand/30"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-q-text-2">Goal target</label>
              <input
                type="number"
                step="0.01"
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value)}
                placeholder="0.00"
                className="rounded-lg border border-q-border bg-q-bg px-3 py-2 text-sm text-q-text placeholder:text-q-text-3 focus:outline-none focus:ring-2 focus:ring-q-brand/30"
              />
            </div>
          </div>
          {formError && (
            <p className="mt-3 text-xs text-q-loss">{formError}</p>
          )}
          <div className="mt-4 flex items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-q-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-q-brand-h disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={cancelForm}
              className="rounded-xl border border-q-border bg-q-surface px-4 py-2 text-sm text-q-text-2 transition hover:bg-q-hover hover:text-q-text"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

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
          {!showForm && (
            <button
              type="button"
              onClick={openForm}
              className="mt-6 rounded-xl bg-q-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-q-brand-h"
            >
              Create your first account
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                    className="text-xs text-q-text-3 transition hover:text-q-brand"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={deleting === account.id}
                    onClick={() => void handleDelete(account.id)}
                    className="text-xs text-q-loss transition hover:text-q-loss/80 disabled:opacity-40"
                  >
                    {deleting === account.id ? "…" : "Delete"}
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
