import { NextResponse } from "next/server";

import { apiGuard, errorResponse } from "@/lib/api-error";
import { fetchOpenTrades } from "@/lib/trading-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await apiGuard();
  if (guard) return guard;

  try {
    const trades = await fetchOpenTrades();
    return NextResponse.json({ trades, count: trades.length });
  } catch (error) {
    return errorResponse(error, "Failed to fetch open trades");
  }
}
