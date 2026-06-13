import { NextRequest, NextResponse } from "next/server";

import { authGuard, errorResponse } from "@/lib/api-error";
import { getCurrentUser } from "@/lib/supabase/auth-server";
import { listPnlEntries, listPnlEntriesForYear, upsertPnlEntry } from "@/lib/supabase/pnl";
import type { TradeDirection, TradeOutcome } from "@/types/pnl";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const guard = await authGuard();
  if (guard) return guard;

  const { id } = await context.params;
  const month = request.nextUrl.searchParams.get("month");
  const yearParam = request.nextUrl.searchParams.get("year");

  if (yearParam) {
    if (!/^\d{4}$/.test(yearParam)) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "year query param must be YYYY." },
        { status: 400 },
      );
    }
    try {
      const user = await getCurrentUser();
      const entries = await listPnlEntriesForYear(id, user!.id, parseInt(yearParam, 10));
      return NextResponse.json({ entries });
    } catch (error) {
      return errorResponse(error);
    }
  }

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "month query param must be YYYY-MM, or use year=YYYY." },
      { status: 400 },
    );
  }

  try {
    const user = await getCurrentUser();
    const entries = await listPnlEntries(id, user!.id, month);
    return NextResponse.json({ entries });
  } catch (error) {
    return errorResponse(error);
  }
}

type UpsertBody = {
  date?: string;
  profit?: number;
  note?: string | null;
  direction?: TradeDirection | null;
  outcome?: TradeOutcome | null;
  tradeCount?: number;
  tpCount?: number;
  beCount?: number;
  slCount?: number;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const guard = await authGuard();
  if (guard) return guard;

  const { id } = await context.params;

  let body: UpsertBody;
  try {
    body = (await request.json()) as UpsertBody;
  } catch {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Expected JSON body." },
      { status: 400 },
    );
  }

  const date = body.date?.trim();
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "date must be YYYY-MM-DD." },
      { status: 400 },
    );
  }

  const profit =
    body.profit != null && Number.isFinite(body.profit) ? body.profit : 0;
  const note = body.note ?? null;
  const validDirections: TradeDirection[] = ["buy", "sell"];
  const validOutcomes: TradeOutcome[] = ["sl", "be", "tp"];
  const direction = body.direction != null && validDirections.includes(body.direction) ? body.direction : null;
  const outcome = body.outcome != null && validOutcomes.includes(body.outcome) ? body.outcome : null;
  const toCount = (v: number | undefined) => (v != null && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
  const tradeCount = toCount(body.tradeCount);
  const tpCount = toCount(body.tpCount);
  const beCount = toCount(body.beCount);
  const slCount = toCount(body.slCount);

  try {
    const user = await getCurrentUser();
    const entry = await upsertPnlEntry(id, user!.id, date, profit, note, direction, outcome, tradeCount, tpCount, beCount, slCount);
    return NextResponse.json({ entry });
  } catch (error) {
    return errorResponse(error);
  }
}
