import { NextResponse } from "next/server";

import { authGuard, errorResponse } from "@/lib/api-error";
import { getCurrentUser } from "@/lib/supabase/auth-server";
import { deletePnlAccount, getPnlAccount, updatePnlAccount } from "@/lib/supabase/pnl";

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
    const account = await getPnlAccount(id, user!.id);
    return NextResponse.json({ account });
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
    const body = (await request.json()) as { name?: string; balance?: number; targetProfit?: number };
    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "VALIDATION_ERROR", message: "Name is required." }, { status: 400 });
    }
    const balance = Number.isFinite(body.balance) ? (body.balance ?? 0) : 0;
    const targetProfit = Number.isFinite(body.targetProfit) ? (body.targetProfit ?? 0) : 0;
    const account = await updatePnlAccount(id, user!.id, { name, balance, targetProfit });
    return NextResponse.json({ account });
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
    await deletePnlAccount(id, user!.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
