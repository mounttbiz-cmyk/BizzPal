"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/settings/profile", label: "Business & account" },
  { href: "/settings/advisors", label: "AI advisors" },
  { href: "/settings/appearance", label: "Appearance" },
  { href: "/settings/tools", label: "Connected tools" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-text">Settings</h1>
        <p className="text-sm text-text-muted mt-1">Manage your business profile, advisors and preferences.</p>
      </div>

      <nav aria-label="Settings sections" className="inline-flex items-center p-1 rounded-xl bg-surface-2 overflow-x-auto max-w-full">
        {TABS.map(tab => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                active ? "bg-surface text-text font-medium shadow-sm" : "text-text-muted hover:text-text"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <div>{children}</div>
    </div>
  );
}
