import Image from "next/image";

import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <div className="auth-glow flex min-h-screen items-center justify-center bg-q-bg px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-q-border-2 bg-q-surface p-2.5 shadow-xl shadow-black/50">
            <Image src="/logo/logo.png" alt="Quatra Journal" width={44} height={44} priority />
          </div>
          <div>
            <p className="text-base font-semibold text-q-text">Quatra Journal</p>
            <p className="mt-0.5 text-xs font-medium uppercase tracking-widest text-q-text-2">
              MT5 Trading Dashboard
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-q-border bg-q-surface/80 p-8 shadow-2xl shadow-black/60 backdrop-blur-sm">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-q-text">Welcome back</h1>
            <p className="mt-1 text-sm text-q-text-2">
              Sign in to your trading journal.
            </p>
          </div>
          <AuthForm mode="login" />
        </div>
      </div>
    </div>
  );
}
