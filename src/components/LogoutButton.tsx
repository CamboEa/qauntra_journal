"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type LogoutButtonProps = {
  email?: string | null;
};

export function LogoutButton({ email }: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-q-border bg-q-surface-2 px-3 py-3">
      {email ? (
        <p
          className="truncate text-xs font-medium text-q-text-2"
          title={email}
        >
          {email}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => void logout()}
        disabled={loading}
        className={`mt-2 text-xs text-q-text-3 underline-offset-2 transition hover:text-q-text hover:underline disabled:opacity-50 ${
          email ? "" : "mt-0"
        }`}
      >
        {loading ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}
