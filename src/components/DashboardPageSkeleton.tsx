function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-q-surface-2 ${className}`} />;
}

export function DashboardPageSkeleton({
  titleWidth = "w-40",
}: {
  titleWidth?: string;
}) {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <Pulse className={`h-8 ${titleWidth}`} />
        <Pulse className="h-4 w-72 max-w-full" />
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Pulse key={i} className="h-28 rounded-xl" />
        ))}
      </div>

      <Pulse className="h-36 rounded-xl" />

      <div className="overflow-hidden rounded-xl border border-q-border bg-q-surface">
        <div className="border-b border-q-border px-5 py-4">
          <Pulse className="h-4 w-32" />
        </div>
        <div className="space-y-3 p-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Pulse key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
