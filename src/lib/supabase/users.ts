import "server-only";

import { cache } from "react";

import { getAdminClient } from "./admin";

const TTL_MS = 60_000;

type CacheEntry<T> = { value: T; expiresAt: number };
const profileCache = new Map<string, CacheEntry<UserProfile | null>>();

export type UserProfile = {
  email: string;
  accountId: string | null;
  createdAt: string;
};

type ProfileRow = {
  id: string;
  email: string;
  account_id: string | null;
  created_at: string;
};

function mapProfile(row: ProfileRow): UserProfile {
  return {
    email: row.email,
    accountId: row.account_id,
    createdAt: row.created_at,
  };
}

export async function ensureUser(userId: string, email: string): Promise<void> {
  const admin = getAdminClient();
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (existing) return;

  const { error } = await admin.from("profiles").insert({
    id: userId,
    email,
  });

  if (error && error.code !== "23505") {
    throw error;
  }

  profileCache.delete(userId);
}

export const getUserProfile = cache(
  async (userId: string): Promise<UserProfile | null> => {
    const hit = profileCache.get(userId);
    if (hit && hit.expiresAt > Date.now()) return hit.value;

    const admin = getAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .select("id, email, account_id, created_at")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;

    const value = data ? mapProfile(data as ProfileRow) : null;
    profileCache.set(userId, { value, expiresAt: Date.now() + TTL_MS });
    return value;
  },
);

export async function getUserAccountId(userId: string): Promise<string | null> {
  const profile = await getUserProfile(userId);
  return profile?.accountId ?? null;
}

export async function linkAccountToUser(
  userId: string,
  accountId: string,
): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ account_id: accountId })
    .eq("id", userId);

  if (error) throw error;
  profileCache.delete(userId);
}

export async function getUserEmail(userId: string): Promise<string | null> {
  const profile = await getUserProfile(userId);
  return profile?.email ?? null;
}
