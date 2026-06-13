"use client";

import { useEffect, useState } from "react";

import type { PnlAccount } from "@/types/pnl";

type ApiError = { message?: string };

const inputClass =
  "w-full rounded-xl border border-q-border bg-q-bg px-3 py-2 text-sm text-q-text placeholder:text-q-text-3 outline-none focus:border-q-brand focus:ring-2 focus:ring-q-brand/20 transition";

type Props = {
  account: PnlAccount | null;
  onClose: () => void;
  onSaved: (updated: PnlAccount) => void;
};

export function PnlEditDialog({ account, onClose, onSaved }: Props) {
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [target, setTarget] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (account) {
      setName(account.name);
      setBalance(String(account.balance));
      setTarget(String(account.targetProfit));
      setError(null);
    }
  }, [account]);

  if (!account) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setError("Name is required."); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/pnl/accounts/${account!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          balance: parseFloat(balance) || 0,
          targetProfit: parseFloat(target) || 0,
        }),
      });
      const data = (await res.json()) as { account: PnlAccount } & ApiError;
      if (!res.ok) throw new Error(data.message ?? "Failed to update");
      onSaved(data.account);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-q-text/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="relative w-full max-w-md rounded-2xl border border-q-border bg-q-surface p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-q-text">Edit account</h2>
        <p className="mt-1 text-sm text-q-text-2">Update the name, balance, or goal target.</p>

        <div className="mt-5 space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-q-text-2">Name</span>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Main account"
              className={inputClass}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-q-text-2">Balance</span>
            <input
              type="number"
              step="0.01"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="0.00"
              className={inputClass}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-q-text-2">Goal target</span>
            <input
              type="number"
              step="0.01"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="0.00"
              className={inputClass}
            />
          </label>
        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-q-loss/30 bg-q-loss/10 px-3.5 py-2.5 text-sm text-q-loss">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-q-border px-4 py-2 text-sm font-medium text-q-text-2 transition hover:bg-q-hover"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-q-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-q-brand-h disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
