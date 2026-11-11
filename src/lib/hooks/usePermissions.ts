"use client";

import { useEffect, useState, useCallback } from "react";
import { DEFAULT_MATRIX, Matrix, Role, canAccessPath, roleFromSession, sanitizeMatrix } from "@/lib/permissions";

const CACHE_KEY = "bizzpal_team_permissions";

/** The signed-in person's role and the team's access matrix (saved on the server). */
export function usePermissions() {
  const [matrix, setMatrix] = useState<Matrix>(DEFAULT_MATRIX);
  const [role, setRole] = useState<Role>("Owner");

  const load = useCallback(() => {
    try {
      const sess = localStorage.getItem("bizzpal_user_session");
      if (sess) setRole(roleFromSession(JSON.parse(sess)?.role));
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) setMatrix(sanitizeMatrix(JSON.parse(cached)));
    } catch {}
    fetch("/api/team/permissions", { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        if (d?.success && d.matrix) {
          const clean = sanitizeMatrix(d.matrix);
          setMatrix(clean);
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(clean));
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    window.addEventListener("bizzpal_permissions_updated", load);
    return () => window.removeEventListener("bizzpal_permissions_updated", load);
  }, [load]);

  return {
    role,
    matrix,
    canAccess: (pathname: string) => canAccessPath(matrix, role, pathname),
  };
}
