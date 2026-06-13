type Props = { className?: string; size?: "sm" | "md" | "lg" };

const SIZE = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-8 w-8" };

export function Spinner({ className, size = "md" }: Props) {
  return (
    <svg
      className={`animate-spin ${SIZE[size]} ${className ?? "text-q-brand"}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" className="opacity-20" />
      <path
        d="M12 3a9 9 0 0 1 9 9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PageLoader({ label }: { label?: string }) {
  return (
    <div className="flex flex-1 items-center justify-center gap-3 py-20 text-sm text-q-text-3">
      <Spinner />
      <span>{label ?? "Loading…"}</span>
    </div>
  );
}
