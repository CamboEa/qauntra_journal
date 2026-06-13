import { NextRequest, NextResponse } from "next/server";

import { authGuard, errorResponse } from "@/lib/api-error";
import { getCurrentUser } from "@/lib/supabase/auth-server";
import { createBot, listBots } from "@/lib/supabase/bots";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await authGuard();
  if (guard) return guard;

  try {
    const user = await getCurrentUser();
    const bots = await listBots(user!.id);
    return NextResponse.json({ bots });
  } catch (error) {
    return errorResponse(error);
  }
}

type CreateBody = {
  name?: string;
  description?: string;
  color?: string;
};

export async function POST(request: NextRequest) {
  const guard = await authGuard();
  if (guard) return guard;

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Expected JSON body." },
      { status: 400 },
    );
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Bot name is required." },
      { status: 400 },
    );
  }

  try {
    const user = await getCurrentUser();
    const bot = await createBot(user!.id, {
      name,
      description: body.description,
      color: body.color,
    });
    return NextResponse.json({ bot });
  } catch (error) {
    return errorResponse(error);
  }
}
