import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/firebase/auth-server";
import { getAccountSummary } from "@/lib/firebase/accounts";
import { isFirebaseConfigured } from "@/lib/firebase/admin";
import { getUserAccountId, getUserEmail } from "@/lib/firebase/users";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({
      authenticated: false,
      firebaseConfigured: isFirebaseConfigured(),
      account: null,
    });
  }

  const accountId = await getUserAccountId(user.uid);
  const summary = accountId ? await getAccountSummary(accountId) : null;
  const email = (await getUserEmail(user.uid)) ?? user.email ?? null;

  return NextResponse.json({
    authenticated: true,
    firebaseConfigured: isFirebaseConfigured(),
    user: { uid: user.uid, email },
    account: accountId
      ? {
          accountId,
          mt5Login: summary?.mt5Login ?? null,
          lastSyncAt: summary?.lastSyncAt ?? null,
        }
      : null,
  });
}
