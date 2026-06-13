import { NextResponse } from "next/server";

import { errorResponse, supabaseNotConfiguredResponse } from "@/lib/api-error";
import { assertAccountOwner, regenerateApiKey } from "@/lib/supabase/accounts";
import { getCurrentUser } from "@/lib/supabase/auth-server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getUserAccountId } from "@/lib/supabase/users";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!isSupabaseConfigured()) return supabaseNotConfiguredResponse();

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const accountId = await getUserAccountId(user.id);
  if (!accountId) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "No account found. Generate a sync key first." },
      { status: 404 },
    );
  }

  try {
    await assertAccountOwner(accountId, user.id);
    const apiKey = await regenerateApiKey(accountId);
    return NextResponse.json({ apiKey });
  } catch (error) {
    return errorResponse(error);
  }
}
