import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/firebase/auth-server";
import { isFirebaseClientConfigured } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/firebase/admin";
import { isUserConnected } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();

  return NextResponse.json({
    firebaseConfigured: isFirebaseConfigured(),
    firebaseClientConfigured: isFirebaseClientConfigured(),
    authenticated: Boolean(user),
    configured:
      isFirebaseConfigured() &&
      Boolean(user) &&
      (await isUserConnected()),
  });
}
