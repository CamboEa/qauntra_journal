import "server-only";

import { cookies } from "next/headers";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";

import { AUTH_COOKIE_NAME } from "@/lib/constants";
import { initFirebaseApp } from "./admin";

const SESSION_EXPIRY_MS = 60 * 60 * 24 * 14 * 1000; // 14 days (Firebase max)

export function getAdminAuth() {
  initFirebaseApp();
  return getAuth();
}

export async function createAuthSessionCookie(idToken: string): Promise<string> {
  return getAdminAuth().createSessionCookie(idToken, {
    expiresIn: SESSION_EXPIRY_MS,
  });
}

export async function getCurrentUser(): Promise<DecodedIdToken | null> {
  const store = await cookies();
  const session = store.get(AUTH_COOKIE_NAME)?.value;
  if (!session) return null;

  try {
    return await getAdminAuth().verifySessionCookie(session, true);
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<DecodedIdToken> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export function authCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export function getSessionMaxAgeSeconds(): number {
  return SESSION_EXPIRY_MS / 1000;
}
