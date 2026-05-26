import { NextResponse } from "next/server";

import { errorResponse, firebaseNotConfiguredResponse } from "@/lib/api-error";
import { assertAccountOwner, regenerateApiKey } from "@/lib/firebase/accounts";
import { isFirebaseConfigured } from "@/lib/firebase/admin";
import { getCurrentUser } from "@/lib/firebase/auth-server";
import { getUserAccountId } from "@/lib/firebase/users";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!isFirebaseConfigured()) return firebaseNotConfiguredResponse();

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const accountId = await getUserAccountId(user.uid);
  if (!accountId) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "No account found. Generate a sync key first." },
      { status: 404 },
    );
  }

  try {
    await assertAccountOwner(accountId, user.uid);
    const apiKey = await regenerateApiKey(accountId);
    return NextResponse.json({ apiKey });
  } catch (error) {
    return errorResponse(error);
  }
}
