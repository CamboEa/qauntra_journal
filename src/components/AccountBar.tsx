type AccountBarProps = {
  mt5Login: string | null;
  lastSyncAt: string | null;
};

export function AccountBar({ mt5Login, lastSyncAt }: AccountBarProps) {
  return (
    <div className="rounded-xl border border-q-border bg-q-surface-2 px-3 py-3">
      <div className="flex items-center gap-2">
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
            mt5Login ? "bg-q-profit shadow-sm shadow-q-profit/60" : "bg-q-text-3"
          }`}
        />
        <p className="text-xs font-medium text-q-text-2">
          {mt5Login ? `MT5 · ${mt5Login}` : "Waiting for first sync…"}
        </p>
      </div>
      {lastSyncAt ? (
        <p className="mt-1.5 pl-3.5 text-xs text-q-text-3">
          Updated{" "}
          {new Date(lastSyncAt).toLocaleString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      ) : null}
    </div>
  );
}
