"use client";

import React, { useState, useEffect } from "react";
import { ROLES, LEVELS, AREAS, DEFAULT_MATRIX, Matrix, Level, Role } from "@/lib/permissions";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { UserPlus, Trash2, RotateCw } from "lucide-react";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { PortalModal } from "@/components/ui/PortalModal";

import { askConfirm } from "@/components/ui/dialogs";
interface Teammate {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "invited" | "verified";
  link: string;
  createdAt: string;
  verifiedAt: string | null;
}

interface AuditLog {
  id: string;
  action: string;
  user: string;
  time: string;
  ip: string;
}

const when = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

export default function TeamPage() {
  const [teammates, setTeammates] = useState<Teammate[]>([]);
  const [owner, setOwner] = useState<{ name: string; email: string } | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<"members" | "roles" | "audit">("members");
  const [searchQuery, setSearchQuery] = useState("");
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Manager");
  const [inviteError, setInviteError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Close invite modal on Escape
  useEscapeKey(() => setIsInviteOpen(false), isInviteOpen);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      const [inv, team, me] = await Promise.all([
        fetch("/api/team/invites", { cache: "no-store" }).then(r => r.json()).catch(() => null),
        fetch("/api/team", { cache: "no-store" }).then(r => r.json()).catch(() => null),
        fetch("/api/auth/session", { cache: "no-store" }).then(r => r.json()).catch(() => null),
      ]);
      if (inv?.invites) setTeammates(inv.invites);
      if (team?.success && Array.isArray(team.auditLogs)) setAuditLogs(team.auditLogs);
      if (me?.authenticated) setOwner({ name: me.name, email: me.email });
    } catch (e) {
      console.error("Failed to fetch team data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamData();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || submitting) return;
    setSubmitting(true);
    setInviteError("");
    try {
      const res = await fetch("/api/team/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteEmail: inviteEmail.trim(), name: inviteName.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setNotice(
          data.emailed
            ? `Invite emailed to ${inviteEmail.trim()}.`
            : "The invite was created, but email isn't available on this server. Use the copy-link button to send it yourself."
        );
        setInviteName("");
        setInviteEmail("");
        setIsInviteOpen(false);
        await fetchTeamData();
      } else {
        setInviteError(data.error || "Couldn't create the invite.");
      }
    } catch {
      setInviteError("Couldn't reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangeRole = async (id: string, role: string) => {
    await fetch("/api/team/invites", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, role }),
    }).catch(() => {});
    await fetchTeamData();
  };

  const handleRemove = async (t: Teammate) => {
    if (!(await askConfirm({ title: `Remove ${t.name || t.email}?`, message: "They will lose access to this business straight away.", confirmLabel: "Remove", danger: true }))) return;
    await fetch("/api/team/invites", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: t.id }),
    }).catch(() => {});
    await fetchTeamData();
  };

  const handleResend = async (t: Teammate) => {
    const res = await fetch("/api/team/invites", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: t.id, resend: true }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setNotice(data?.emailed ? `Invite sent again to ${t.email}.` : "Email isn't available on this server. Use the copy-link button to send it yourself.");
  };

  const copyLink = async (t: Teammate) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${t.link}`);
      setNotice(`Invite link for ${t.email} copied.`);
    } catch {
      setNotice("Couldn't copy the link. Please copy it from your browser.");
    }
  };

  const q = searchQuery.toLowerCase();
  const filteredTeammates = teammates.filter(t => t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q));

  const inputClass =
    "w-full px-3 py-2 rounded-lg bg-surface border border-line text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-brass";

  const perms = usePermissions();
  const [draft, setDraft] = useState<Matrix>(DEFAULT_MATRIX);
  const [permSaving, setPermSaving] = useState(false);
  const [permMessage, setPermMessage] = useState<string | null>(null);
  const isOwner = perms.role === "Owner";

  // Start from what is saved on the server
  useEffect(() => {
    setDraft(perms.matrix);
  }, [perms.matrix]);

  const changeLevel = (areaId: string, role: Role, level: Level) => {
    setDraft(prev => ({ ...prev, [areaId]: { ...prev[areaId], [role]: level } }));
    setPermMessage(null);
  };

  const savePermissions = async () => {
    setPermSaving(true);
    setPermMessage(null);
    try {
      const res = await fetch("/api/team/permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matrix: draft }),
      });
      const data = await res.json();
      if (data.success) {
        try {
          localStorage.setItem("bizzpal_team_permissions", JSON.stringify(data.matrix));
        } catch {}
        window.dispatchEvent(new Event("bizzpal_permissions_updated"));
        setPermMessage("Saved. The sidebar and page access now follow these settings.");
      } else {
        setPermMessage(data.error || "Could not save. Please try again.");
      }
    } catch {
      setPermMessage("Could not save. Please try again.");
    }
    setPermSaving(false);
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-line">
        <div>
          <h1 className="text-xl font-bold text-text">Team</h1>
          <p className="text-sm text-text-muted mt-1">Invite colleagues and choose what each role can open. Your rules are enforced on the server.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchTeamData}
            aria-label="Refresh"
            title="Refresh"
            className="p-2 rounded-lg border border-line bg-surface hover:bg-surface-2 text-text-muted hover:text-text cursor-pointer"
          >
            <RotateCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => setIsInviteOpen(true)}
            className="px-3.5 py-2 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 inline-flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Invite member
          </button>
        </div>
      </div>

      <nav
        className="inline-flex max-w-full items-center gap-1 p-1 rounded-lg bg-surface-2 border border-line overflow-x-auto"
        aria-label="Team sections"
      >
        {[
          { id: "members", label: "Members", count: teammates.length + 1 },
          { id: "roles", label: "Permissions", count: undefined },
          { id: "audit", label: "Activity log", count: auditLogs.length },
        ].map(tab => {
          const active = selectedTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedTab(tab.id as any)}
              className={`px-4 py-1.5 rounded-md text-sm whitespace-nowrap cursor-pointer transition-colors ${
                active ? "bg-surface text-text font-medium shadow-sm" : "text-text-muted hover:text-text"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {selectedTab === "members" && (
        <div className="space-y-4">
          {notice && <p className="text-sm text-text-muted">{notice}</p>}
          <input
            type="text"
            placeholder="Search by name or email"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full sm:w-80 px-3.5 py-2 rounded-lg bg-surface border border-line text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-brass"
          />

          <div className="rounded-xl border border-line bg-surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-line text-xs font-medium text-text-muted">
                    <th className="py-3 pl-5 pr-3">Member</th>
                    <th className="py-3 px-3">Role</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 pl-3 pr-5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {owner && !q && (
                    <tr>
                      <td className="py-4 pl-5 pr-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-surface-2 border border-line flex items-center justify-center text-sm text-text shrink-0">
                            {(owner.name || owner.email).charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-text">{owner.name} <span className="ml-1 text-xs font-normal text-text-muted">You</span></p>
                            <p className="text-xs text-text-muted">{owner.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-3 text-sm text-text">Owner</td>
                      <td className="py-4 px-3">
                        <span className="inline-flex items-center gap-1.5 text-sm text-text-muted"><span className="w-1.5 h-1.5 rounded-full bg-jade" />Active</span>
                      </td>
                      <td className="py-4 px-3 text-sm text-text-muted">—</td>
                      <td className="py-4 pl-3 pr-5" />
                    </tr>
                  )}
                  {loading && teammates.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-sm text-text-muted">Loading team…</td>
                    </tr>
                  ) : filteredTeammates.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-sm text-text-muted">
                        {teammates.length === 0 ? "No teammates yet. Use Invite member to add your first one." : "No members match your search."}
                      </td>
                    </tr>
                  ) : (
                    filteredTeammates.map(t => (
                      <tr key={t.id} className="hover:bg-surface-2/40">
                        <td className="py-4 pl-5 pr-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-surface-2 border border-line flex items-center justify-center text-sm text-text shrink-0">
                              {(t.name || t.email).charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-text">{t.name || t.email.split("@")[0]}</p>
                              <p className="text-xs text-text-muted">{t.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-3">
                          <select
                            value={t.role}
                            onChange={e => handleChangeRole(t.id, e.target.value)}
                            aria-label={`Role for ${t.email}`}
                            className="px-2.5 py-1.5 rounded-lg bg-surface border border-line text-sm text-text focus:outline-none focus:border-brass cursor-pointer"
                          >
                            <option value="Executive">Executive</option>
                            <option value="Manager">Manager</option>
                            <option value="Operator">Operator</option>
                          </select>
                        </td>
                        <td className="py-4 px-3">
                          <span className="inline-flex items-center gap-1.5 text-sm text-text-muted">
                            <span className={`w-1.5 h-1.5 rounded-full ${t.status === "verified" ? "bg-jade" : "bg-amber-500"}`} />
                            {t.status === "verified" ? "Joined" : "Invited"}
                          </span>
                        </td>
                        <td className="py-4 px-3 text-sm text-text-muted whitespace-nowrap">{when(t.status === "verified" ? t.verifiedAt : t.createdAt)}</td>
                        <td className="py-4 pl-3 pr-5">
                          <div className="flex items-center justify-end gap-3 text-sm">
                            {t.status === "invited" && (
                              <>
                                <button type="button" onClick={() => handleResend(t)} className="text-brass hover:underline cursor-pointer">Resend</button>
                                <button type="button" onClick={() => copyLink(t)} className="text-brass hover:underline cursor-pointer">Copy link</button>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemove(t)}
                              className="p-1.5 rounded text-text-muted hover:text-rust cursor-pointer"
                              title="Remove access"
                              aria-label={`Remove ${t.email}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {selectedTab === "roles" && (
        <div className="rounded-2xl border border-line bg-surface shadow-sm overflow-hidden">
          <div className="p-6 border-b border-line flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-text">What each role can access</h2>
              <p className="text-sm text-text-muted mt-0.5 max-w-xl">
                Choose &ldquo;None&rdquo; to hide a section from a role. Owners always have full access, and only
                owners can open this Team page. “Read only” lets a role view a section but not change it.
              </p>
            </div>
            <button
              type="button"
              onClick={savePermissions}
              disabled={!isOwner || permSaving}
              className="px-5 py-2 rounded-xl bg-brass text-white text-sm font-medium hover:brightness-110 disabled:opacity-50 cursor-pointer shrink-0"
            >
              {permSaving ? "Saving…" : "Save permissions"}
            </button>
          </div>
          {(permMessage || !isOwner) && (
            <p className="px-6 pt-4 text-sm text-text-muted">
              {!isOwner ? "Only the account owner can change permissions." : permMessage}
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-line text-xs font-medium text-text-muted">
                  <th className="py-3 pl-6 pr-3">Area</th>
                  {ROLES.map(r => (
                    <th key={r} className="py-3 px-3">
                      {r}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {AREAS.map(area => (
                  <tr key={area.id}>
                    <td className="py-4 pl-6 pr-3 text-sm text-text">{area.label}</td>
                    {ROLES.map(role => (
                      <td key={role} className="py-3 px-3">
                        {role === "Owner" ? (
                          <span className="text-sm text-text-muted">Full</span>
                        ) : (
                          <select
                            value={draft[area.id]?.[role] ?? "Full"}
                            onChange={e => changeLevel(area.id, role, e.target.value as Level)}
                            disabled={!isOwner}
                            aria-label={`${area.label} for ${role}`}
                            className="text-sm px-2.5 py-1.5 rounded-lg border border-line bg-surface text-text cursor-pointer disabled:opacity-60"
                          >
                            {LEVELS.map(l => (
                              <option key={l} value={l}>
                                {l}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {selectedTab === "audit" && (
        <div className="rounded-xl border border-line bg-surface overflow-hidden">
          <div className="p-5 border-b border-line">
            <h2 className="text-base font-semibold text-text">Activity log</h2>
            <p className="text-sm text-text-muted mt-0.5">Sign-ins and changes made by your team.</p>
          </div>
          {auditLogs.length === 0 ? (
            <p className="p-10 text-center text-sm text-text-muted">No activity recorded yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {auditLogs.map(log => (
                <li key={log.id} className="px-5 py-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-text">{log.action}</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {log.user} · {log.ip}
                    </p>
                  </div>
                  <span className="text-xs text-text-muted whitespace-nowrap">{log.time}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <PortalModal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)}>
        <form
          onSubmit={handleInvite}
          className="w-[30rem] max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-surface shadow-lg overflow-hidden"
        >
          <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
            <div>
              <h3 className="text-lg font-semibold text-text">Invite a colleague</h3>
              <p className="text-sm text-text-muted mt-1">We email them an invite. They confirm their work email with Google and join your workspace.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsInviteOpen(false)}
              aria-label="Close"
              className="p-1 text-text-muted hover:text-text cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="px-6 pb-6 space-y-4 text-sm">
            <div>
              <label className="block font-medium text-text mb-1.5">Full name</label>
              <input
                type="text"
                placeholder="e.g. Rahul Mehta"
                value={inviteName}
                onChange={e => setInviteName(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block font-medium text-text mb-1.5">Email</label>
              <input
                type="email"
                required
                placeholder="colleague@yourcompany.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block font-medium text-text mb-1.5">Role</label>
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className={inputClass}>
                <option value="Executive">Executive</option>
                <option value="Manager">Manager</option>
                <option value="Operator">Operator</option>
              </select>
              <p className="text-xs text-text-muted mt-1.5">What each role can open is set under Permissions.</p>
            </div>
            {inviteError && <p className="text-sm text-rust">{inviteError}</p>}
          </div>

          <div className="px-6 py-4 border-t border-line bg-surface-2/40 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsInviteOpen(false)}
              className="px-3.5 py-2 rounded-lg text-sm text-text-muted hover:text-text cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 cursor-pointer disabled:opacity-60"
            >
              {submitting ? "Sending…" : "Send invitation"}
            </button>
          </div>
        </form>
      </PortalModal>
    </div>
  );
}
