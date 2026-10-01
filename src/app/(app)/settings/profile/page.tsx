"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  User,
  Mail,
  Globe,
  Briefcase,
  Users,
  DollarSign,
  TrendingUp,
  Save,
  Check,
  LogOut,
  Trash2,
  AlertTriangle,
  ShieldCheck,
  Palette,
  Layers,
  X,
  ExternalLink
} from "lucide-react";
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
        teamSize: numTeam,
        revenue: numRevenue,
        monthlyRevenue: numRevenue,
        annualRevenue: numAnnual,
        burn: numBurn,
        cash: numCash,
        updatedAt: new Date().toISOString(),
      };

      // 1. Update localStorage
      localStorage.setItem("bizzpal_business_profile", JSON.stringify(updatedProfile));
      if (email) {
        localStorage.setItem(`bizzpal_user_business_${email.trim().toLowerCase()}`, JSON.stringify(updatedProfile));
      }

      // 2. Persist to SQLite intake endpoint
      try {
        await fetch("/api/business/intake", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: cleanBusinessName,
            founderName: cleanFounderName,
            website: cleanWebsite,
            industry,
            industryLabel,
            teamSize: numTeam,
            monthlyRevenue: numRevenue,
            annualRevenue: numAnnual,
            monthlyBurn: numBurn,
            cashOnHand: numCash,
          }),
        });
      } catch (e) {}

      // 3. Persist to SQLite account-status ledger
      if (email) {
        try {
          await fetch("/api/auth/account-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: email.trim().toLowerCase(),
              name: cleanFounderName,
              businessProfile: updatedProfile,
            }),
          });
        } catch (e) {}
      }

      // 3.5 Persist securely to Firebase Firestore & Realtime Database
      try {
        let currentUserId = user?.uid;
        if (!currentUserId) {
          const sessStr = localStorage.getItem("bizzpal_user_session");
          if (sessStr) currentUserId = JSON.parse(sessStr).id;
        }
        if (currentUserId && isFirebaseConfigured) {
          await saveUserProfileToFirestore(currentUserId, {
            email: email.trim().toLowerCase(),
            displayName: cleanFounderName,
            role: "owner",
            businessProfile: updatedProfile,
          });
        }
      } catch (fbErr) {
        console.warn("Failed to sync profile to Firebase", fbErr);
      }

      // 4. Dispatch global custom window events so AppShell & widgets update immediately
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

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
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

  return (
    <div className="max-w-3xl space-y-6">
      {/* Top Header & Navigation Tabs */}
      <div className="space-y-2 pb-4 border-b border-line">
        <h1 className="text-lg font-bold text-text">Platform Settings</h1>
        <p className="text-xs text-text-muted font-medium">
          Manage your organization profile, active industry model, security credentials, and account lifecycle preferences.
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Link
            href="/settings/profile"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-brass text-white shadow-xs flex items-center gap-1.5"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Business & Account</span>
          </Link>
          <Link
            href="/settings/appearance"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-text-muted hover:text-text bg-surface border border-line flex items-center gap-1.5 transition-colors"
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Appearance & Theme</span>
          </Link>
          <Link
            href="/settings/tools"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-text-muted hover:text-text bg-surface border border-line flex items-center gap-1.5 transition-colors"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Connected Business Tools</span>
          </Link>
        </div>
      </div>

      {/* Save Success Alert */}
      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-jade/10 border border-jade/30 text-jade text-xs font-medium flex items-center gap-2.5 animate-fade-in shadow-xs">
          <Check className="w-4 h-4 shrink-0" />
          <span>Business profile and company details successfully updated across the platform!</span>
        </div>
      )}

      {/* Save Error Alert */}
      {saveError && (
        <div className="p-3.5 rounded-xl bg-rust/10 border border-rust/30 text-rust text-xs font-medium flex items-center gap-2.5 shadow-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Form: Business Information & Editing */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Business Identity Card */}
        <div className="p-5 sm:p-6 rounded-xl border border-line bg-surface shadow-theme space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div>
              <h2 className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-brass" />
                <span>Business Identity & Profile</span>
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Customize your company branding, founder information, and organizational profile.
              </p>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-jade/10 border border-jade/30 text-jade text-[11px] font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Active Workspace</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Business / Company Name */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-text flex items-center justify-between">
                <span>Business / Company Name *</span>
                <span className="text-[10px] text-text-muted">Updates sidebar & platform headers</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Apex Analytics"
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-surface-2 text-text text-xs focus:outline-none focus:border-brass focus:ring-1 focus:ring-brass transition-all"
                />
              </div>
            </div>

            {/* Founder / Owner Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text">Founder / Owner Name *</label>
              <div className="relative">
                <input
                  type="text"
                  value={founderName}
                  onChange={(e) => setFounderName(e.target.value)}
                  placeholder="e.g. Alex Vance"
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-surface-2 text-text text-xs focus:outline-none focus:border-brass focus:ring-1 focus:ring-brass transition-all"
                />
              </div>
            </div>

            {/* Business Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text flex items-center justify-between">
                <span>Account Work Email</span>
                <span className="text-[10px] text-text-muted capitalize">Provider: {provider}</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="founder@company.com"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-surface-2 text-text text-xs focus:outline-none focus:border-brass focus:ring-1 focus:ring-brass transition-all"
                />
              </div>
            </div>

            {/* Company Website */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text">Company Website URL</label>
              <div className="relative">
                <input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="e.g. apexanalytics.io"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-surface-2 text-text text-xs focus:outline-none focus:border-brass focus:ring-1 focus:ring-brass transition-all"
                />
              </div>
            </div>

            {/* Industry / Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text">Primary Industry</label>
              <select
                value={industry}
                onChange={(e) => {
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
                className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-surface-2 text-text text-xs focus:outline-none focus:border-brass focus:ring-1 focus:ring-brass transition-all"
              >
                <option value="saas">B2B SaaS & Cloud Platforms</option>
                <option value="it">IT & Technology Services</option>
                <option value="d2c">E-Commerce & Retail</option>
                <option value="real_estate">Real Estate & Property</option>
                <option value="agency">Agency & Professional Services</option>
                <option value="mfg">Manufacturing & Industrial</option>
                <option value="healthcare">Healthcare & MedTech</option>
                <option value="finance">Fintech & Financial Advisory</option>
                <option value="other">Other / Custom Enterprise</option>
              </select>
            </div>

            {/* Team Size */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-text">Team Headcount</label>
              <input
                type="number"
                min="1"
                max="5000"
                value={teamSize}
                onChange={(e) => setTeamSize(e.target.value)}
                placeholder="10"
                className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-surface-2 text-text text-xs focus:outline-none focus:border-brass focus:ring-1 focus:ring-brass transition-all"
              />
            </div>
          </div>
        </div>

        {/* Financial & Metric Baseline Card */}
        <div className="p-5 sm:p-6 rounded-xl border border-line bg-surface shadow-theme space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div>
              <h2 className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-jade" />
                <span>Financial & Runway Calibrations</span>
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Calibrate your baseline revenue, burn rate, and liquid cash reserves.
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-text-muted block">Estimated Runway</span>
              <span className="text-xs font-bold text-brass">{runwayMonths} Months</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Monthly Revenue */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text">Monthly Revenue (₹)</label>
              <input
                type="number"
                value={monthlyRevenue}
                onChange={(e) => setMonthlyRevenue(e.target.value)}
                placeholder="500000"
                className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-surface-2 text-text text-xs focus:outline-none focus:border-brass focus:ring-1 focus:ring-brass transition-all"
              />
              <span className="text-[10px] text-text-muted block">
                ₹{Number(monthlyRevenue || 0).toLocaleString("en-IN")}/mo
              </span>
            </div>

            {/* Monthly Burn */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text">Monthly Net Burn (₹)</label>
              <input
                type="number"
                value={monthlyBurn}
                onChange={(e) => setMonthlyBurn(e.target.value)}
                placeholder="0"
                className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-surface-2 text-text text-xs focus:outline-none focus:border-brass focus:ring-1 focus:ring-brass transition-all"
              />
              <span className="text-[10px] text-text-muted block">
                ₹{Number(monthlyBurn || 0).toLocaleString("en-IN")}/mo
              </span>
            </div>

            {/* Liquid Cash */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text">Liquid Cash Reserves (₹)</label>
              <input
                type="number"
                value={cashOnHand}
                onChange={(e) => setCashOnHand(e.target.value)}
                placeholder="0"
                className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-surface-2 text-text text-xs focus:outline-none focus:border-brass focus:ring-1 focus:ring-brass transition-all"
              />
              <span className="text-[10px] text-text-muted block">
                ₹{Number(cashOnHand || 0).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        {/* Save Changes CTA Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brass hover:brightness-110 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all btn-tactile disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving Changes…</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Business Changes</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Account Session & Sign Out Card */}
      <div className="p-5 sm:p-6 rounded-xl border border-line bg-surface shadow-theme space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-text-muted" />
              <span>Active User Session</span>
            </h2>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              You are currently signed into <span className="font-semibold text-text">{businessName || "your business"}</span> as <span className="font-semibold text-text">{email || "founder"}</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-line bg-surface-2 hover:bg-surface text-xs font-bold text-text hover:text-rust hover:border-rust/40 transition-all btn-tactile shrink-0 shadow-xs cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>{isLoggingOut ? "Signing Out…" : "Log Out of Account"}</span>
          </button>
        </div>
      </div>

      {/* Danger Zone: Delete Account Card */}
      <div className="p-5 sm:p-6 rounded-xl border border-rust/30 bg-rust/5 shadow-theme space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xs font-bold text-rust uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rust" />
              <span>Danger Zone: Delete Account</span>
            </h2>
            <p className="text-xs text-text-muted leading-relaxed max-w-xl">
              Permanently delete your account credentials, business profile, saved financial ledgers, and telemetry records. Once deleted, this account and its data cannot be recovered.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setDeleteConfirmationText("");
              setDeleteError(null);
              setIsDeleteModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rust hover:bg-rust/90 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all btn-tactile shrink-0 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Account</span>
          </button>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {isDeleteModalOpen && (
        <PortalModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)}>
          <div
            className="w-full max-w-md p-6 rounded-2xl border border-rust/40 bg-surface shadow-2xl space-y-5 relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-2 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-xl bg-rust/10 border border-rust/30 flex items-center justify-center text-rust">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-text">Permanently Delete Account?</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                This will irreversibly erase your account for <span className="font-semibold text-text">{email}</span> and delete all business records for <span className="font-semibold text-text">{businessName}</span>.
              </p>
            </div>

            {deleteError && (
              <div className="p-3 rounded-lg bg-rust/10 border border-rust/30 text-rust text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-text block">
                Type <span className="text-rust font-mono font-bold">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-surface-2 text-text text-xs font-mono uppercase focus:outline-none focus:border-rust focus:ring-1 focus:ring-rust transition-all"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-line bg-surface-2 text-text-muted hover:text-text text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmationText.trim().toUpperCase() !== "DELETE" || isDeleting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rust hover:bg-rust/90 disabled:opacity-40 text-white text-xs font-bold transition-all btn-tactile cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Deleting…</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Deletion</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </PortalModal>
      )}
    </div>
  );
}
