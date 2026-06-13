import { NextRequest, NextResponse } from "next/server";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { signOutUser } from "@/lib/supabase/auth-server";
import { ensureUser } from "@/lib/supabase/users";

export const dynamic = "force-dynamic";

type SessionBody = {
  access_token?: string;
  refresh_token?: string;
};

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "NOT_CONFIGURED", message: "Supabase is not configured." },
      { status: 503 },
    );
  }

  let body: SessionBody = {};
  try {
    body = (await request.json()) as SessionBody;
  } catch {
    /* optional body when cookies already present */
  }

  const supabase = await createClient();

  if (body.access_token && body.refresh_token) {
    const { error } = await supabase.auth.setSession({
      access_token: body.access_token,
      refresh_token: body.refresh_token,
    });

    if (error) {
      return NextResponse.json(
        { error: "AUTH_ERROR", message: error.message },
        { status: 401 },
      );
    }
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Sign in to continue." },
      { status: 401 },
    );
  }

  try {
    await ensureUser(user.id, user.email ?? "");
    return NextResponse.json({
      ok: true,
      uid: user.id,
      email: user.email,
    });
  } catch (error) {
    console.error("[Auth]", error);
    return NextResponse.json(
      { error: "AUTH_ERROR", message: "Could not initialize user profile." },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  await signOutUser();
  return NextResponse.json({ ok: true });
}
