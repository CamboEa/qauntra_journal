export const inputClass =
  "w-full rounded-xl border border-q-border bg-q-bg px-3 py-2 text-sm text-q-text outline-none transition focus:border-q-brand focus:ring-2 focus:ring-q-brand/20";

export function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}
