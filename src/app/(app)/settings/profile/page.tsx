"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { PortalModal } from "@/components/ui/PortalModal";
import { useAuth } from "@/lib/auth/authContext";
import { BUSINESS_DATA_UPDATED_EVENT } from "@/lib/upload/events";
import { BUSINESS_TYPES } from "@/lib/onboarding/data";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";

import { askConfirm, showNotice } from "@/components/ui/dialogs";
export default function BusinessProfileSettingsPage() {
  const router = useRouter();
  const { logout } = useAuth();

  // Profile fields state
  const [businessName, setBusinessName] = useState("");
  const [businessLogo, setBusinessLogo] = useState<string | null>(null);
  const [founderName, setFounderName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [industryLabel, setIndustryLabel] = useState("");
  const [teamSize, setTeamSize] = useState<number | string>(1);
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

  // Load authoritative profile from backend, using localStorage only as an initial hint
  useEffect(() => {
    let active = true;
    try {
      const sessionStr = localStorage.getItem("bizzpal_user_session");
      if (sessionStr) {
        const sess = JSON.parse(sessionStr);
        if (sess.email) setEmail(sess.email);
        if (sess.name) setFounderName(sess.name);
        if (sess.provider) setProvider(sess.provider);
      }

      const profileStr = localStorage.getItem("bizzpal_business_profile");
      if (profileStr) {
        const p = JSON.parse(profileStr);
        if (p.logoUrl || p.logo || p.logo_url) setBusinessLogo(p.logoUrl || p.logo || p.logo_url);
        if (p.name) setBusinessName(p.name);
        if (p.founderName) setFounderName(p.founderName);
        if (p.website) setWebsite(p.website);
        const key = BUSINESS_TYPES.find(b => b.id === p.industryKey || b.id === p.industry || b.title === p.industry || b.title === p.industryLabel)?.id;
        if (key) setIndustry(key);
        if (p.industryLabel || p.industry) setIndustryLabel(p.industryLabel || p.industry);
        if (p.teamSize !== undefined) setTeamSize(p.teamSize);
      }
    } catch (e) {
      console.error("Error reading cached profile:", e);
    }

    (async () => {
      try {
        const [sessRes, intakeRes] = await Promise.all([
          fetch("/api/auth/session", { cache: "no-store" }),
          fetch("/api/business/intake", { cache: "no-store" }),
        ]);
        if (!active) return;

        if (sessRes.ok) {
          const s = await sessRes.json().catch(() => null);
          if (s?.user) {
            if (s.user.email) setEmail(s.user.email);
            if (s.user.name) setFounderName(prev => prev || s.user.name);
            if (s.user.provider) setProvider(s.user.provider);
          }
        }

        if (intakeRes.ok) {
          const d = await intakeRes.json().catch(() => null);
          if (d?.success && d?.business) {
            const b = d.business;
            if (b.logoUrl !== undefined) setBusinessLogo(b.logoUrl || null);
            if (b.name) setBusinessName(b.name);
            if (b.founderName) setFounderName(b.founderName);
            if (b.website !== undefined) setWebsite(b.website || "");
            if (b.teamSize !== undefined) setTeamSize(b.teamSize);
            const matched = BUSINESS_TYPES.find(
              item => item.id === b.industry || item.title === b.industry
            );
            if (matched) {
              setIndustry(matched.id);
              setIndustryLabel(matched.title);
            } else if (b.industry) {
              setIndustryLabel(b.industry);
            }
          }
        }
      } catch {
        // Keep hydrated hint if offline
      }
    })();

    return () => {
      active = false;
    };
  }, []);


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

      const existingStr = localStorage.getItem("bizzpal_business_profile");
      const existing = existingStr ? JSON.parse(existingStr) : {};

      const updatedProfile = {
        ...existing,
        name: cleanBusinessName,
        founderName: cleanFounderName,
        website: cleanWebsite,
        industry: industryLabel,
        industryKey: industry,
        industryLabel,
        logoUrl: businessLogo || null,
        teamSize: numTeam,
        updatedAt: new Date().toISOString(),
      };

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

      // 3. Persist cleanly to SQLite intake (do not overwrite financial figures or integrations) and verify response
      const intakeRes = await fetch("/api/business/intake", {
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
        }),
      });
      const intakeJson = await intakeRes.json().catch(() => ({}));
      if (!intakeRes.ok || !intakeJson.success) {
        throw new Error(intakeJson.error || "Could not save your business profile to the server.");
      }

      const cleanEmail = email.trim().toLowerCase();
      if (cleanEmail) {
        const acctRes = await fetch("/api/auth/account-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: cleanEmail,
            name: cleanFounderName,
            businessProfile: updatedProfile,
          }),
        }).catch(() => null);
        if (acctRes && !acctRes.ok) {
          const acctJson = await acctRes.json().catch(() => ({}));
          throw new Error(acctJson.error || "Could not update your account record.");
        }
      }

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
    if (!(await askConfirm({ title: "Sign out of BizzPal?", confirmLabel: "Sign out" }))) return;
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/session", { method: "DELETE" }).catch(() => {});
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

      // 3. Clear server session and local storage
      await fetch("/api/auth/session", { method: "DELETE" }).catch(() => {});
      localStorage.removeItem("bizzpal_user_session");
      localStorage.removeItem("bizzpal_business_profile");
      if (cleanEmail) {
        localStorage.removeItem(`bizzpal_user_business_${cleanEmail}`);
      }

      // 4. Redirect to login
      showNotice("Your account and business data have been permanently deleted.", "success");
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
              {industryLabel ? `${industryLabel} · ` : ""}{Number(teamSize) || 1} {Number(teamSize) === 1 ? "person" : "people"}
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
                    showNotice("Please choose an image under 2 MB.", "error");
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
                readOnly
                disabled
                placeholder="founder@company.com"
                className={`${inputClass} opacity-75 cursor-not-allowed bg-surface-2/60`}
              />
              <p className="text-xs text-text-muted mt-1.5 capitalize">
                Signed in with {provider} · account email cannot be changed
              </p>
            </div>

            <div className="lg:order-6">
              <label className="block text-sm font-medium text-text mb-1.5">Website</label>
              <input
                type="text"
                value={website}
                onChange={e => setWebsite(e.target.value)}
                placeholder="e.g. yourcompany.com"
                className={inputClass}
              />
            </div>

            <div className="lg:order-2">
              <label className="block text-sm font-medium text-text mb-1.5">Industry</label>
              <select
                value={industry}
                onChange={e => {
                  setIndustry(e.target.value);
                  const t = BUSINESS_TYPES.find(b => b.id === e.target.value);
                  setIndustryLabel(t ? t.title : "");
                }}
                className={inputClass}
              >
                {!industry && <option value="">Select your industry</option>}
                {BUSINESS_TYPES.map(b => (
                  <option key={b.id} value={b.id}>{b.title}</option>
                ))}
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
