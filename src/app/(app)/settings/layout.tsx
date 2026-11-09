"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/settings/profile", label: "Business & account", match: "/settings/profile" },
  { href: "/settings/advisors", label: "AI advisors", match: "/settings/advisors" },
  { href: "/settings/appearance", label: "Appearance", match: "/settings/appearance" },
  { href: "/settings/tools", label: "Connected tools", match: "/settings/tools" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-line">
        <h1 className="text-xl font-bold text-text">Settings</h1>
        <p className="text-sm text-text-muted mt-1">Manage your business profile, advisors and preferences.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[14rem_minmax(0,1fr)] gap-8 items-start">
        <nav aria-label="Settings sections" className="flex lg:flex-col gap-1 overflow-x-auto lg:sticky lg:top-6">
          {NAV.map(item => {
            const active = item.match !== null && pathname === item.match;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap ${
                  active ? "bg-surface-2 text-text font-medium" : "text-text-muted hover:text-text hover:bg-surface-2/60"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="max-w-3xl min-w-0">{children}</div>
      </div>
    </div>
  );
}
