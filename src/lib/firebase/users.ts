import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { getDb } from "./admin";

const USERS = "users";

export type UserDoc = {
  email: string;
  accountId: string | null;
  createdAt: Timestamp;
};

export async function ensureUser(userId: string, email: string): Promise<void> {
  const ref = getDb().collection(USERS).doc(userId);
  const snap = await ref.get();

  if (!snap.exists) {
    await ref.set({
      email,
      accountId: null,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
}

export async function getUserAccountId(userId: string): Promise<string | null> {
  const snap = await getDb().collection(USERS).doc(userId).get();
  if (!snap.exists) return null;
  const data = snap.data() as UserDoc;
  return data.accountId ?? null;
}

export async function linkAccountToUser(
  userId: string,
  accountId: string,
): Promise<void> {
  await getDb().collection(USERS).doc(userId).set(
    { accountId },
    { merge: true },
  );
}

export async function getUserEmail(userId: string): Promise<string | null> {
  const snap = await getDb().collection(USERS).doc(userId).get();
  if (!snap.exists) return null;
  return (snap.data() as UserDoc).email ?? null;
}
