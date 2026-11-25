"use client";

import React, { useMemo, useState } from "react";
import { KeyRound, RotateCcw, Trash2 } from "lucide-react";
import {
  AdminModal,
  Avatar,
  EmptyState,
  Panel,
  PanelToolbar,
  SearchInput,
  dangerIconButton,
  formatDate,
  formatLoginTime,
  iconButton,
  inputClass,
  labelClass,
  primaryButton,
  secondaryButton,
  td,
  th,
} from "./ui";

import { askConfirm } from "@/components/ui/dialogs";
interface UserItem {
  id: string;
  email: string;
  name: string;
  provider: string;
  lastLoginAt?: string | null;
  createdAt: string;
}

interface UsersManagerProps {
  users: UserItem[];
  onRefresh: () => Promise<void>;
  notify: (msg: string) => void;
}

const PROVIDERS: Record<string, string> = { google: "Google", password: "Email and password", email: "Email link" };
const fullDate = (d?: string | null) =>
  d && !isNaN(new Date(d).getTime())
    ? new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })
    : "—";

export function UsersManager({ users, onRefresh, notify }: UsersManagerProps) {
  const [search, setSearch] = useState("");
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [resetFor, setResetFor] = useState<UserItem | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [viewing, setViewing] = useState<UserItem | null>(null);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleDeleteUser = async (u: UserItem) => {
    if (!(await askConfirm({ title: `Remove ${u.email}?`, message: "They will no longer be able to sign in. This cannot be undone.", confirmLabel: "Remove account", danger: true }))) return;
    try {
      setDeletingEmail(u.email);
      const res = await fetch(`/api/admin/tenants?userEmail=${encodeURIComponent(u.email)}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
      notify(data.message || `Removed ${u.email}.`);
      await onRefresh();
    } catch (err: any) {
      notify(`Could not remove the account: ${err.message}`);
    } finally {
      setDeletingEmail(null);
    }
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetFor || newPassword.length < 8) return;
    setResetting(true);
    try {
      const res = await fetch("/api/admin/users/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetFor.email, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || "Could not set the password.");
      notify(data.message || `New password set for ${resetFor.email}.`);
      setResetFor(null);
      setNewPassword("");
    } catch (err: any) {
      notify(err.message);
    } finally {
      setResetting(false);
    }
  };

  const q = search.trim().toLowerCase();
  const filtered = useMemo(
    () => users.filter((u) => !q || [u.email, u.name || "", u.provider || ""].some((v) => v.toLowerCase().includes(q))),
    [users, q],
  );

  return (
    <>
      <Panel>
        <PanelToolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search by email or name" className="sm:w-96" />
          <div className="flex items-center gap-2 sm:ml-auto">
            <span className="text-sm text-text-muted">
              {users.length} {users.length === 1 ? "account" : "accounts"}
            </span>
            <button type="button" onClick={refresh} className={iconButton} title="Refresh" aria-label="Refresh" disabled={refreshing}>
              <RotateCcw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </PanelToolbar>

        {filtered.length === 0 ? (
          q ? (
            <EmptyState title={`No accounts match "${search}"`} />
          ) : (
            <EmptyState title="No accounts yet" text="People appear here once they sign up." />
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className={th}>Person</th>
                  <th className={th}>Signs in with</th>
                  <th className={th}>Joined</th>
                  <th className={th}>Last active</th>
                  <th className={`${th} text-right`}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((u) => (
                  <tr
                    key={u.id || u.email}
                    onClick={() => setViewing(u)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.target === e.currentTarget) setViewing(u);
                    }}
                    tabIndex={0}
                    className="hover:bg-surface-2/40 cursor-pointer focus:outline-none focus-visible:bg-surface-2/60"
                    title="Show all details"
                  >
                    <td className={td}>
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={u.name || u.email} size={32} />
                        <div className="min-w-0">
                          <p className="font-medium text-text truncate max-w-[320px]">{u.name || u.email.split("@")[0]}</p>
                          <p className="text-xs text-text-muted truncate max-w-[320px]">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className={`${td} text-text-muted`}>{PROVIDERS[u.provider] || "Email"}</td>
                    <td className={`${td} text-text-muted whitespace-nowrap`}>{formatDate(u.createdAt)}</td>
                    <td className={`${td} text-text-muted whitespace-nowrap`}>{formatLoginTime(u.lastLoginAt)}</td>
                    <td className={`${td} text-right`} onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setResetFor(u);
                            setNewPassword("");
                          }}
                          className={iconButton}
                          title="Set a new password"
                          aria-label={`Set a new password for ${u.email}`}
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u)}
                          disabled={deletingEmail === u.email}
                          className={dangerIconButton}
                          title="Remove account"
                          aria-label={`Remove ${u.email}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <AdminModal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title={viewing ? viewing.name || viewing.email.split("@")[0] : ""}
        subtitle={viewing?.email}
        width="max-w-lg"
        footer={
          viewing && (
            <>
              <button
                type="button"
                onClick={() => {
                  const u = viewing;
                  setViewing(null);
                  handleDeleteUser(u);
                }}
                className="mr-auto inline-flex items-center gap-1.5 h-10 px-3 rounded-lg text-sm text-text-muted hover:text-rust hover:bg-rust/10 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> Remove
              </button>
              <button
                type="button"
                onClick={() => {
                  const u = viewing;
                  setViewing(null);
                  setResetFor(u);
                  setNewPassword("");
                }}
                className={secondaryButton}
              >
                <KeyRound className="w-4 h-4" /> Set a new password
              </button>
            </>
          )
        }
      >
        {viewing && (
          <dl className="rounded-xl border border-line divide-y divide-line">
            {([
              ["Name", viewing.name || <span className="text-text-muted">Not added</span>],
              [
                "Email",
                <a href={`mailto:${viewing.email}`} className="text-brass hover:underline">
                  {viewing.email}
                </a>,
              ],
              ["Signs in with", PROVIDERS[viewing.provider] || "Email"],
              ["Joined", fullDate(viewing.createdAt)],
              ["Last active", formatLoginTime(viewing.lastLoginAt)],
              ["Account ID", <span className="text-text-muted text-xs">{viewing.id || "—"}</span>],
            ] as [string, React.ReactNode][]).map(([k, v]) => (
              <div key={k} className="px-4 py-2.5 grid grid-cols-[130px_1fr] gap-4 text-sm">
                <dt className="text-text-muted">{k}</dt>
                <dd className="text-text min-w-0 break-words">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </AdminModal>

      <AdminModal
        open={Boolean(resetFor)}
        onClose={() => setResetFor(null)}
        title="Set a new password"
        subtitle={resetFor?.email}
        width="max-w-md"
        footer={
          <>
            <button type="button" onClick={() => setResetFor(null)} className={secondaryButton}>
              Cancel
            </button>
            <button type="submit" form="reset-form" disabled={resetting || newPassword.length < 8} className={primaryButton}>
              {resetting ? "Saving…" : "Set password"}
            </button>
          </>
        }
      >
        <form id="reset-form" onSubmit={submitReset} className="space-y-3">
          <div>
            <label className={labelClass} htmlFor="admin-new-password">
              New password
            </label>
            <input
              id="admin-new-password"
              type="text"
              autoComplete="off"
              autoFocus
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
              placeholder="At least 8 characters"
            />
          </div>
          <p className="text-sm text-text-muted">
            Share the new password with them privately and ask them to change it after they sign in.
          </p>
        </form>
      </AdminModal>
    </>
  );
}
