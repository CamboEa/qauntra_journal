import { format } from "date-fns";

/** MetaStats expects `YYYY-MM-DD HH:mm:ss.SSS` in broker timezone. */
export function formatMetaApiDateTime(date: Date): string {
  return format(date, "yyyy-MM-dd HH:mm:ss.SSS");
}

export function getDefaultDateRange(historyDays: number): {
  start: Date;
  end: Date;
} {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - historyDays);
  return { start, end };
}

export function parseQueryDate(value: string | null): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
