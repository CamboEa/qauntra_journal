import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "crypto";

export function generateApiKey(): string {
  return randomBytes(32).toString("hex");
}

export function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

export function verifyApiKey(provided: string, storedHash: string): boolean {
  const providedHash = hashApiKey(provided);
  const a = Buffer.from(providedHash);
  const b = Buffer.from(storedHash);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
