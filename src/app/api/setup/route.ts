import { NextResponse } from "next/server";

import { supabaseNotConfiguredResponse } from "@/lib/api-error";
import { createAccount, getAccountSummary } from "@/lib/supabase/accounts";
import { getCurrentUser } from "@/lib/supabase/auth-server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getUserAccountId } from "@/lib/supabase/users";

export const dynamic = "force-dynamic";

function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_URL?.trim()?.replace(/^/, "https://") ||
    "http://localhost:3000"
  );
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return supabaseNotConfiguredResponse();
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const accountId = await getUserAccountId(user.id);
  if (!accountId) {
    return NextResponse.json({ linked: false });
  }

  const summary = await getAccountSummary(accountId);

  return NextResponse.json({
    linked: true,
    accountId,
    mt5Login: summary.mt5Login,
    lastSyncAt: summary.lastSyncAt,
    syncUrl: `${appUrl()}/api/sync`,
  });
}

export async function POST() {
  if (!isSupabaseConfigured()) {
    return supabaseNotConfiguredResponse();
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const existingAccountId = await getUserAccountId(user.id);
  if (existingAccountId) {
    const summary = await getAccountSummary(existingAccountId);
    return NextResponse.json({
      accountId: existingAccountId,
      apiKey: null,
      message: "Sync key already created. Use /dashboard/setup if you need the URL again.",
      mt5Login: summary.mt5Login,
      lastSyncAt: summary.lastSyncAt,
      syncUrl: `${appUrl()}/api/sync`,
    });
  }

  const { accountId, apiKey } = await createAccount(user.id);

  return NextResponse.json({
    accountId,
    apiKey,
    syncUrl: `${appUrl()}/api/sync`,
  });
}
