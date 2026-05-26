"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AccountBar } from "@/components/AccountBar";
import { LogoutButton } from "@/components/LogoutButton";

const links = [
  {
    href: "/dashboard",
    label: "Overview",
    exact: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".7" />
        <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".5" />
        <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".5" />
        <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/dashboard/history",
    label: "Trade history",
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M2 4h12M2 8h8M2 12h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/dashboard/setup",
    label: "MT5 setup",
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

type SidebarProps = {
  email?: string | null;
  account?: { mt5Login: string | null; lastSyncAt: string | null } | null;
};

export function Sidebar({ email = null, account = null }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-q-border bg-q-surface px-4 py-6">
      {/* Brand */}
      <div className="mb-8 flex items-center gap-3 px-1">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-q-border-2 bg-q-surface-2 p-1.5">
          <Image src="/logo/logo.png" alt="" width={28} height={28} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-none text-q-text">Quatra</p>
          <p className="mt-0.5 text-xs text-q-text-2">Trading Journal</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5">
        {links.map((link) => {
          const active = link.exact
            ? pathname === link.href
            : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`group relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-q-brand/15 font-medium text-q-text"
                  : "text-q-text-2 hover:bg-q-hover hover:text-q-text"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-q-brand" />
              )}
              <span className={active ? "text-q-brand" : "text-q-text-3 group-hover:text-q-text-2"}>
                {link.icon}
              </span>
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto space-y-3">
        {account ? (
          <AccountBar
            mt5Login={account.mt5Login}
            lastSyncAt={account.lastSyncAt}
          />
        ) : null}
        <LogoutButton email={email} />
      </div>
    </aside>
  );
}
