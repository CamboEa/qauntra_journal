import { NextResponse } from "next/server";

import { isFirebaseConfigured, getDb } from "@/lib/firebase/admin";
import { getCurrentUser } from "@/lib/firebase/auth-server";
import { getUserAccountId } from "@/lib/firebase/users";
import { getAccountDoc } from "@/lib/firebase/accounts";
import { Timestamp } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

export async function GET() {
  const firebaseConfigured = isFirebaseConfigured();

  if (!firebaseConfigured) {
    return NextResponse.json({
      ok: false,
      firebaseConfigured: false,
      message: "Firebase env vars missing on server. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in Vercel.",
    });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({
      ok: false,
      firebaseConfigured: true,
      authenticated: false,
      message: "Not logged in.",
    });
  }

  const accountId = await getUserAccountId(user.uid);
  if (!accountId) {
    return NextResponse.json({
      ok: false,
      firebaseConfigured: true,
      authenticated: true,
      accountLinked: false,
      message: "No sync key generated yet. Go to Dashboard → Setup.",
    });
  }

  const account = await getAccountDoc(accountId);
  if (!account) {
    return NextResponse.json({
      ok: false,
      firebaseConfigured: true,
      authenticated: true,
      accountLinked: true,
      message: "Account doc not found in Firestore.",
    });
  }

  const lastSyncAt =
    account.lastSyncAt instanceof Timestamp
      ? account.lastSyncAt.toDate().toISOString()
      : null;

  const dealsSnap = await getDb()
    .collection("accounts")
    .doc(accountId)
    .collection("deals")
    .count()
    .get();

  const positionsSnap = await getDb()
    .collection("accounts")
    .doc(accountId)
    .collection("positions")
    .count()
    .get();

  return NextResponse.json({
    ok: true,
    firebaseConfigured: true,
    authenticated: true,
    accountLinked: true,
    mt5Login: account.mt5Login,
    balance: account.balance,
    equity: account.equity,
    lastSyncAt,
    dealsStored: dealsSnap.data().count,
    openPositionsStored: positionsSnap.data().count,
    message: lastSyncAt
      ? `Last sync: ${lastSyncAt}`
      : "Account exists but MT5 has never synced yet.",
  });
}
