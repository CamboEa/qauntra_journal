function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-q-surface-2 ${className}`} />;
}

export default function PerformanceLoading() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Pulse className="h-8 w-36" />
        <Pulse className="h-4 w-72" />
      </header>

      {/* Tabs */}
      <Pulse className="h-10 w-72 rounded-xl" />

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Pulse key={i} className="h-28 rounded-xl" />
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Pulse className="h-64 rounded-xl" />
        <Pulse className="h-64 rounded-xl" />
      </div>
    </div>
  );
}
