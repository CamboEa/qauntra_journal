import "server-only";

import { cache } from "react";

import { getAccountSummary } from "@/lib/supabase/accounts";
import { getCurrentUser } from "@/lib/supabase/auth-server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/supabase/users";

export type DashboardContext = {
  supabaseOk: boolean;
  user: Awaited<ReturnType<typeof getCurrentUser>>;
  accountId: string | null;
  email: string | null;
  linked: boolean;
  account: { mt5Login: string | null; lastSyncAt: string | null } | null;
};

export const getDashboardContext = cache(async (): Promise<DashboardContext> => {
  const supabaseOk = isSupabaseConfigured();
  const user = await getCurrentUser();

  if (!user) {
    return {
      supabaseOk,
      user: null,
      accountId: null,
      email: null,
      linked: false,
      account: null,
    };
  }

  const profile = await getUserProfile(user.id);
  const accountId = profile?.accountId ?? null;
  const email = profile?.email ?? user.email ?? null;

  let account: DashboardContext["account"] = null;
  if (accountId) {
    const summary = await getAccountSummary(accountId);
    account = {
      mt5Login: summary.mt5Login,
      lastSyncAt: summary.lastSyncAt,
    };
  }

  return {
    supabaseOk,
    user,
    accountId,
    email,
    linked: Boolean(accountId),
    account,
  };
});
