"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[BizzPal Global Error Caught]:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#08070A] text-[#F3F4F6] flex items-center justify-center p-6 select-none">
      <div className="max-w-md w-full bg-[#111015]/90 border border-[#D9B44A]/20 rounded-2xl p-8 shadow-2xl backdrop-blur-xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-[#D9B44A]/10 border border-[#D9B44A]/30 flex items-center justify-center mx-auto text-[#D9B44A]">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white tracking-tight">
            System Notice
          </h2>
          <p className="text-sm text-[#9CA3AF] leading-relaxed">
            The workspace encountered a temporary initialization condition. Your business data remains secure.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#D9B44A] to-[#B38F2E] text-black font-semibold text-sm hover:opacity-95 transition-opacity"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reload View</span>
          </button>
          <Link
            href="/login"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-medium text-sm hover:bg-white/10 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Go to Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
