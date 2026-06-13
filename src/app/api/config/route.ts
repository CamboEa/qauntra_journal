import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/supabase/auth-server";
import { isSupabaseClientConfigured } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { isUserConnected } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();

  return NextResponse.json({
    supabaseConfigured: isSupabaseConfigured(),
    supabaseClientConfigured: isSupabaseClientConfigured(),
    authenticated: Boolean(user),
    configured:
      isSupabaseConfigured() &&
      Boolean(user) &&
      (await isUserConnected()),
  });
}
