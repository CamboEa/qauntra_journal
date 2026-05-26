import { NextRequest, NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/constants";
import { isFirebaseConfigured } from "@/lib/firebase/admin";
import {
  authCookieOptions,
  createAuthSessionCookie,
  getAdminAuth,
  getSessionMaxAgeSeconds,
} from "@/lib/firebase/auth-server";
import { ensureUser } from "@/lib/firebase/users";

export const dynamic = "force-dynamic";

type SessionBody = {
  idToken?: string;
};

export async function POST(request: NextRequest) {
  if (!isFirebaseConfigured()) {
    return NextResponse.json(
      { error: "NOT_CONFIGURED", message: "Firebase is not configured." },
      { status: 503 },
    );
  }

  let body: SessionBody;
  try {
    body = (await request.json()) as SessionBody;
  } catch {
    return NextResponse.json(
      { error: "INVALID_BODY", message: "Expected JSON body." },
      { status: 400 },
    );
  }

  const idToken = body.idToken?.trim();
  if (!idToken) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "idToken is required." },
      { status: 400 },
    );
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    const sessionCookie = await createAuthSessionCookie(idToken);
    await ensureUser(decoded.uid, decoded.email ?? "");

    const maxAge = getSessionMaxAgeSeconds();
    const response = NextResponse.json({
      ok: true,
      uid: decoded.uid,
      email: decoded.email,
    });

    response.cookies.set(
      AUTH_COOKIE_NAME,
      sessionCookie,
      authCookieOptions(maxAge),
    );

    return response;
  } catch (error) {
    console.error("[Auth]", error);
    return NextResponse.json(
      { error: "AUTH_ERROR", message: "Invalid or expired token." },
      { status: 401 },
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE_NAME, "", authCookieOptions(0));
  return response;
}
