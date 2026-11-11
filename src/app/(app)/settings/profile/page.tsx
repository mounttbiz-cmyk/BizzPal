"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { PortalModal } from "@/components/ui/PortalModal";
import { useAuth } from "@/lib/firebase/authContext";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { saveUserProfileToFirestore } from "@/lib/firebase/firestore";
import { BUSINESS_DATA_UPDATED_EVENT } from "@/lib/upload/events";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";

export default function BusinessProfileSettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  // Profile fields state
  const [businessName, setBusinessName] = useState("");
  const [businessLogo, setBusinessLogo] = useState<string | null>(null);
  const [founderName, setFounderName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("saas");
  const [industryLabel, setIndustryLabel] = useState("B2B SaaS & Cloud Platforms");
  const [teamSize, setTeamSize] = useState<number | string>(1);
  const [monthlyRevenue, setMonthlyRevenue] = useState<number | string>(0);
  const [monthlyBurn, setMonthlyBurn] = useState<number | string>(0);
  const [cashOnHand, setCashOnHand] = useState<number | string>(0);
  const [provider, setProvider] = useState("email");

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Logout state
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Delete Account Modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEscapeKey(() => setIsDeleteModalOpen(false), isDeleteModalOpen);

  // Load existing profile from localStorage and backend
  useEffect(() => {
    try {
      // 1. Session check
      const sessionStr = localStorage.getItem("bizzpal_user_session");
      if (sessionStr) {
        const sess = JSON.parse(sessionStr);
        if (sess.email) setEmail(sess.email);
        if (sess.name) setFounderName(sess.name);
        if (sess.provider) setProvider(sess.provider);
      }

      // 2. Business profile check
      const profileStr = localStorage.getItem("bizzpal_business_profile");
      if (profileStr) {
        const p = JSON.parse(profileStr);
        if (p.logoUrl || p.logo || p.logo_url) setBusinessLogo(p.logoUrl || p.logo || p.logo_url);
        if (p.name) setBusinessName(p.name);
        if (p.founderName) setFounderName(p.founderName);
        if (p.website) setWebsite(p.website);
        if (p.industry) setIndustry(p.industry);
        if (p.industryLabel) setIndustryLabel(p.industryLabel);
        if (p.teamSize !== undefined) setTeamSize(p.teamSize);
        if (p.revenue !== undefined) setMonthlyRevenue(p.revenue);
        if (p.monthlyRevenue !== undefined) setMonthlyRevenue(p.monthlyRevenue);
        if (p.burn !== undefined) setMonthlyBurn(p.burn);
        if (p.cash !== undefined) setCashOnHand(p.cash);
      } else {
        // Fallback default
        setBusinessName("Apex Analytics");
      }

      // 3. Backend fallback check
      fetch("/api/business/intake")
        .then((r) => r.json())
        .then((d) => {
          if (d.success && d.business) {
            if (d.business.logoUrl) {
              setBusinessLogo((prev) => prev || d.business.logoUrl);
            }
            if (d.business.name) {
              setBusinessName((prev) => (!prev || prev === "Apex Analytics" ? d.business.name : prev));
            }
          }
        })
        .catch(() => {});
    } catch (e) {
      console.error("Error reading business profile for settings:", e);
    }
  }, []);

  // Calculate live runway preview
  const burnNum = Number(monthlyBurn) || 0;
  const cashNum = Number(cashOnHand) || 0;
  const runwayMonths = burnNum > 0 ? (cashNum / burnNum).toFixed(1) : "18+";

  // Handle Save Business Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const cleanBusinessName = businessName.trim() || "My Business";
      const cleanFounderName = founderName.trim() || "Founder";
      const cleanWebsite = website.trim();
      const numTeam = Number(teamSize) || 1;
      const numRevenue = Number(monthlyRevenue) || 0;
      const numBurn = Number(monthlyBurn) || 0;
      const numCash = Number(cashOnHand) || 0;
      const numAnnual = numRevenue * 12;

      // Existing profile merged
      const existingStr = localStorage.getItem("bizzpal_business_profile");
      const existing = existingStr ? JSON.parse(existingStr) : {};

      const updatedProfile = {
        ...existing,
        name: cleanBusinessName,
        founderName: cleanFounderName,
        website: cleanWebsite,
        industry,
        industryLabel,
        logoUrl: businessLogo || null,
        teamSize: numTeam,
        revenue: numRevenue,
        monthlyRevenue: numRevenue,
        annualRevenue: numAnnual,
        burn: numBurn,
        cash: numCash,
        updatedAt: new Date().toISOString(),
      };

      // 1. Update localStorage immediately (guarantees local sync instantly)
      localStorage.setItem("bizzpal_business_profile", JSON.stringify(updatedProfile));
      if (email) {
        localStorage.setItem(`bizzpal_user_business_${email.trim().toLowerCase()}`, JSON.stringify(updatedProfile));
      }

      // 2. Dispatch global custom window events immediately so UI headers, roasters & widgets reflect changes
      window.dispatchEvent(
        new CustomEvent(BUSINESS_DATA_UPDATED_EVENT, {
          detail: updatedProfile,
        })
      );
      window.dispatchEvent(
        new CustomEvent("bizzpal_profile_updated", {
          detail: updatedProfile,
        })
      );

      // Helper: execute remote async tasks with a strict safety timeout so slow networks/Firebase never stall the UI
      const withTimeout = (p: Promise<any>, ms = 1500) =>
        Promise.race([
          p,
          new Promise((resolve) => setTimeout(() => resolve(null), ms)),
        ]);

      // 3. Persist concurrently to SQLite intake, account-status, and Firebase in the background
      const remoteTasks: Promise<any>[] = [];

      // 3a. SQLite intake endpoint
      remoteTasks.push(
        withTimeout(
          fetch("/api/business/intake", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: cleanBusinessName,
              founderName: cleanFounderName,
              website: cleanWebsite,
              industry,
              industryLabel,
              logoUrl: businessLogo || null,
              teamSize: numTeam,
              monthlyRevenue: numRevenue,
              annualRevenue: numAnnual,
              monthlyBurn: numBurn,
              cashOnHand: numCash,
            }),
          }).catch(() => {})
        )
      );

      // 3b. SQLite account-status ledger
      if (email) {
        remoteTasks.push(
          withTimeout(
            fetch("/api/auth/account-status", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: email.trim().toLowerCase(),
                name: cleanFounderName,
                businessProfile: updatedProfile,
              }),
            }).catch(() => {})
          )
        );
      }

      // 3c. Cloud Firestore & Realtime Database
      let currentUserId = user?.uid;
      if (!currentUserId) {
        const sessStr = localStorage.getItem("bizzpal_user_session");
        if (sessStr) currentUserId = JSON.parse(sessStr).id;
      }
      if (currentUserId && isFirebaseConfigured) {
        remoteTasks.push(
          withTimeout(
            saveUserProfileToFirestore(currentUserId, {
              email: email.trim().toLowerCase(),
              displayName: cleanFounderName,
              role: "owner",
              businessProfile: updatedProfile,
            }).catch((fbErr) => {
              console.warn("Failed to sync profile to Firebase", fbErr);
            })
          )
        );
      }

      // Await all remote tasks with timeout (maximum 1.5 seconds wait)
      await Promise.allSettled(remoteTasks);

      // Immediate success feedback
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      setSaveError(err.message || "Failed to update business profile.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    if (!confirm("Are you sure you want to log out of BizzPal Business OS?")) return;
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (e) {}
    localStorage.removeItem("bizzpal_user_session");
    router.push("/login?signin=true");
  };

  // Handle Delete Account
  const handleDeleteAccount = async () => {
    if (deleteConfirmationText.trim().toUpperCase() !== "DELETE") {
      setDeleteError("Please type DELETE to confirm account removal.");
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const cleanEmail = (email || "").trim().toLowerCase();

      // 1. Delete from backend SQLite database
      if (cleanEmail) {
        const res = await fetch(`/api/auth/account-status?email=${encodeURIComponent(cleanEmail)}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to delete server record.");
        }
      }

      // 2. Delete from Firebase Auth if current user is active
      if (isFirebaseConfigured && user) {
        try {
          await user.delete();
        } catch (fbErr: any) {
          console.warn("Notice during Firebase user deletion:", fbErr);
        }
      }

      // 3. Clear local storage
      localStorage.removeItem("bizzpal_user_session");
      localStorage.removeItem("bizzpal_business_profile");
      if (cleanEmail) {
        localStorage.removeItem(`bizzpal_user_business_${cleanEmail}`);
      }

      // 4. Redirect to login
      alert("Your account and business data have been permanently deleted.");
      router.push("/login?signup=true");
    } catch (err: any) {
      setDeleteError(err.message || "Failed to delete account. Please try again.");
      setIsDeleting(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2.5 rounded-xl border border-line bg-surface text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-brass";

  const initials =
    businessName
      .split(" ")
      .filter(Boolean)
      .map(w => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "BP";

  const MoneyField = ({
    label,
    value,
    onChange,
    note,
  }: {
    label: string;
    value: number | string;
    onChange: (v: string) => void;
    note: string;
  }) => (
    <div>
      <label className="block text-sm font-medium text-text mb-1.5">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">₹</span>
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="0"
          className={`${inputClass} pl-7`}
        />
      </div>
      <p className="text-xs text-text-muted mt-1.5">{note}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {saveError && (
        <p className="p-3 rounded-xl border border-rust/30 bg-rust/5 text-sm text-rust">{saveError}</p>
      )}

      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Identity summary */}
        <section className="rounded-2xl border border-line bg-surface shadow-sm p-6 flex flex-col sm:flex-row sm:items-center gap-5">
          {businessLogo ? (
            <img
              src={businessLogo}
              alt={businessName || "Business logo"}
              className="w-20 h-20 rounded-2xl border border-line bg-surface shadow-sm-2 object-contain p-1.5 shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl border border-line bg-surface shadow-sm-2 text-text-muted text-2xl flex items-center justify-center shrink-0 select-none">
              {initials}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-text truncate">{businessName || "Your business"}</h2>
            <p className="text-sm text-text-muted mt-0.5 truncate">
              {industryLabel} · {Number(teamSize) || 1} {Number(teamSize) === 1 ? "person" : "people"}
            </p>
            <p className="text-sm text-text-muted truncate">{email || "No email set"}</p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <label className="px-3.5 py-2 rounded-xl border border-line bg-surface text-sm font-medium text-text hover:bg-surface-2 cursor-pointer">
              {businessLogo ? "Change logo" : "Upload logo"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 2 * 1024 * 1024) {
                    alert("Please choose an image under 2MB.");
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = ev => {
                    const res = ev.target?.result as string;
                    if (res) setBusinessLogo(res);
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </label>
            {businessLogo && (
              <button
                type="button"
                onClick={() => setBusinessLogo(null)}
                className="text-sm text-text-muted hover:text-rust cursor-pointer"
              >
                Remove
              </button>
            )}
          </div>
        </section>

        {/* Details */}
        <section className="rounded-2xl border border-line bg-surface shadow-sm">
          <div className="px-6 py-5 border-b border-line">
            <h2 className="text-base font-semibold text-text">Business details</h2>
            <p className="text-sm text-text-muted mt-0.5">Shown across the dashboard and in your reports.</p>
          </div>

          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
            <div className="sm:col-span-2 lg:col-span-1 lg:order-1">
              <label className="block text-sm font-medium text-text mb-1.5">Company name</label>
              <input
                type="text"
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                placeholder="e.g. Apex Analytics"
                required
                className={inputClass}
              />
            </div>

            <div className="lg:order-4">
              <label className="block text-sm font-medium text-text mb-1.5">Your name</label>
              <input
                type="text"
                value={founderName}
                onChange={e => setFounderName(e.target.value)}
                placeholder="e.g. Alex Vance"
                required
                className={inputClass}
              />
            </div>

            <div className="lg:order-5">
              <label className="block text-sm font-medium text-text mb-1.5">Work email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="founder@company.com"
                className={inputClass}
              />
              <p className="text-xs text-text-muted mt-1.5 capitalize">Signed in with {provider}</p>
            </div>

            <div className="lg:order-6">
              <label className="block text-sm font-medium text-text mb-1.5">Website</label>
              <input
                type="text"
                value={website}
                onChange={e => setWebsite(e.target.value)}
                placeholder="e.g. apexanalytics.io"
                className={inputClass}
              />
            </div>

            <div className="lg:order-2">
              <label className="block text-sm font-medium text-text mb-1.5">Industry</label>
              <select
                value={industry}
                onChange={e => {
                  setIndustry(e.target.value);
                  const labels: Record<string, string> = {
                    saas: "B2B SaaS & Cloud Platforms",
                    it: "IT & Technology Services",
                    d2c: "E-Commerce & Retail",
                    real_estate: "Real Estate & Property",
                    agency: "Agency & Professional Services",
                    mfg: "Manufacturing & Industrial",
                    healthcare: "Healthcare & MedTech",
                    finance: "Fintech & Financial Advisory",
                    other: "Specialist Enterprise",
                  };
                  setIndustryLabel(labels[e.target.value] || "Custom Enterprise");
                }}
                className={inputClass}
              >
                <option value="saas">B2B SaaS & Cloud Platforms</option>
                <option value="it">IT & Technology Services</option>
                <option value="d2c">E-Commerce & Retail</option>
                <option value="real_estate">Real Estate & Property</option>
                <option value="agency">Agency & Professional Services</option>
                <option value="mfg">Manufacturing & Industrial</option>
                <option value="healthcare">Healthcare & MedTech</option>
                <option value="finance">Fintech & Financial Advisory</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="lg:order-3">
              <label className="block text-sm font-medium text-text mb-1.5">Team size</label>
              <input
                type="number"
                min="1"
                max="5000"
                value={teamSize}
                onChange={e => setTeamSize(e.target.value)}
                placeholder="10"
                className={inputClass}
              />
            </div>
          </div>
        </section>

        {/* Finances */}
        <section className="rounded-2xl border border-line bg-surface shadow-sm">
          <div className="px-6 py-5 border-b border-line flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-text">Finances</h2>
              <p className="text-sm text-text-muted mt-0.5">Starting numbers used for runway and forecasts.</p>
            </div>
            <div className="px-4 py-2 rounded-xl bg-surface-2 border border-line text-right shrink-0">
              <p className="text-xs text-text-muted">Estimated runway</p>
              <p className="text-base text-text">{runwayMonths} months</p>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-5">
            <MoneyField
              label="Monthly revenue"
              value={monthlyRevenue}
              onChange={setMonthlyRevenue}
              note={`₹${Number(monthlyRevenue || 0).toLocaleString("en-IN")} per month`}
            />
            <MoneyField
              label="Monthly net burn"
              value={monthlyBurn}
              onChange={setMonthlyBurn}
              note={`₹${Number(monthlyBurn || 0).toLocaleString("en-IN")} per month`}
            />
            <MoneyField
              label="Cash in bank"
              value={cashOnHand}
              onChange={setCashOnHand}
              note={`₹${Number(cashOnHand || 0).toLocaleString("en-IN")} available`}
            />
          </div>
        </section>

        {/* Save bar */}
        <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 p-4 rounded-2xl border border-line bg-surface shadow-lg">
          <p className="text-sm text-text-muted">
            {saveSuccess ? <span className="text-text">Changes saved.</span> : "Changes apply across your workspace once saved."}
          </p>
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2 rounded-xl bg-brass text-white text-sm font-medium hover:brightness-110 cursor-pointer disabled:opacity-60"
          >
            {isSaving ? "Saving…" : saveSuccess ? "Saved" : "Save changes"}
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Session */}
      <section className="rounded-2xl border border-line bg-surface shadow-sm p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-text">Session</h2>
          <p className="text-sm text-text-muted mt-0.5">
            Signed in to <span className="text-text">{businessName || "your business"}</span> as{" "}
            <span className="text-text">{email || "founder"}</span>.
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="px-4 py-2 rounded-xl border border-line text-sm font-medium text-text hover:bg-surface-2 shrink-0 cursor-pointer"
        >
          {isLoggingOut ? "Signing out…" : "Log out"}
        </button>
      </section>

      {/* Delete */}
      <section className="rounded-2xl border border-line bg-surface shadow-sm p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-text">Delete account</h2>
          <p className="text-sm text-text-muted mt-0.5 max-w-xl">
            Permanently remove your account, business profile and saved data. This cannot be undone.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setDeleteConfirmationText("");
            setDeleteError(null);
            setIsDeleteModalOpen(true);
          }}
          className="px-4 py-2 rounded-xl border border-rust/40 text-sm font-medium text-rust hover:bg-rust/5 shrink-0 cursor-pointer"
        >
          Delete account
        </button>
      </section>
      </div>

      {isDeleteModalOpen && (
        <PortalModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)}>
          <div
            className="w-[28rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-surface shadow-lg overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
              <div>
                <h3 className="text-lg font-semibold text-text">Delete your account?</h3>
                <p className="text-sm text-text-muted mt-1 leading-relaxed">
                  This will permanently erase the account for <span className="text-text">{email}</span> and all business data for{" "}
                  <span className="text-text">{businessName}</span>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                aria-label="Close"
                className="p-1 text-text-muted hover:text-text cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 pb-6 space-y-3">
              {deleteError && <p className="text-sm text-rust">{deleteError}</p>}
              <label className="text-sm font-medium text-text block">
                Type <span className="text-rust">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmationText}
                onChange={e => setDeleteConfirmationText(e.target.value)}
                placeholder="DELETE"
                className={inputClass}
                autoFocus
              />
            </div>

            <div className="px-6 py-4 border-t border-line bg-surface-2/40 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-3.5 py-2 rounded-xl text-sm text-text-muted hover:text-text cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmationText.trim().toUpperCase() !== "DELETE" || isDeleting}
                className="px-4 py-2 rounded-xl bg-rust text-white text-sm font-medium hover:brightness-110 disabled:opacity-40 cursor-pointer"
              >
                {isDeleting ? "Deleting…" : "Delete account"}
              </button>
            </div>
          </div>
        </PortalModal>
      )}
    </div>
  );
}
