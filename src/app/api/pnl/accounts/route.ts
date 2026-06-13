import { NextRequest, NextResponse } from "next/server";

import { authGuard, errorResponse } from "@/lib/api-error";
import { getCurrentUser } from "@/lib/supabase/auth-server";
import { createPnlAccount, listPnlAccounts } from "@/lib/supabase/pnl";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await authGuard();
  if (guard) return guard;

  try {
    const user = await getCurrentUser();
    const accounts = await listPnlAccounts(user!.id);
    return NextResponse.json({ accounts });
  } catch (error) {
    return errorResponse(error);
  }
}

type CreateBody = {
  name?: string;
  balance?: number;
  targetProfit?: number;
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
      { error: "VALIDATION_ERROR", message: "Account name is required." },
      { status: 400 },
    );
  }

  const balance =
    body.balance != null && Number.isFinite(body.balance) ? body.balance : 0;
  const targetProfit =
    body.targetProfit != null && Number.isFinite(body.targetProfit)
      ? body.targetProfit
      : 0;

  try {
    const user = await getCurrentUser();
    const account = await createPnlAccount(user!.id, { name, balance, targetProfit });
    return NextResponse.json({ account });
  } catch (error) {
    return errorResponse(error);
  }
}
