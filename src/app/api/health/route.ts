import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/supabase/auth-server";
import {
  countDeals,
  countPositions,
  getAccountDoc,
  getAccountSummary,
} from "@/lib/supabase/accounts";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getUserAccountId } from "@/lib/supabase/users";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabaseConfigured = isSupabaseConfigured();

  if (!supabaseConfigured) {
    return NextResponse.json({
      ok: false,
      supabaseConfigured: false,
      message:
        "Supabase env vars missing on server. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.",
    });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({
      ok: false,
      supabaseConfigured: true,
      authenticated: false,
      message: "Not logged in.",
    });
  }

  const accountId = await getUserAccountId(user.id);
  if (!accountId) {
    return NextResponse.json({
      ok: false,
      supabaseConfigured: true,
      authenticated: true,
      accountLinked: false,
      message: "No sync key generated yet. Go to Dashboard → Setup.",
    });
  }

  const account = await getAccountDoc(accountId);
  if (!account) {
    return NextResponse.json({
      ok: false,
      supabaseConfigured: true,
      authenticated: true,
      accountLinked: true,
      message: "Account row not found in Postgres.",
    });
  }

  const lastSyncAt = account.lastSyncAt;
  const dealsStored = await countDeals(accountId);
  const openPositionsStored = await countPositions(accountId);

  return NextResponse.json({
    ok: true,
    supabaseConfigured: true,
    authenticated: true,
    accountLinked: true,
    mt5Login: account.mt5Login,
    balance: account.balance,
    equity: account.equity,
    lastSyncAt,
    dealsStored,
    openPositionsStored,
    message: lastSyncAt
      ? `Last sync: ${lastSyncAt}`
      : "Account exists but MT5 has never synced yet.",
  });
}
