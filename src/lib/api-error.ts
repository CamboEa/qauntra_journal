import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/supabase/auth-server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { isUserConnected } from "@/lib/env";

export function supabaseNotConfiguredResponse() {
  return NextResponse.json(
    {
      error: "NOT_CONFIGURED",
      message:
        "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in .env.",
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

export async function authGuard() {
  if (!isSupabaseConfigured()) {
    return supabaseNotConfiguredResponse();
  }
  const user = await getCurrentUser();
  if (!user) {
    return unauthorizedResponse();
  }
  return null;
}

export async function apiGuard() {
  if (!isSupabaseConfigured()) {
    return supabaseNotConfiguredResponse();
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function getErrorMessage(error: unknown, fallback = "Request failed"): string {
  if (error instanceof Error) return error.message;

  if (isRecord(error)) {
    const message = error.message;
    if (typeof message === "string" && message.trim()) {
      const code = typeof error.code === "string" ? error.code : "";
      if (
        code === "42P01" ||
        code === "PGRST205" ||
        /relation .* does not exist/i.test(message) ||
        /Could not find the table/i.test(message)
      ) {
        if (/bots|bot_trades/i.test(message)) {
          return "Bot tables are missing. Run supabase/migrations/20240527000000_bots.sql in the Supabase SQL Editor.";
        }
        return "Database tables are missing. Run the SQL migrations in supabase/migrations/.";
      }
      return message;
    }
  }

  return fallback;
}

export function errorResponse(error: unknown, fallback = "Request failed") {
  const message = getErrorMessage(error, fallback);
  console.error("[Quatra]", error);
  return NextResponse.json({ error: "API_ERROR", message }, { status: 500 });
}

export function syncErrorResponse(error: unknown) {
  const message = getErrorMessage(error, "Sync failed");
  const status = message === "Invalid API key" ? 401 : 500;
  console.error("[Sync]", error);
  return NextResponse.json({ error: "SYNC_ERROR", message }, { status });
}
