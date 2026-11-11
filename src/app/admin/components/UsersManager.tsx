"use client";

import React, { useState } from "react";
import { Users, Search, Trash2, ShieldCheck, Mail, Key, Calendar, RotateCcw, Clock } from "lucide-react";

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

const formatDateTime = (dateStr?: string | null) => {
  if (!dateStr) return "Never";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return dateStr;
  }
};

export function UsersManager({ users, onRefresh, notify }: UsersManagerProps) {
  const [search, setSearch] = useState("");
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null);

  const handleDeleteUser = async (u: UserItem) => {
    if (!window.confirm(`Permanently remove user account "${u.email}" from platform authentication ledger?`)) {
      return;
    }

    try {
      setDeletingEmail(u.email);
      const res = await fetch(`/api/admin/tenants?userEmail=${encodeURIComponent(u.email)}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 80)}`);
      }
      const data = await res.json();
      if (data.success) {
        notify(data.message || `User account "${u.email}" removed.`);
        await onRefresh();
      } else {
        notify(`Error: ${data.error}`);
      }
    } catch (err: any) {
      notify(`Failed to delete user: ${err.message}`);
    } finally {
      setDeletingEmail(null);
    }
  };

  const filtered = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.name && u.name.toLowerCase().includes(search.toLowerCase())) ||
      (u.provider && u.provider.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-2xl bg-surface border border-line shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-auto">
          <h2 className="text-base font-semibold text-text">User accounts</h2>
          <p className="text-sm text-text-muted">
            {users.length} registered {users.length === 1 ? "account" : "accounts"}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by email or name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl bg-surface border border-line text-text placeholder:text-text-muted focus:outline-none focus:border-brass"
            />
          </div>
          <button
            type="button"
            onClick={() => onRefresh()}
            className="p-2.5 rounded-xl border border-line hover:bg-surface-2 text-text-muted hover:text-text cursor-pointer"
            title="Refresh"
            aria-label="Refresh"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-line divide-y divide-line overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-text-muted">No accounts match &ldquo;{search}&rdquo;.</div>
        ) : (
          filtered.map((u) => (
            <div key={u.id || u.email} className="px-5 py-4 flex items-center justify-between gap-4">
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-semibold text-text break-all">
                  {u.email}
                  {u.name && <span className="font-normal text-text-muted"> · {u.name}</span>}
                </p>
                <p className="text-xs text-text-muted">
                  Signs in with {u.provider === "google" ? "Google" : u.provider === "password" ? "password" : "email"}
                  {" · "}Last login {formatDateTime(u.lastLoginAt || u.createdAt)}
                  {u.createdAt ? ` · Joined ${formatDateTime(u.createdAt)}` : ""}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleDeleteUser(u)}
                disabled={deletingEmail === u.email}
                className="p-2.5 rounded-xl border border-line hover:bg-rust/10 text-text-muted hover:text-rust cursor-pointer shrink-0 disabled:opacity-50"
                title="Delete account"
                aria-label="Delete account"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
