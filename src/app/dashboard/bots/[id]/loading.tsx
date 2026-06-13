function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-q-surface-2 ${className}`} />;
}

export default function BotDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Pulse className="h-4 w-40" />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Pulse className="h-10 w-10 rounded-xl" />
          <div className="space-y-2">
            <Pulse className="h-7 w-40" />
            <Pulse className="h-4 w-56" />
          </div>
        </div>
        <Pulse className="h-10 w-28 rounded-xl" />
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Pulse key={i} className="h-28 rounded-xl" />
        ))}
      </div>

      {/* Trades table */}
      <div className="overflow-hidden rounded-xl border border-q-border bg-q-surface">
        <div className="border-b border-q-border bg-q-surface-2 px-5 py-3">
          <Pulse className="h-4 w-28" />
        </div>
        <div className="divide-y divide-q-border/50">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-8 px-5 py-3.5">
              <Pulse className="h-4 w-16" />
              <Pulse className="h-4 w-24" />
              <Pulse className="h-4 w-20" />
              <Pulse className="h-4 w-16" />
              <Pulse className="h-4 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
