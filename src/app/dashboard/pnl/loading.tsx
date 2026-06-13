function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-q-surface-2 ${className}`} />;
}

export default function PnlLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Pulse className="h-8 w-36" />
          <Pulse className="h-4 w-80" />
        </div>
        <Pulse className="h-10 w-32 rounded-xl" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-4 rounded-xl border border-q-border bg-q-surface p-5">
            <div className="flex justify-between">
              <Pulse className="h-5 w-28" />
              <div className="flex gap-2">
                <Pulse className="h-4 w-8" />
                <Pulse className="h-4 w-12" />
              </div>
            </div>
            <Pulse className="h-14 rounded-lg" />
            <Pulse className="h-14 rounded-lg" />
            <Pulse className="h-3 w-32 mt-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
