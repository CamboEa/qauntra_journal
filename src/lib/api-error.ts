import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/firebase/auth-server";
import { isFirebaseConfigured } from "@/lib/firebase/admin";
import { isUserConnected } from "@/lib/env";

export function firebaseNotConfiguredResponse() {
  return NextResponse.json(
    {
      error: "NOT_CONFIGURED",
      message:
        "Firebase is not configured. Set FIREBASE_* and NEXT_PUBLIC_FIREBASE_* in .env. See README.md.",
    },
    { status: 503 },
  );
}

export function unauthorizedResponse() {
  return NextResponse.json(
    {
      error: "UNAUTHORIZED",
      message: "Sign in to continue.",
    },
    { status: 401 },
  );
}

export function notConnectedResponse() {
  return NextResponse.json(
    {
      error: "NOT_CONNECTED",
      message: "Generate a sync key and set up the QuatraSync indicator in MT5.",
    },
    { status: 401 },
  );
}

export async function apiGuard() {
  if (!isFirebaseConfigured()) {
    return firebaseNotConfiguredResponse();
  }
  const user = await getCurrentUser();
  if (!user) {
    return unauthorizedResponse();
  }
  if (!(await isUserConnected())) {
    return notConnectedResponse();
  }
  return null;
}

export function errorResponse(error: unknown, fallback = "Request failed") {
  const message = error instanceof Error ? error.message : fallback;
  console.error("[Quatra]", error);
  return NextResponse.json({ error: "API_ERROR", message }, { status: 500 });
}

export function syncErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Sync failed";
  const status = message === "Invalid API key" ? 401 : 500;
  console.error("[Sync]", error);
  return NextResponse.json({ error: "SYNC_ERROR", message }, { status });
}
