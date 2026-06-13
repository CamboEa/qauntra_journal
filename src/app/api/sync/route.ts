import { NextRequest, NextResponse } from "next/server";

import { syncErrorResponse } from "@/lib/api-error";
import { applySync } from "@/lib/supabase/accounts";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import type { SyncPayload } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "NOT_CONFIGURED", message: "Supabase is not configured on the server." },
      { status: 503 },
    );
  }

  const apiKey = request.headers.get("x-api-key")?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Missing X-Api-Key header." },
      { status: 401 },
    );
  }

  let body: SyncPayload;
  try {
    body = (await request.json()) as SyncPayload;
  } catch {
    return NextResponse.json(
      { error: "INVALID_BODY", message: "Expected JSON body." },
      { status: 400 },
    );
  }

  if (body.login == null || body.balance == null || body.equity == null) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        message: "Payload must include login, balance, and equity.",
      },
      { status: 400 },
    );
  }

  try {
    await applySync(apiKey, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return syncErrorResponse(error);
  }
}
