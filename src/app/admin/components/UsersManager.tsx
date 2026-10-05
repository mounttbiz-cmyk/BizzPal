"use client";

import React, { useState } from "react";
import { Users, Search, Trash2, ShieldCheck, Mail, Key, Calendar, RotateCcw } from "lucide-react";

interface UserItem {
  id: string;
  email: string;
  name: string;
  provider: string;
  createdAt: string;
}

interface UsersManagerProps {
  users: UserItem[];
  onRefresh: () => Promise<void>;
  notify: (msg: string) => void;
}

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
      {/* Search & Stats Bar */}
      <div className="p-4 rounded-2xl bg-surface border border-line flex flex-col sm:flex-row items-center justify-between gap-3 shadow-theme">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-text">User Accounts Ledger</h2>
            <p className="text-xs text-text-muted">
              {users.length} registered authentication identity records in SQLite
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by email, name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-surface-2 border border-line text-text placeholder:text-text-muted focus:outline-none focus:border-gold"
            />
          </div>
          <button
            type="button"
            onClick={() => onRefresh()}
            className="p-2 rounded-xl border border-line hover:bg-surface-2 text-text-muted hover:text-text cursor-pointer transition-colors"
            title="Refresh users"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-surface rounded-2xl border border-line divide-y divide-line overflow-hidden shadow-theme">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-text-muted">
            No registered users found matching "{search}".
          </div>
        ) : (
          filtered.map((u) => (
            <div
              key={u.id || u.email}
              className="p-4 flex items-center justify-between gap-4 hover:bg-surface-2/40 transition-colors"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-bold text-xs text-text break-all">{u.email}</span>
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-full font-mono uppercase font-bold border ${
                      u.provider === "google"
                        ? "bg-gold/10 border-gold/30 text-gold"
                        : "bg-jade/10 border-jade/30 text-jade"
                    }`}
                  >
                    {u.provider || "email"}
                  </span>
                  {u.name && (
                    <span className="text-xs text-text-muted font-medium">({u.name})</span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-[11px] text-text-muted font-mono flex-wrap">
                  <span className="break-all">ID: {u.id}</span>
                  {u.createdAt && (
                    <>
                      <span>•</span>
                      <span>Registered: {new Date(u.createdAt).toLocaleDateString()}</span>
                    </>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDeleteUser(u)}
                disabled={deletingEmail === u.email}
                className="p-2 rounded-xl border border-line hover:bg-rose-500/10 text-text-muted hover:text-rose-500 cursor-pointer transition-colors shrink-0"
                title="Delete user account"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
