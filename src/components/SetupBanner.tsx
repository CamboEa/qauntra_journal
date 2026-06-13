export function SetupBanner() {
  return (
    <div
      role="alert"
      className="rounded-xl border border-q-warn/30 bg-q-warn/8 px-5 py-4"
    >
      <p className="text-sm font-semibold text-q-warn">Supabase not configured</p>
      <p className="mt-1.5 text-sm text-q-text-2">
        Add {`NEXT_PUBLIC_SUPABASE_URL`}, {`NEXT_PUBLIC_SUPABASE_ANON_KEY`}, and{" "}
        {`SUPABASE_SERVICE_ROLE_KEY`} to{" "}
        <code className="rounded-md border border-q-border bg-q-surface-2 px-1.5 py-0.5 font-mono text-xs text-q-text">
          .env
        </code>
        . Run the SQL migration in{" "}
        <code className="rounded-md border border-q-border bg-q-surface-2 px-1.5 py-0.5 font-mono text-xs text-q-text">
          supabase/migrations/
        </code>{" "}
        from the{" "}
        <a
          href="https://supabase.com/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-q-brand underline-offset-2 hover:underline"
        >
          Supabase dashboard
        </a>{" "}
        and enable Email auth under Authentication → Providers.
      </p>
    </div>
  );
}
