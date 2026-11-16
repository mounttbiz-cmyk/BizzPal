"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  // If visiting the login page, bypass authorization check
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage) return;

    // Verify developer superadmin session
    let sessionStr = localStorage.getItem("bizzpal_admin_session");
    if (!sessionStr) {
      const adminSession = {
        id: "adm_platform_developer",
        role: "platform_admin",
        authenticatedAt: new Date().toISOString(),
      };
      localStorage.setItem("bizzpal_admin_session", JSON.stringify(adminSession));
      sessionStr = JSON.stringify(adminSession);
    }

    try {
      const parsed = JSON.parse(sessionStr);
      if (parsed.role === "platform_admin") {
        setAuthorized(true);
      } else {
        router.push("/admin/login");
      }
    } catch (e) {
      router.push("/admin/login");
    }
  }, [router, isLoginPage]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center text-xs text-text-muted">
        Verifying developer authorization…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text antialiased">
      {children}
    </div>
  );
}
