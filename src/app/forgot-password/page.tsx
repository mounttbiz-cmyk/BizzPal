"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { ThemeSwitch } from "@/components/shell/ThemeSwitch";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.success) setSent(true);
      else setError(d.error || "Something went wrong. Please try again.");
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      <header className="h-14 border-b border-line bg-surface/60 flex items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-surface border border-line flex items-center justify-center p-1">
            <Image src="/logo.png" alt="BizzPal" width={24} height={24} className="object-contain" />
          </div>
          <span className="font-extrabold text-sm tracking-tight">Bizz<span className="text-brass">Pal</span></span>
        </Link>
        <div className="w-32"><ThemeSwitch compact /></div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl border border-line bg-surface shadow-theme space-y-5">
          {sent ? (
            <div className="space-y-3">
              <h1 className="text-xl font-semibold">Check your email</h1>
              <p className="text-sm text-text-muted leading-relaxed">
                If an account exists for <strong className="text-text">{email}</strong>, we have sent a link to reset the password. It works for one hour.
              </p>
              <p className="text-xs text-text-muted">Nothing arrived? Check your spam folder, or try again in a few minutes.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <h1 className="text-xl font-semibold">Forgot your password?</h1>
                <p className="text-sm text-text-muted mt-1">Enter your work email and we will send you a link to choose a new one.</p>
              </div>
              <div>
                <label htmlFor="fp-email" className="block text-sm font-medium mb-1.5">Work email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="fp-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-line bg-surface-2 text-sm text-text focus:outline-hidden focus:border-brass"
                  />
                </div>
              </div>
              {error && <p className="text-sm text-negative">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="w-full py-2.5 rounded-xl bg-brass text-white text-sm font-medium hover:brightness-110 disabled:opacity-60 cursor-pointer inline-flex items-center justify-center gap-2"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                Send reset link
              </button>
            </form>
          )}
          <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text">
            <ArrowLeft className="w-4 h-4" /> Back to sign in
          </Link>
        </div>
      </main>
    </div>
  );
}
