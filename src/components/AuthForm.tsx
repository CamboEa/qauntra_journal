"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

import { getFirebaseAuth } from "@/lib/firebase/client";

type AuthFormProps = {
  mode: "login" | "register";
};

function mapAuthError(code: string): string {
  switch (code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Invalid email or password.";
    default:
      return "Something went wrong. Please try again.";
  }
}

const inputClass =
  "w-full rounded-xl border border-q-border bg-q-bg px-3.5 py-2.5 text-sm text-q-text placeholder:text-q-text-3 outline-none transition focus:border-q-brand focus:ring-2 focus:ring-q-brand/20";

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const auth = getFirebaseAuth();
      const credential =
        mode === "login"
          ? await signInWithEmailAndPassword(auth, email, password)
          : await createUserWithEmailAndPassword(auth, email, password);

      const idToken = await credential.user.getIdToken();
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        throw new Error(data.message ?? "Could not create session");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      const code =
        e && typeof e === "object" && "code" in e
          ? String((e as { code: string }).code)
          : "";
      setError(
        code
          ? mapAuthError(code)
          : e instanceof Error
            ? e.message
            : "Authentication failed",
      );
    } finally {
      setLoading(false);
    }
  }

  const isLogin = mode === "login";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-q-text-2">
          Email
        </span>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          placeholder="you@example.com"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-q-text-2">
          Password
        </span>
        <input
          type="password"
          autoComplete={isLogin ? "current-password" : "new-password"}
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
          placeholder="••••••••"
        />
      </label>

      {!isLogin ? (
        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-q-text-2">
            Confirm password
          </span>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
            placeholder="••••••••"
          />
        </label>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-q-loss/30 bg-q-loss/10 px-3.5 py-2.5 text-sm text-q-loss">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-2 w-full rounded-xl bg-q-brand px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-q-brand/20 transition hover:bg-q-brand-h disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading
          ? isLogin
            ? "Signing in…"
            : "Creating account…"
          : isLogin
            ? "Sign in"
            : "Create account"}
      </button>

      <p className="pt-1 text-center text-sm text-q-text-2">
        {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
        <Link
          href={isLogin ? "/register" : "/login"}
          className="font-medium text-q-brand underline-offset-2 hover:underline"
        >
          {isLogin ? "Register" : "Sign in"}
        </Link>
      </p>
    </form>
  );
}
