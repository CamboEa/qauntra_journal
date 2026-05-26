import { redirect } from "next/navigation";

import { Sidebar } from "@/components/Sidebar";
import { getAccountSummary } from "@/lib/firebase/accounts";
import { getCurrentUser } from "@/lib/firebase/auth-server";
import { getUserAccountId, getUserEmail } from "@/lib/firebase/users";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const accountId = await getUserAccountId(user.uid);
  const summary = accountId ? await getAccountSummary(accountId) : null;
  const email = (await getUserEmail(user.uid)) ?? user.email ?? null;

  return (
    <div className="flex min-h-screen bg-q-bg text-q-text">
      <Sidebar
        email={email}
        account={
          accountId && summary
            ? {
                mt5Login: summary.mt5Login,
                lastSyncAt: summary.lastSyncAt,
              }
            : null
        }
      />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
