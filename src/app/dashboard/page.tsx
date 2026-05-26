import { DashboardGate } from "@/components/DashboardGate";
import { MetricsCards, PeriodSummary } from "@/components/MetricsCards";
import { OpenTradesTable } from "@/components/OpenTradesTable";
import { fetchMetrics, fetchOpenTrades } from "@/lib/trading-data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  return (
    <DashboardGate
      title="Overview"
      description="Attach the QuatraSync indicator in MT5 to track performance live."
    >
      <DashboardContent />
    </DashboardGate>
  );
}

async function DashboardContent() {
  let metricsError: string | null = null;
  let metrics = null;
  let openTrades: Awaited<ReturnType<typeof fetchOpenTrades>> = [];

  try {
    [metrics, openTrades] = await Promise.all([
      fetchMetrics(),
      fetchOpenTrades(),
    ]);
  } catch (error) {
    metricsError =
      error instanceof Error ? error.message : "Failed to load dashboard data";
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-q-text">Overview</h1>
        <p className="mt-1 text-sm text-q-text-2">
          Live account metrics synced from your MT5 terminal.
        </p>
      </header>

      {metricsError ? (
        <div className="rounded-xl border border-q-loss/30 bg-q-loss/10 px-4 py-3 text-sm text-q-loss">
          {metricsError}
        </div>
      ) : null}

      {metrics ? (
        <>
          <MetricsCards metrics={metrics} />
          <PeriodSummary metrics={metrics} />
        </>
      ) : null}

      <OpenTradesTable trades={openTrades} />
    </div>
  );
}
