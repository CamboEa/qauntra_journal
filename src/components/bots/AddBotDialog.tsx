"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { inputClass } from "@/components/bots/shared";
import type { ApiErrorBody } from "@/types/trading";
import type { Bot } from "@/types/bots";

type AddBotDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function AddBotDialog({ open, onClose }: AddBotDialogProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { bot: Bot } & ApiErrorBody;
      if (!res.ok) throw new Error(data.message ?? "Failed to create bot");

      onClose();
      setName("");
      setDescription("");
      router.push(`/dashboard/bots/${data.bot.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create bot");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-q-text/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <form
        onSubmit={(e) => void handleCreate(e)}
        className="relative w-full max-w-md rounded-2xl border border-q-border bg-q-surface p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-q-text">Add bot</h2>
        <p className="mt-1 text-sm text-q-text-2">
          Create a bot to track a strategy from MT5 Strategy Tester exports.
        </p>

        <div className="mt-5 space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-q-text-2">
              Name
            </span>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Grid v1 XAUUSD"
              className={inputClass}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-q-text-2">
              Description
            </span>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes"
              className={inputClass}
            />
          </label>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-q-loss/30 bg-q-loss/10 px-3.5 py-2.5 text-sm text-q-loss">
            {error}
          </p>
        ) : null}

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
            disabled={creating || !name.trim()}
            className="rounded-xl bg-q-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-q-brand-h disabled:opacity-60"
          >
            {creating ? "Creating…" : "Create bot"}
          </button>
        </div>
      </form>
    </div>
  );
}
