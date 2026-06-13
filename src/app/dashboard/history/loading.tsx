function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-q-surface-2 ${className}`} />;
}

export default function HistoryLoading() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Pulse className="h-8 w-36" />
        <Pulse className="h-4 w-72" />
      </header>

      {/* Date filters */}
      <div className="flex gap-3">
        <Pulse className="h-9 w-36 rounded-lg" />
        <Pulse className="h-9 w-36 rounded-lg" />
        <Pulse className="h-9 w-20 rounded-lg" />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-q-border bg-q-surface">
        <div className="border-b border-q-border bg-q-surface-2 px-5 py-3">
          <div className="flex gap-10">
            {["w-16", "w-24", "w-12", "w-20", "w-16"].map((w, i) => (
              <Pulse key={i} className={`h-3 ${w}`} />
            ))}
          </div>
        </div>
        <div className="divide-y divide-q-border/50">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-10 px-5 py-3.5">
              <Pulse className="h-4 w-16" />
              <Pulse className="h-4 w-20" />
              <Pulse className="h-4 w-12" />
              <Pulse className="h-4 w-16" />
              <Pulse className="h-4 w-14" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
