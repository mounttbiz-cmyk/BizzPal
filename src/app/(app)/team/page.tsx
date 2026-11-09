"use client";

import React, { useState, useEffect } from "react";
import { UserPlus, Trash2, RotateCw } from "lucide-react";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { PortalModal } from "@/components/ui/PortalModal";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "Owner" | "Executive" | "Manager" | "Operator";
  department: string;
  twoFactor: boolean;
  status: "active" | "invited" | "suspended";
  lastActive: string;
}

interface AuditLog {
  id: string;
  action: string;
  user: string;
  time: string;
  ip: string;
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<"members" | "roles" | "audit" | "sso">("members");
  const [searchQuery, setSearchQuery] = useState("");
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamMember["role"]>("Manager");
  const [inviteDept, setInviteDept] = useState("Operations & Delivery");
  const [invite2FA, setInvite2FA] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Close invite modal on Escape
  useEscapeKey(() => setIsInviteOpen(false), isInviteOpen);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/team");
      const data = await res.json();
      if (data.success) {
        if (Array.isArray(data.members) && data.members.length > 0) {
          setMembers(data.members);
        }
        if (Array.isArray(data.auditLogs)) {
          setAuditLogs(data.auditLogs);
        }
      }
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
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: inviteName.trim() || inviteEmail.split("@")[0],
          email: inviteEmail.trim(),
          role: inviteRole,
          department: inviteDept,
          twoFactor: invite2FA,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setInviteName("");
        setInviteEmail("");
        setIsInviteOpen(false);
        await fetchTeamData();
      }
    } catch (err) {
      console.error("Failed to invite member:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle2FA = async (member: TeamMember) => {
    try {
      await fetch("/api/team", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: member.id,
          twoFactor: !member.twoFactor,
        }),
      });
      await fetchTeamData();
    } catch (err) {
      console.error("Failed to toggle 2FA:", err);
    }
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    try {
      await fetch("/api/team", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: memberId,
          role: newRole,
        }),
      });
      await fetchTeamData();
    } catch (err) {
      console.error("Failed to update role:", err);
    }
  };

  const handleDeleteMember = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to revoke access and remove ${name}?`)) return;
    try {
      await fetch(`/api/team?id=${id}`, { method: "DELETE" });
      await fetchTeamData();
    } catch (err) {
      console.error("Failed to remove member:", err);
    }
  };

  const filteredMembers = members.filter(
    m =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const inputClass =
    "w-full px-3 py-2 rounded-lg bg-surface border border-line text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-brass";

  const statusDot: Record<TeamMember["status"], string> = {
    active: "bg-jade",
    invited: "bg-amber-500",
    suspended: "bg-rust",
  };
  const statusText: Record<TeamMember["status"], string> = {
    active: "Active",
    invited: "Invited",
    suspended: "Suspended",
  };

  const matrix: { label: string; access: [string, string, string, string] }[] = [
    { label: "Cash ledger and financial projections", access: ["Full", "Full", "Read only", "None"] },
    { label: "AI advisors (CEO and CFO)", access: ["Full", "Full", "Full", "Prompts only"] },
    { label: "Legal and GST compliance", access: ["Full", "Edit", "None", "None"] },
    { label: "Tools and calculators", access: ["Full", "Full", "Full", "Read only"] },
    { label: "Workflows", access: ["Full", "Full", "Edit", "None"] },
    { label: "Integrations and API tokens", access: ["Full", "None", "None", "None"] },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-line">
        <div>
          <h1 className="text-xl font-bold text-text">Team</h1>
          <p className="text-sm text-text-muted mt-1">Manage who can access your workspace and what they can do.</p>
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
          { id: "members", label: "Members", count: members.length },
          { id: "roles", label: "Permissions", count: undefined },
          { id: "sso", label: "Single sign-on", count: undefined },
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
              {tab.count !== undefined && <span className="ml-1.5 text-xs text-text-muted">{tab.count}</span>}
            </button>
          );
        })}
      </nav>

      {selectedTab === "members" && (
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Search by name, email or department"
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
                    <th className="py-3 px-3">Department</th>
                    <th className="py-3 px-3">2FA</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Last active</th>
                    <th className="py-3 pl-3 pr-5 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {loading && members.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-sm text-text-muted">
                        Loading team…
                      </td>
                    </tr>
                  ) : filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-sm text-text-muted">
                        No members match your search.
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map(m => (
                      <tr key={m.id} className="hover:bg-surface-2/40">
                        <td className="py-4 pl-5 pr-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-surface-2 border border-line flex items-center justify-center text-sm text-text shrink-0">
                              {m.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-text">
                                {m.name}
                                {m.role === "Owner" && <span className="ml-2 text-xs font-normal text-text-muted">Founder</span>}
                                {m.email.includes(".ai@") && (
                                  <span className="ml-2 text-xs font-normal text-text-muted">AI advisor</span>
                                )}
                              </p>
                              <p className="text-xs text-text-muted">{m.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-3">
                          <select
                            value={m.role}
                            disabled={m.role === "Owner"}
                            onChange={e => handleChangeRole(m.id, e.target.value)}
                            className="px-2.5 py-1.5 rounded-lg bg-surface border border-line text-sm text-text focus:outline-none focus:border-brass cursor-pointer disabled:opacity-60 disabled:cursor-default"
                          >
                            <option value="Owner">Owner</option>
                            <option value="Executive">Executive</option>
                            <option value="Manager">Manager</option>
                            <option value="Operator">Operator</option>
                          </select>
                        </td>

                        <td className="py-4 px-3 text-sm text-text-muted">{m.department}</td>

                        <td className="py-4 px-3">
                          <button
                            type="button"
                            onClick={() => handleToggle2FA(m)}
                            className={`text-sm cursor-pointer hover:underline ${m.twoFactor ? "text-text" : "text-rust"}`}
                            title="Click to change"
                          >
                            {m.twoFactor ? "Required" : "Optional"}
                          </button>
                        </td>

                        <td className="py-4 px-3">
                          <span className="inline-flex items-center gap-1.5 text-sm text-text-muted">
                            <span className={`w-1.5 h-1.5 rounded-full ${statusDot[m.status]}`} />
                            {statusText[m.status]}
                          </span>
                        </td>

                        <td className="py-4 px-3 text-sm text-text-muted whitespace-nowrap">{m.lastActive}</td>

                        <td className="py-4 pl-3 pr-5 text-right">
                          {m.role !== "Owner" && !m.email.includes(".ai@") && (
                            <button
                              type="button"
                              onClick={() => handleDeleteMember(m.id, m.name)}
                              className="p-1.5 rounded text-text-muted hover:text-rust cursor-pointer"
                              title="Remove access"
                              aria-label={`Remove ${m.name}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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
        <div className="rounded-xl border border-line bg-surface overflow-hidden">
          <div className="p-5 border-b border-line">
            <h2 className="text-base font-semibold text-text">What each role can access</h2>
            <p className="text-sm text-text-muted mt-0.5">Assign roles from the Members tab.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-line text-xs font-medium text-text-muted">
                  <th className="py-3 pl-5 pr-3">Area</th>
                  {["Owner", "Executive", "Manager", "Operator"].map(r => (
                    <th key={r} className="py-3 px-3">
                      {r}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {matrix.map(row => (
                  <tr key={row.label}>
                    <td className="py-4 pl-5 pr-3 text-sm text-text">{row.label}</td>
                    {row.access.map((a, i) => (
                      <td key={i} className={`py-4 px-3 text-sm ${a === "None" ? "text-text-muted/60" : "text-text-muted"}`}>
                        {a}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedTab === "sso" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-text">Single sign-on</h2>
            <p className="text-sm text-text-muted mt-0.5">Let your team sign in with the accounts they already use.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: "Google Workspace", note: "Sign in with company Google accounts.", status: "Available" },
              { name: "Okta (SAML 2.0)", note: "User provisioning and group sync.", status: "Enterprise plan" },
              { name: "Microsoft Entra ID", note: "Active Directory sign-in.", status: "Enterprise plan" },
            ].map(p => (
              <div key={p.name} className="p-5 rounded-xl border border-line bg-surface">
                <h3 className="text-sm font-medium text-text">{p.name}</h3>
                <p className="text-sm text-text-muted mt-1">{p.note}</p>
                <p className="text-xs text-text-muted mt-3">{p.status}</p>
              </div>
            ))}
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
              <p className="text-sm text-text-muted mt-1">They will get an email to join your workspace.</p>
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-text mb-1.5">Role</label>
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value as any)} className={inputClass}>
                  <option value="Executive">Executive</option>
                  <option value="Manager">Manager</option>
                  <option value="Operator">Operator</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-text mb-1.5">Department</label>
                <input type="text" value={inviteDept} onChange={e => setInviteDept(e.target.value)} className={inputClass} />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-text">
              <input
                type="checkbox"
                checked={invite2FA}
                onChange={e => setInvite2FA(e.target.checked)}
                className="w-4 h-4 accent-[#8a6414]"
              />
              Require two-factor authentication
            </label>
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
