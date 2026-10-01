"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  ShieldCheck,
  UserPlus,
  Key,
  Shield,
  Clock,
  CheckCircle2,
  Lock,
  Search,
  Sliders,
  FileText,
  AlertTriangle,
  Trash2,
  RotateCw
} from "lucide-react";
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brass/10 border border-brass/30 flex items-center justify-center text-brass">
              <Users className="w-4 h-4" />
            </div>
            <h1 className="text-lg font-bold text-text">Team & Permissions</h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-brass-soft text-brass font-bold uppercase tracking-wider">
              Governance & RBAC
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1 font-medium">
            Control organizational member roles, AI agent invocation privileges, and security access tiers across your business workspace.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchTeamData}
            title="Refresh team"
            className="p-2 rounded-lg border border-line bg-surface hover:bg-surface-2 text-text-muted hover:text-text cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-brass" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => setIsInviteOpen(true)}
            className="px-4 py-2 rounded-lg bg-brass text-white text-xs font-bold shadow-md hover:brightness-110 btn-tactile inline-flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Invite Team Member</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 border-b border-line pb-2 text-xs">
        {[
          { id: "members", label: `Members (${members.length})` },
          { id: "roles", label: "Permission Matrix" },
          { id: "sso", label: "Enterprise SSO / SAML" },
          { id: "audit", label: `Security Audit Logs (${auditLogs.length})` },
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all btn-tactile cursor-pointer ${
              selectedTab === tab.id
                ? "bg-brass text-white shadow-xs"
                : "text-text-muted hover:text-text hover:bg-surface-2"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Members Directory */}
      {selectedTab === "members" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search employees or copilots..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-surface border border-line text-xs text-text placeholder:text-text-muted focus:outline-none focus:border-brass"
              />
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line bg-surface-2/60 text-[11px] font-bold text-text-muted uppercase tracking-wider">
                    <th className="p-3">Member / Entity</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">2FA Security</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Activity</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {loading && members.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-xs text-text-muted">
                        Loading live team directory from SQLite database...
                      </td>
                    </tr>
                  ) : filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-xs text-text-muted">
                        No team members match the search filter.
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map(m => (
                      <tr key={m.id} className="hover:bg-surface-2/40 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-brass/10 border border-brass/30 flex items-center justify-center font-bold text-brass text-[11px]">
                              {m.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-text flex items-center gap-1.5">
                                <span>{m.name}</span>
                                {m.role === "Owner" && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-brass/20 text-brass font-bold">
                                    FOUNDER
                                  </span>
                                )}
                                {m.email.includes(".ai@") && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-jade/20 text-jade font-bold">
                                    AUTONOMOUS AGENT
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-text-muted font-mono">{m.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="p-3">
                          <select
                            value={m.role}
                            disabled={m.role === "Owner"}
                            onChange={e => handleChangeRole(m.id, e.target.value)}
                            className="px-2 py-1 rounded bg-surface border border-line text-[11px] font-semibold text-text focus:outline-none focus:border-brass cursor-pointer disabled:opacity-60"
                          >
                            <option value="Owner">Owner</option>
                            <option value="Executive">Executive</option>
                            <option value="Manager">Manager</option>
                            <option value="Operator">Operator</option>
                          </select>
                        </td>

                        <td className="p-3 text-text-muted font-medium">{m.department}</td>

                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => handleToggle2FA(m)}
                            className="inline-flex items-center gap-1 cursor-pointer"
                            title="Click to toggle 2FA requirement"
                          >
                            {m.twoFactor ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-jade font-semibold">
                                <ShieldCheck className="w-3.5 h-3.5" /> Enforced
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-rust font-semibold">
                                <AlertTriangle className="w-3.5 h-3.5" /> Optional
                              </span>
                            )}
                          </button>
                        </td>

                        <td className="p-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              m.status === "active"
                                ? "bg-jade/15 text-jade"
                                : m.status === "invited"
                                ? "bg-brass/15 text-brass"
                                : "bg-rust/15 text-rust"
                            }`}
                          >
                            {m.status}
                          </span>
                        </td>

                        <td className="p-3 text-text-muted text-[11px]">{m.lastActive}</td>

                        <td className="p-3 text-right">
                          {m.role !== "Owner" && !m.email.includes(".ai@") && (
                            <button
                              type="button"
                              onClick={() => handleDeleteMember(m.id, m.name)}
                              className="p-1.5 rounded text-text-muted hover:text-rust hover:bg-rust/10 transition-colors cursor-pointer"
                              title="Revoke access"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

      {/* Tab 2: Roles Matrix */}
      {selectedTab === "roles" && (
        <div className="rounded-xl border border-line bg-surface overflow-hidden shadow-xs space-y-4 p-5">
          <div>
            <h2 className="text-xs font-bold text-text uppercase tracking-wider">Role-Based Access Control (RBAC)</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Granular capability authorization enforced at the API gateway layer across all business intelligence domains.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-line bg-surface-2/60 text-[11px] font-bold text-text-muted">
                  <th className="p-3">Capability / Surface</th>
                  <th className="p-3 text-center">Owner</th>
                  <th className="p-3 text-center">Executive</th>
                  <th className="p-3 text-center">Manager</th>
                  <th className="p-3 text-center">Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-[11px]">
                <tr>
                  <td className="p-3 font-semibold text-text">Live Cash Ledger & Financial Projections</td>
                  <td className="p-3 text-center text-jade font-bold">✓ Full</td>
                  <td className="p-3 text-center text-jade font-bold">✓ Full</td>
                  <td className="p-3 text-center text-text-muted">Read-only</td>
                  <td className="p-3 text-center text-rust">✕ Restricted</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-text">Autonomous AI Copilots (Astra / Marcus)</td>
                  <td className="p-3 text-center text-jade font-bold">✓ Full</td>
                  <td className="p-3 text-center text-jade font-bold">✓ Full</td>
                  <td className="p-3 text-center text-jade font-bold">✓ Full</td>
                  <td className="p-3 text-center text-text-muted">Prompt-only</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-text">Company Legal & GST Tax Compliance Hub</td>
                  <td className="p-3 text-center text-jade font-bold">✓ Full</td>
                  <td className="p-3 text-center text-jade font-bold">✓ Edit</td>
                  <td className="p-3 text-center text-rust">✕ Restricted</td>
                  <td className="p-3 text-center text-rust">✕ Restricted</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-text">Tools & Financial Calculators</td>
                  <td className="p-3 text-center text-jade font-bold">✓ Full</td>
                  <td className="p-3 text-center text-jade font-bold">✓ Full</td>
                  <td className="p-3 text-center text-jade font-bold">✓ Full</td>
                  <td className="p-3 text-center text-text-muted">Read-only</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-text">Visual Workflows Execution & Build</td>
                  <td className="p-3 text-center text-jade font-bold">✓ Full</td>
                  <td className="p-3 text-center text-jade font-bold">✓ Full</td>
                  <td className="p-3 text-center text-jade font-bold">✓ Edit</td>
                  <td className="p-3 text-center text-rust">✕ Restricted</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-text">Integrations & API Tokens</td>
                  <td className="p-3 text-center text-jade font-bold">✓ Full</td>
                  <td className="p-3 text-center text-rust">✕ Restricted</td>
                  <td className="p-3 text-center text-rust">✕ Restricted</td>
                  <td className="p-3 text-center text-rust">✕ Restricted</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: SSO */}
      {selectedTab === "sso" && (
        <div className="p-6 rounded-2xl border border-line bg-surface shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brass/10 border border-brass/30 flex items-center justify-center text-brass">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-text uppercase tracking-wider">Enterprise Single Sign-On (SSO)</h2>
              <p className="text-xs text-text-muted mt-0.5">
                Enforce SAML 2.0 / OIDC authentication for all employees logging into BizzPal OS.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-surface-2 border border-line space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text">Google Workspace SSO</span>
                <span className="text-[10px] text-jade font-semibold">● Verified</span>
              </div>
              <p className="text-[11px] text-text-muted">One-click login with company Google accounts.</p>
            </div>
            <div className="p-4 rounded-xl bg-surface-2 border border-line space-y-2 opacity-70">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text">Okta SAML 2.0</span>
                <span className="text-[10px] text-text-muted font-semibold">Enterprise</span>
              </div>
              <p className="text-[11px] text-text-muted">Automate user provisioning and SCIM group sync.</p>
            </div>
            <div className="p-4 rounded-xl bg-surface-2 border border-line space-y-2 opacity-70">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text">Microsoft Entra ID</span>
                <span className="text-[10px] text-text-muted font-semibold">Enterprise</span>
              </div>
              <p className="text-[11px] text-text-muted">Seamless enterprise Active Directory authentication.</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Audit Logs */}
      {selectedTab === "audit" && (
        <div className="rounded-xl border border-line bg-surface overflow-hidden shadow-xs">
          <div className="p-4 border-b border-line flex items-center justify-between">
            <h2 className="text-xs font-bold text-text uppercase tracking-wider">
              Immutable Security Audit Trail
            </h2>
            <span className="text-[11px] text-text-muted">Live SQLite Log Stream</span>
          </div>
          <div className="divide-y divide-line text-xs">
            {auditLogs.length === 0 ? (
              <div className="p-6 text-center text-xs text-text-muted">
                No audit events recorded yet.
              </div>
            ) : (
              auditLogs.map(log => (
                <div key={log.id} className="p-3.5 flex items-center justify-between hover:bg-surface-2/40 transition-colors">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-text">{log.action}</span>
                    <div className="text-[11px] text-text-muted">
                      Initiated by <span className="text-brass font-medium">{log.user}</span> · IP: {log.ip}
                    </div>
                  </div>
                  <span className="text-[11px] text-text-muted font-mono">{log.time}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      <PortalModal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)}>
        <div className="w-full max-w-md p-6 rounded-2xl border border-line bg-surface shadow-2xl space-y-4 animate-scale-in">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <h3 className="text-sm font-bold text-text">Invite Colleague to BizzPal</h3>
            <button
              type="button"
              onClick={() => setIsInviteOpen(false)}
              className="text-xs text-text-muted hover:text-text cursor-pointer"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleInvite} className="space-y-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-text-muted mb-1">Full Name</label>
              <input
                type="text"
                placeholder="e.g. Rahul Mehta"
                value={inviteName}
                onChange={e => setInviteName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-line text-text focus:outline-none focus:border-brass"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-text-muted mb-1">Company Email *</label>
              <input
                type="email"
                required
                placeholder="colleague@yourcompany.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-line text-text focus:outline-none focus:border-brass"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-text-muted mb-1">Role Permission</label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-line text-text focus:outline-none focus:border-brass"
                >
                  <option value="Executive">Executive</option>
                  <option value="Manager">Manager</option>
                  <option value="Operator">Operator</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-muted mb-1">Department</label>
                <input
                  type="text"
                  value={inviteDept}
                  onChange={e => setInviteDept(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-line text-text focus:outline-none focus:border-brass"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={invite2FA}
                  onChange={e => setInvite2FA(e.target.checked)}
                  className="rounded border-line text-brass focus:ring-brass"
                />
                <span className="text-[11px] text-text">Require 2FA Authentication</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-line">
              <button
                type="button"
                onClick={() => setIsInviteOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-line text-text-muted hover:text-text cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 rounded-lg bg-brass text-white font-bold hover:brightness-110 shadow-xs cursor-pointer disabled:opacity-60"
              >
                {submitting ? "Inviting..." : "Send Invitation"}
              </button>
            </div>
          </form>
        </div>
      </PortalModal>
    </div>
  );
}
