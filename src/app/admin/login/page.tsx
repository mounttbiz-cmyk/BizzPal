"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Lock, ArrowLeft, Check } from "lucide-react";
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
    <div className="min-h-screen bg-bg text-text flex flex-col p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between max-w-4xl w-full mx-auto">
        <Link href="/login" className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to sign in</span>
        </Link>
        <div className="w-36">
          <ThemeSwitch compact />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center py-8">
        <div className="w-full max-w-md p-8 rounded-2xl border border-line bg-surface shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <Image src="/logo-icon.png" alt="BizzPal" width={44} height={44} className="object-contain mx-auto" />
            <h1 className="text-xl font-semibold text-text pt-2">Admin sign in</h1>
            <p className="text-sm text-text-muted">Enter the admin passcode to continue.</p>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-rust/10 text-rust text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="admin-passcode" className="text-sm font-medium text-text block mb-1.5">
                Passcode
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-text-muted absolute left-3" />
                <input
                  id="admin-passcode"
                  type="password"
                  autoFocus
                  autoComplete="new-password"
                  placeholder="Enter passcode"
                  value={passcode}
                  onChange={e => setPasscode(e.target.value)}
                  className="w-full text-sm pl-10 pr-3.5 py-2.5 rounded-xl border border-line bg-surface text-text placeholder:text-text-muted focus:outline-none focus:border-brass"
                  required
                />
              </div>
            </div>

            {success && (
              <div className="px-4 py-3 rounded-xl bg-jade/10 text-jade text-sm flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>Passcode accepted. Opening the admin console…</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || success}
              className="w-full py-2.5 rounded-xl bg-brass text-white text-sm font-medium hover:brightness-110 disabled:opacity-60 cursor-pointer"
            >
              {success ? "Opening…" : loading ? "Checking…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
