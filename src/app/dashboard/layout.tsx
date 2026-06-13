import { redirect } from "next/navigation";

import { Sidebar } from "@/components/Sidebar";
import { getDashboardContext } from "@/lib/dashboard-context";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, email, account } = await getDashboardContext();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-q-bg text-q-text">
      <Sidebar email={email} account={account} />
      <main className="ml-60 flex-1 overflow-auto flex flex-col">
        <div className="flex flex-1 flex-col px-4 py-8">{children}</div>
      </main>
    </div>
  );
}
