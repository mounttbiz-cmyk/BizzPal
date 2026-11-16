"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { ThemeSwitch } from "@/components/shell/ThemeSwitch";

function ResetForm() {
  const token = useSearchParams().get("token") || "";
  const [valid, setValid] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/auth/reset?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(d => setValid(Boolean(d.valid)))
      .catch(() => setValid(false));
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("The two passwords don't match.");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.success) setDone(true);
      else setError(d.error || "Something went wrong. Please try again.");
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const field = "w-full pl-9 pr-3 py-2.5 rounded-xl border border-line bg-surface-2 text-sm text-text focus:outline-hidden focus:border-brass";

  if (valid === null) return <p className="text-sm text-text-muted flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Checking your link…</p>;

  if (!valid && !done) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">This link isn&apos;t valid</h1>
        <p className="text-sm text-text-muted">It may have expired or already been used. Reset links work once and last one hour.</p>
        <Link href="/forgot-password" className="inline-block px-4 py-2 rounded-xl bg-brass text-white text-sm font-medium hover:brightness-110">Get a new link</Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">Password changed</h1>
        <p className="text-sm text-text-muted">You can now sign in with your new password.</p>
        <Link href="/login" className="inline-block px-4 py-2 rounded-xl bg-brass text-white text-sm font-medium hover:brightness-110">Go to sign in</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Choose a new password</h1>
        <p className="text-sm text-text-muted mt-1">Use at least 8 characters.</p>
      </div>
      <div>
        <label htmlFor="rp-pw" className="block text-sm font-medium mb-1.5">New password</label>
        <div className="relative">
          <Lock className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input id="rp-pw" type="password" required autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} className={field} />
        </div>
      </div>
      <div>
        <label htmlFor="rp-pw2" className="block text-sm font-medium mb-1.5">Confirm password</label>
        <div className="relative">
          <Lock className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input id="rp-pw2" type="password" required autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} className={field} />
        </div>
      </div>
      {error && <p className="text-sm text-negative">{error}</p>}
      <button type="submit" disabled={busy} className="w-full py-2.5 rounded-xl bg-brass text-white text-sm font-medium hover:brightness-110 disabled:opacity-60 cursor-pointer inline-flex items-center justify-center gap-2">
        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
        Save new password
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
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
        <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl border border-line bg-surface shadow-theme">
          <Suspense fallback={null}><ResetForm /></Suspense>
        </div>
      </main>
    </div>
  );
}
