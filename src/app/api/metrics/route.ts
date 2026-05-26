import { NextResponse } from "next/server";

import { apiGuard, errorResponse } from "@/lib/api-error";
import { fetchMetrics } from "@/lib/trading-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await apiGuard();
  if (guard) return guard;

  try {
    const metrics = await fetchMetrics();
    return NextResponse.json(metrics);
  } catch (error) {
    return errorResponse(error, "Failed to fetch account metrics");
  }
}
