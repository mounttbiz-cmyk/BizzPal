"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { KeyRound, Lock, ArrowLeft, ShieldAlert, Check } from "lucide-react";
import { ThemeSwitch } from "@/components/shell/ThemeSwitch";
import Link from "next/link";

export default function AdminLoginPage() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        const adminSession = {
          id: "adm_platform_developer",
          role: "platform_admin",
          authenticatedAt: new Date().toISOString(),
        };
        localStorage.setItem("bizzpal_admin_session", JSON.stringify(adminSession));
        setLoading(false);
        setSuccess(true);
        try {
          router.push("/admin");
        } catch (e) {}
        setTimeout(() => {
          if (typeof window !== "undefined") {
            window.location.href = "/admin";
          }
        }, 250);
      } else {
        setLoading(false);
        setError(data.error || "Invalid Superadmin credentials.");
      }
    } catch {
      setLoading(false);
      setError("Network or server error during authentication.");
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <div className="flex items-center justify-between max-w-4xl w-full mx-auto">
        <Link href="/login" className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text btn-tactile">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Business Sign-in</span>
        </Link>
        <div className="w-36">
          <ThemeSwitch compact />
        </div>
      </div>

      {/* Developer Card */}
      <div className="max-w-md w-full mx-auto my-auto py-8">
        <div className="p-6 sm:p-8 rounded-2xl border border-line bg-surface shadow-theme space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-surface-2 border border-line flex items-center justify-center mx-auto p-1.5 shadow-sm">
              <Image
                src="/logo.png"
                alt="BizzPal Logo"
                width={36}
                height={36}
                className="object-contain"
              />
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber/15 text-amber text-[10px] font-bold uppercase tracking-wider">
              <KeyRound className="w-3 h-3" />
              <span>Developer Portal Only</span>
            </div>
            <h1 className="text-lg font-bold text-text">Superadmin Control Plane</h1>
            <p className="text-xs text-text-muted">
              Restricted to platform developers. Edit the entire platform configuration without deploys.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rust/10 border border-rust/30 text-rust text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-text block mb-1">
                Developer Passcode
              </label>
              <div className="relative flex items-center">
                <Lock className="w-3.5 h-3.5 text-text-muted absolute left-3" />
                <input
                  type="password"
                  placeholder="Enter passcode"
                  value={passcode}
                  onChange={e => setPasscode(e.target.value)}
                  className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-lg border border-line bg-surface-2 text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-amber"
                  required
                />
              </div>
            </div>

            {success && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-fade-in shadow-xs">
                <Check className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>Passcode verified! Entering Superadmin dashboard...</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || success}
              className={`w-full py-2.5 rounded-lg font-bold text-xs shadow-md btn-tactile transition-all flex items-center justify-center gap-2 ${
                success
                  ? "bg-emerald-600 text-white cursor-wait"
                  : "bg-amber text-black hover:brightness-110"
              }`}
            >
              {success ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Authorized! Redirecting...</span>
                </>
              ) : loading ? (
                <span>Authenticating...</span>
              ) : (
                "Enter Developer Superadmin"
              )}
            </button>
          </form>
        </div>
      </div>

      <div className="text-center text-[11px] text-text-muted">
        BizzPal · Superadmin Control Plane Security Gate
      </div>
    </div>
  );
}
