import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/supabase/auth-server";
import { getAccountSummary } from "@/lib/supabase/accounts";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getUserAccountId, getUserEmail } from "@/lib/supabase/users";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({
      authenticated: false,
      supabaseConfigured: isSupabaseConfigured(),
      account: null,
    });
  }

  const accountId = await getUserAccountId(user.id);
  const summary = accountId ? await getAccountSummary(accountId) : null;
  const email = (await getUserEmail(user.id)) ?? user.email ?? null;

  return NextResponse.json({
    authenticated: true,
    supabaseConfigured: isSupabaseConfigured(),
    user: { uid: user.id, email },
    account: accountId
      ? {
          accountId,
          mt5Login: summary?.mt5Login ?? null,
          lastSyncAt: summary?.lastSyncAt ?? null,
        }
      : null,
  });
}
