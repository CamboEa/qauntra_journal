import "server-only";

import { cache } from "react";
import { revalidateTag, unstable_cache } from "next/cache";

import { getAdminClient } from "./admin";

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

  revalidateTag(`user-${userId}`, { expire: 0 });
}

export const getUserProfile = cache(
  async (userId: string): Promise<UserProfile | null> => {
    return unstable_cache(
      async () => {
        const admin = getAdminClient();
        const { data, error } = await admin
          .from("profiles")
          .select("id, email, account_id, created_at")
          .eq("id", userId)
          .maybeSingle();

        if (error) throw error;
        return data ? mapProfile(data as ProfileRow) : null;
      },
      [`user-profile-${userId}`],
      { tags: [`user-${userId}`], revalidate: 300 },
    )();
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
  revalidateTag(`user-${userId}`, { expire: 0 });
}

export async function getUserEmail(userId: string): Promise<string | null> {
  const profile = await getUserProfile(userId);
  return profile?.email ?? null;
}
