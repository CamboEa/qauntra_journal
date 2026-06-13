function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-q-surface-2 ${className}`} />;
}

export default function PnlAccountLoading() {
  return (
    <div className="flex flex-1 flex-col gap-5">
      {/* Breadcrumb */}
      <Pulse className="h-4 w-40" />

      {/* Tab bar */}
      <Pulse className="h-10 w-64 rounded-xl" />

      {/* Content area */}
      <div className="flex flex-1 flex-col gap-4">
        {/* Stats bar */}
        <div className="flex gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Pulse key={i} className="h-14 w-40 rounded-xl" />
          ))}
        </div>

        {/* Calendar grid */}
        <div className="flex flex-1 flex-col gap-2">
          {/* Month header */}
          <div className="flex items-center justify-between">
            <Pulse className="h-6 w-32" />
            <div className="flex gap-2">
              <Pulse className="h-8 w-8 rounded-lg" />
              <Pulse className="h-8 w-8 rounded-lg" />
            </div>
          </div>
          {/* Day labels */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <Pulse key={i} className="h-6" />
            ))}
          </div>
          {/* Weeks */}
          <div className="flex flex-1 flex-col gap-1">
            {Array.from({ length: 5 }).map((_, w) => (
              <div key={w} className="flex flex-1 gap-1">
                {Array.from({ length: 7 }).map((_, d) => (
                  <Pulse key={d} className="flex-1 rounded-xl" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
