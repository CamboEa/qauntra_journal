import { NextResponse } from "next/server";

import { authGuard, errorResponse } from "@/lib/api-error";
import { getCurrentUser } from "@/lib/supabase/auth-server";
import { deleteBot, getBotById, updateBotStartBalance, updateBotStatus } from "@/lib/supabase/bots";
import type { BotStatus } from "@/types/bots";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const guard = await authGuard();
  if (guard) return guard;

  const { id } = await context.params;

  try {
    const user = await getCurrentUser();
    const bot = await getBotById(id, user!.id);
    return NextResponse.json({ bot });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const guard = await authGuard();
  if (guard) return guard;

  const { id } = await context.params;

  try {
    const user = await getCurrentUser();
    const body = (await request.json()) as { startBalance?: number | null; status?: BotStatus | null };

    if ("status" in body) {
      const allowed: (BotStatus | null)[] = ["testing", "profitable", "losing", null];
      const status = allowed.includes(body.status as BotStatus | null) ? (body.status ?? null) : null;
      await updateBotStatus(id, user!.id, status);
      return NextResponse.json({ ok: true });
    }

    const startBalance =
      body.startBalance != null && Number.isFinite(body.startBalance)
        ? body.startBalance
        : null;
    await updateBotStartBalance(id, user!.id, startBalance);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const guard = await authGuard();
  if (guard) return guard;

  const { id } = await context.params;

  try {
    const user = await getCurrentUser();
    await deleteBot(id, user!.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
