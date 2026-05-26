import "server-only";

import { getCurrentUser } from "@/lib/firebase/auth-server";
import { assertAccountOwner } from "@/lib/firebase/accounts";
import { getUserAccountId } from "@/lib/firebase/users";

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
  return getUserAccountId(user.uid);
}

export async function isUserConnected(): Promise<boolean> {
  return Boolean(await getAccountId());
}

export async function getAppConfig(): Promise<AppConfig> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const accountId = await getUserAccountId(user.uid);
  if (!accountId) {
    throw new Error("No MT5 sync key yet. Set up the indicator from the dashboard.");
  }

  await assertAccountOwner(accountId, user.uid);

  return { accountId, historyDays: getHistoryDays() };
}
