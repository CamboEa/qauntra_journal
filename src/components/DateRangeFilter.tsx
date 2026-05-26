"use client";

type Props = {
  start: string;
  end: string;
  loading?: boolean;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  onApply: () => void;
};

const dateInputClass =
  "rounded-xl border border-q-border bg-q-bg px-3 py-2 text-sm text-q-text outline-none transition focus:border-q-brand focus:ring-2 focus:ring-q-brand/20 [color-scheme:dark]";

export function DateRangeFilter({
  start,
  end,
  loading,
  onStartChange,
  onEndChange,
  onApply,
}: Props) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-q-text-3">
          From
        </span>
        <input
          type="date"
          value={start}
          onChange={(e) => onStartChange(e.target.value)}
          className={dateInputClass}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-q-text-3">
          To
        </span>
        <input
          type="date"
          value={end}
          onChange={(e) => onEndChange(e.target.value)}
          className={dateInputClass}
        />
      </label>
      <button
        type="button"
        onClick={onApply}
        disabled={loading}
        className="rounded-xl bg-q-brand px-5 py-2 text-sm font-semibold text-white shadow-md shadow-q-brand/20 transition hover:bg-q-brand-h disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Loading…" : "Apply"}
      </button>
    </div>
  );
}
