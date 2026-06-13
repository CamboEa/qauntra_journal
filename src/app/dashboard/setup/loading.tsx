function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-q-surface-2 ${className}`} />;
}

export default function SetupLoading() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Pulse className="h-8 w-28" />
        <Pulse className="h-4 w-80" />
      </header>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Pulse key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
