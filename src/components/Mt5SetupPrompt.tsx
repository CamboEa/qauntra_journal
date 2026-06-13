import Link from "next/link";

export function Mt5SetupPrompt({ compact = false }: { compact?: boolean }) {
  return (
    <div className="rounded-xl border border-q-border bg-q-surface px-6 py-10 text-center">
      <p className="text-sm font-semibold text-q-text">MT5 not connected yet</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-q-text-2">
        Generate a sync key and attach the QuatraSync indicator in MetaTrader 5 to see
        live account performance here.
      </p>
      {!compact ? (
        <ol className="mx-auto mt-6 max-w-sm space-y-2 pl-5 text-left text-sm text-q-text-2 list-decimal">
          <li>Open MT5 setup and click Generate sync key</li>
          <li>Copy the API key and sync URL into QuatraSync</li>
          <li>Keep MT5 running while you trade</li>
        </ol>
      ) : null}
      <Link
        href="/dashboard/setup"
        className="mt-6 inline-flex rounded-xl bg-q-brand px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-q-brand/20 transition hover:bg-q-brand-h"
      >
        Go to MT5 setup
      </Link>
      <p className="mt-4 text-xs text-q-text-3">
        Bot comparison works without MT5 — use the Bot comparison tab to upload Strategy
        Tester reports.
      </p>
    </div>
  );
}
