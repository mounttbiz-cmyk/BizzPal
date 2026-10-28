"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, LayoutDashboard, LogIn } from "lucide-react";

export default function AppGroupError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[BizzPal App Error Caught]:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-[#111015]/80 border border-[#D9B44A]/20 rounded-2xl p-8 backdrop-blur-xl space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-[#D9B44A]/10 border border-[#D9B44A]/30 flex items-center justify-center mx-auto text-[#D9B44A]">
          <AlertCircle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-bold text-white tracking-tight">
            Unable to load module view
          </h2>
          <p className="text-xs text-[#9CA3AF] leading-relaxed">
            The requested workspace resource is synchronizing. Please refresh or verify your session.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#D9B44A] to-[#B38F2E] text-black font-semibold text-xs hover:opacity-95 transition-opacity"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
          <Link
            href="/login"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-medium text-xs hover:bg-white/10 transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
