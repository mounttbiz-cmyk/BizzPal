"use client";

import React from "react";
import { ThemeSwitch } from "@/components/shell/ThemeSwitch";

export default function AppearancePage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <section className="rounded-2xl border border-line bg-surface shadow-sm">
        <div className="p-6 border-b border-line">
          <h2 className="text-base font-semibold text-text">Theme</h2>
          <p className="text-sm text-text-muted mt-0.5">Choose a light or dark look, or follow your device.</p>
        </div>
        <div className="p-6 max-w-xs">
          <ThemeSwitch />
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface shadow-sm p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-text">BizzPal website</h2>
          <p className="text-sm text-text-muted mt-0.5">Visit the public site to see the product overview.</p>
        </div>
        <a
          href="/"
          className="px-4 py-2 rounded-xl border border-line text-sm font-medium text-text hover:bg-surface-2 shrink-0"
        >
          Open website
        </a>
      </section>
    </div>
  );
}
