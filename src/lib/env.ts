import "server-only";

import { getCurrentUser } from "@/lib/supabase/auth-server";
import { assertAccountOwner } from "@/lib/supabase/accounts";
import { getUserAccountId } from "@/lib/supabase/users";

export type AppConfig = {
  accountId: string;
  historyDays: number;
};

export function getHistoryDays(): number {
  const historyDays = Number(process.env.HISTORY_DAYS ?? "90");
  return Number.isFinite(historyDays) && historyDays > 0 ? historyDays : 90;
}

export async function getAccountId(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return getUserAccountId(user.id);
}

export async function isUserConnected(): Promise<boolean> {
  return Boolean(await getAccountId());
}

export async function getAppConfig(): Promise<AppConfig> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const accountId = await getUserAccountId(user.id);
  if (!accountId) {
    throw new Error("No MT5 sync key yet. Set up the indicator from the dashboard.");
  }

  await assertAccountOwner(accountId, user.id);

  return { accountId, historyDays: getHistoryDays() };
}
