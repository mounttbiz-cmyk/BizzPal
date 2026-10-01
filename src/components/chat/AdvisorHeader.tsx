"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { AgentMeta } from "./types";
import { AgentAvatarIcon } from "./CustomizeAdvisorModal";
import {
  Pencil,
  MessageSquare,
  ChevronDown,
  ArrowRight,
  Wrench,
  ExternalLink,
} from "lucide-react";

interface AdvisorHeaderProps {
  activeAgent: AgentMeta;
  onCustomize: () => void;
  onToggleHistory: () => void;
  isHistoryOpen: boolean;
  historyCount: number;
  className?: string;
}

export function AdvisorHeader({
  activeAgent,
  onCustomize,
  onToggleHistory,
  isHistoryOpen,
  historyCount,
  className = "",
}: AdvisorHeaderProps) {
  const [isToolsDropdownOpen, setIsToolsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsToolsDropdownOpen(false);
      }
    }
    if (isToolsDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isToolsDropdownOpen]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsToolsDropdownOpen(false);
      }
    }
    if (isToolsDropdownOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isToolsDropdownOpen]);

  const shortRole = activeAgent.role.replace(" AI", "");

  return (
    <header
      aria-label="Active Executive Desk Header"
      className={`px-4 sm:px-5 py-3 border-b border-line bg-surface-2/40 flex items-center justify-between gap-3 shrink-0 select-none ${className}`}
    >
      {/* Left: Avatar (48px) + Name + Role Badge + Pulsing Dot + One-line summary */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* 48px Avatar */}
        <div className="relative shrink-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-surface border border-line flex items-center justify-center text-brass shadow-2xs">
            <AgentAvatarIcon iconName={activeAgent.avatar} className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <span
            aria-hidden="true"
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-surface shadow-xs"
          />
        </div>

        {/* Title, Role, Live Status, and Description */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm sm:text-base font-bold text-text truncate tracking-tight">
              {activeAgent.name}
            </h2>

            {/* Department Role Badge */}
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold uppercase bg-brass/15 text-brass border border-brass/30 shrink-0">
              {shortRole}
            </span>

            {/* Pulsing Live Dot */}
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 shrink-0"
              title="Autonomous telemetry active"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="hidden xs:inline text-[10px] tracking-wide uppercase font-mono">Live</span>
            </span>
          </div>

          {/* One-line advisor description with ellipsis and hover tooltip */}
          <p
            title={activeAgent.summary}
            className="text-[11px] sm:text-xs text-text-muted truncate mt-0.5 max-w-xl cursor-default"
          >
            {activeAgent.summary}
          </p>
        </div>
      </div>

      {/* Right: Tools Segmented/Dropdown + Customize Button + Chat History Button */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Tools Dropdown (Mockup style: clean [Tools ▾] button) */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsToolsDropdownOpen(prev => !prev)}
            aria-expanded={isToolsDropdownOpen}
            aria-haspopup="true"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-line hover:border-line-strong text-xs font-semibold text-text hover:text-brass transition-all cursor-pointer shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
          >
            <Wrench className="w-3.5 h-3.5 text-brass" />
            <span>Tools</span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-text-muted transition-transform duration-200 ${
                isToolsDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isToolsDropdownOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-1.5 w-56 rounded-xl bg-surface border border-line shadow-xl py-1.5 z-40 animate-fade-in"
            >
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted border-b border-line/60 mb-1">
                {activeAgent.name}&apos;s Playbooks & Tools
              </div>
              {activeAgent.quickTools.map((tool, idx) => (
                <Link
                  key={idx}
                  href={tool.href}
                  onClick={() => setIsToolsDropdownOpen(false)}
                  role="menuitem"
                  className="flex items-center justify-between px-3 py-2 text-xs text-text hover:text-brass hover:bg-surface-2 transition-colors"
                >
                  <span className="font-medium">{tool.name}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-text-muted/70" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Customize Name & Icon Button */}
        <button
          type="button"
          onClick={onCustomize}
          aria-label={`Customize ${activeAgent.name} name and icon`}
          title={`Customize ${activeAgent.name}`}
          className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-surface border border-line hover:border-brass/50 text-text-muted hover:text-brass transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
        >
          <Pencil className="w-3.5 h-3.5" />
          <span className="hidden md:inline text-xs font-semibold">Customize</span>
        </button>

        {/* Chat History Toggle Button */}
        <button
          type="button"
          onClick={onToggleHistory}
          aria-label={isHistoryOpen ? "Close Chat History" : "Open Chat History"}
          aria-expanded={isHistoryOpen}
          title={isHistoryOpen ? "Close Chat History" : "Open Chat History"}
          className={`p-2 sm:px-2.5 sm:py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass ${
            isHistoryOpen
              ? "bg-brass/15 border-brass/50 text-brass"
              : "bg-surface border border-line text-text-muted hover:text-text hover:border-line-strong"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">History</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-surface-2 border border-line text-text font-bold">
            {historyCount}
          </span>
        </button>
      </div>
    </header>
  );
}
