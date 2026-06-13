import { NextRequest, NextResponse } from "next/server";

import { authGuard, errorResponse } from "@/lib/api-error";
import { getCurrentUser } from "@/lib/supabase/auth-server";
import { getBotTrades, importBotTradesFromFile } from "@/lib/supabase/bots";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const guard = await authGuard();
  if (guard) return guard;

  const { id } = await context.params;

  try {
    const user = await getCurrentUser();
    const trades = await getBotTrades(id, user!.id);
    return NextResponse.json({ trades, count: trades.length });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const guard = await authGuard();
  if (guard) return guard;

  const { id } = await context.params;

  try {
    const form = await request.formData();
    const file = form.get("file");
    const replace = form.get("replace") === "true";

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "CSV or XLSX file is required." },
        { status: 400 },
      );
    }

    const buffer = await file.arrayBuffer();
    const user = await getCurrentUser();
    const result = await importBotTradesFromFile(
      id,
      user!.id,
      buffer,
      file.name,
      replace,
      file.type,
    );

    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
