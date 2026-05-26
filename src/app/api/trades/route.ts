import { NextRequest, NextResponse } from "next/server";

import { apiGuard, errorResponse } from "@/lib/api-error";
import { fetchHistoricalTrades } from "@/lib/trading-data";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const guard = await apiGuard();
  if (guard) return guard;

  try {
    const params = request.nextUrl.searchParams;
    const startParam = params.get("start");
    const endParam = params.get("end");

    const start = startParam ? new Date(startParam) : undefined;
    const end = endParam ? new Date(endParam) : undefined;

    const trades = await fetchHistoricalTrades({ start, end });
    return NextResponse.json({ trades, count: trades.length });
  } catch (error) {
    return errorResponse(error, "Failed to fetch trades");
  }
}
