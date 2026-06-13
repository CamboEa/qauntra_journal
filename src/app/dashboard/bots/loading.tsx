function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-q-surface-2 ${className}`} />;
}

export default function BotsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Pulse className="h-8 w-16" />
          <Pulse className="h-4 w-72" />
        </div>
        <Pulse className="h-10 w-24 rounded-xl" />
      </div>

      <div className="overflow-hidden rounded-xl border border-q-border bg-q-surface">
        <div className="border-b border-q-border bg-q-surface-2 px-5 py-3">
          <div className="flex gap-10">
            {["w-20", "w-12", "w-20", "w-16"].map((w, i) => (
              <Pulse key={i} className={`h-3 ${w}`} />
            ))}
          </div>
        </div>
        <div className="divide-y divide-q-border/50">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-10 px-5 py-4">
              <Pulse className="h-4 w-28" />
              <Pulse className="h-4 w-8" />
              <Pulse className="h-4 w-24" />
              <Pulse className="h-6 w-20 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
