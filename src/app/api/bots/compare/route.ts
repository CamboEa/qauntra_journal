import { NextRequest, NextResponse } from "next/server";

import { authGuard, errorResponse } from "@/lib/api-error";
import { getCurrentUser } from "@/lib/supabase/auth-server";
import { compareBots } from "@/lib/supabase/bots";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const guard = await authGuard();
  if (guard) return guard;

  const ids = request.nextUrl.searchParams.get("ids")?.split(",").filter(Boolean) ?? [];
  if (ids.length === 0) {
    return NextResponse.json({ bots: [], rankedByProfit: [] });
  }

  try {
    const user = await getCurrentUser();
    const bots = await compareBots(user!.id, ids);
    return NextResponse.json({
      bots,
      rankedByProfit: bots.map((bot) => bot.botId),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
