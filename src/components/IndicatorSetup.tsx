"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type SetupResponse = {
  accountId: string;
  apiKey: string | null;
  syncUrl: string;
  message?: string;
  mt5Login?: string | null;
  lastSyncAt?: string | null;
};

type RegenerateResponse = {
  apiKey: string;
};

export function IndicatorSetup() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [setup, setSetup] = useState<SetupResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [regeneratedKey, setRegeneratedKey] = useState<string | null>(null);

  const loadExisting = useCallback(async () => {
    const res = await fetch("/api/setup");
    const data = (await res.json()) as SetupResponse & { linked?: boolean };
    if (data.linked) {
      setSetup(data);
    }
  }, []);

  useEffect(() => {
    void loadExisting();
  }, [loadExisting]);

  async function createSetup() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/setup", { method: "POST" });
      const data = (await res.json()) as SetupResponse & { message?: string };

      if (!res.ok) {
        throw new Error((data as { message?: string }).message ?? "Setup failed");
      }

      setSetup(data);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Setup failed");
    } finally {
      setLoading(false);
    }
  }

  async function copy(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  async function regenerate() {
    if (!confirm("This will invalidate your current API key. MT5 will stop syncing until you paste the new key. Continue?")) return;
    setRegenerating(true);
    setError(null);
    setRegeneratedKey(null);
    try {
      const res = await fetch("/api/setup/regenerate", { method: "POST" });
      const data = (await res.json()) as RegenerateResponse & { message?: string };
      if (!res.ok) throw new Error((data as { message?: string }).message ?? "Regenerate failed");
      setRegeneratedKey(data.apiKey);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Regenerate failed");
    } finally {
      setRegenerating(false);
    }
  }

  if (!setup) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-q-border bg-q-surface p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-q-text">
            Connect MT5 indicator
          </h2>
          <p className="mt-1.5 text-sm text-q-text-2">
            Generate a sync key, install the QuatraSync indicator in
            MetaTrader 5, and your trades will appear here automatically while
            MT5 is running.
          </p>
        </div>

        {error ? (
          <p className="rounded-xl border border-q-loss/30 bg-q-loss/10 px-3.5 py-2.5 text-sm text-q-loss">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => void createSetup()}
          disabled={loading}
          className="w-full rounded-xl bg-q-brand px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-q-brand/20 transition hover:bg-q-brand-h disabled:opacity-60"
        >
          {loading ? "Creating sync key…" : "Generate sync key"}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Credentials card */}
      <div className="rounded-xl border border-q-border bg-q-surface p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-q-text">
            MT5 indicator setup
          </h2>
          <p className="mt-1 text-sm text-q-text-2">
            Copy these values into the QuatraSync indicator inputs in MT5.
          </p>
        </div>

        {regeneratedKey ? (
          <div className="rounded-xl border border-q-warn/30 bg-q-warn/8 px-4 py-3 text-sm text-q-warn">
            New API key generated — save it now, it will not be shown again.
          </div>
        ) : setup.apiKey ? (
          <div className="rounded-xl border border-q-warn/30 bg-q-warn/8 px-4 py-3 text-sm text-q-warn">
            Save your API key now — it is only shown once on this screen.
          </div>
        ) : (
          <p className="text-sm text-q-text-3">{setup.message}</p>
        )}

        <dl className="space-y-4">
          {(setup.apiKey ?? regeneratedKey) ? (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-q-text-3">
                API key
              </dt>
              <dd className="mt-2 flex items-center gap-2">
                <code className="flex-1 break-all rounded-xl border border-q-border bg-q-bg px-3 py-2.5 font-mono text-xs text-q-profit">
                  {regeneratedKey ?? setup.apiKey}
                </code>
                <button
                  type="button"
                  onClick={() => void copy((regeneratedKey ?? setup.apiKey)!, "key")}
                  className="shrink-0 rounded-lg border border-q-border-2 bg-q-surface-2 px-3 py-2 text-xs font-medium text-q-text-2 transition hover:bg-q-hover hover:text-q-text"
                >
                  {copied === "key" ? "Copied!" : "Copy"}
                </button>
              </dd>
            </div>
          ) : null}

          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-q-text-3">
              Sync URL
            </dt>
            <dd className="mt-2 flex items-center gap-2">
              <code className="flex-1 break-all rounded-xl border border-q-border bg-q-bg px-3 py-2.5 font-mono text-xs text-q-text-2">
                {setup.syncUrl}
              </code>
              <button
                type="button"
                onClick={() => void copy(setup.syncUrl, "url")}
                className="shrink-0 rounded-lg border border-q-border-2 bg-q-surface-2 px-3 py-2 text-xs font-medium text-q-text-2 transition hover:bg-q-hover hover:text-q-text"
              >
                {copied === "url" ? "Copied!" : "Copy"}
              </button>
            </dd>
          </div>
        </dl>

        <div className="border-t border-q-border pt-4">
          {error ? (
            <p className="mb-3 rounded-xl border border-q-loss/30 bg-q-loss/10 px-3.5 py-2.5 text-sm text-q-loss">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => void regenerate()}
            disabled={regenerating}
            className="rounded-lg border border-q-border-2 bg-q-surface-2 px-3.5 py-2 text-xs font-medium text-q-text-2 transition hover:bg-q-hover hover:text-q-loss disabled:opacity-60"
          >
            {regenerating ? "Generating…" : "Regenerate API key"}
          </button>
          <p className="mt-1.5 text-xs text-q-text-3">
            Issues a new key and invalidates the old one.
          </p>
        </div>
      </div>

      {/* Steps card */}
      <div className="rounded-xl border border-q-border bg-q-surface p-6">
        <h3 className="text-xs font-medium uppercase tracking-wide text-q-text-3 mb-4">
          Setup steps
        </h3>
        <ol className="space-y-3 pl-5 list-decimal text-sm text-q-text-2">
          <li>
            Download{" "}
            <a
              href="/mt5/QuatraSync.mq5"
              download
              className="font-medium text-q-brand underline-offset-2 hover:underline"
            >
              QuatraSync.mq5
            </a>{" "}
            and open it in MetaEditor (File → Open Data Folder → MQL5 →
            Indicators).
          </li>
          <li>Compile (F7), then attach the indicator to any chart in MT5.</li>
          <li>
            In MT5: Tools → Options → Expert Advisors → enable algorithmic
            trading and add your sync URL to allowed WebRequest URLs.
          </li>
          <li>Paste your API key and sync URL into the indicator inputs.</li>
          <li>
            Keep MT5 running — data syncs every 15 seconds while you trade.
          </li>
        </ol>
      </div>

      {/* Sync status */}
      {setup.lastSyncAt ? (
        <p className="text-center text-sm font-medium text-q-profit">
          Last sync: {new Date(setup.lastSyncAt).toLocaleString()}
          {setup.mt5Login ? ` · MT5 login ${setup.mt5Login}` : ""}
        </p>
      ) : (
        <p className="text-center text-sm text-q-text-3">
          Waiting for first sync from MT5…
        </p>
      )}
    </div>
  );
}
