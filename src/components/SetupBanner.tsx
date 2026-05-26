export function SetupBanner() {
  return (
    <div
      role="alert"
      className="rounded-xl border border-q-warn/30 bg-q-warn/8 px-5 py-4"
    >
      <p className="text-sm font-semibold text-q-warn">Firebase not configured</p>
      <p className="mt-1.5 text-sm text-q-text-2">
        Add server credentials ({`FIREBASE_PROJECT_ID`},{" "}
        {`FIREBASE_CLIENT_EMAIL`}, {`FIREBASE_PRIVATE_KEY`}) and client auth
        vars ({`NEXT_PUBLIC_FIREBASE_API_KEY`},{" "}
        {`NEXT_PUBLIC_FIREBASE_PROJECT_ID`}) to{" "}
        <code className="rounded-md border border-q-border bg-q-surface-2 px-1.5 py-0.5 font-mono text-xs text-q-text">
          .env
        </code>
        . Enable Email/Password in{" "}
        <a
          href="https://console.firebase.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-q-brand underline-offset-2 hover:underline"
        >
          Firebase Console
        </a>{" "}
        → Authentication → Sign-in method.
      </p>
    </div>
  );
}
