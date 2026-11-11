"use client";

import React from "react";
import { ContainerTile } from "../ui/ContainerTile";
import Link from "next/link";

export function SimulatorHighlightWidget() {
  return (
    <ContainerTile span={4} id="widget_simulator_highlight">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="text-base font-semibold text-text">Decision simulator</h2>
          <p className="text-sm text-text-muted mt-0.5 leading-relaxed">
            Thinking about a new hire, a price change or a big expense? Test it first and see the best, likely and worst
            outcomes for your cash.
          </p>
        </div>
        <Link
          href="/simulator"
          className="px-5 py-2.5 rounded-xl text-sm font-medium border border-line text-text hover:bg-surface-2 whitespace-nowrap self-start sm:self-auto"
        >
          Open simulator
        </Link>
      </div>
    </ContainerTile>
  );
}
