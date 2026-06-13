function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-q-surface-2 ${className}`} />;
}

export default function CompareLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Pulse className="h-8 w-48" />
        <Pulse className="h-4 w-72" />
      </div>
      <div className="flex gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Pulse key={i} className="h-9 w-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Pulse key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
