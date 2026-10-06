"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  ArrowRight,
  Lock,
  KeyRound,
  Building2,
  ExternalLink,
  Check,
  Copy,
  AlertTriangle,
  X,
  Mail,
  User,
  Zap,
  TrendingUp,
  Cpu,
  RefreshCw,
  HelpCircle,
} from "lucide-react";
import { ThemeSwitch } from "@/components/shell/ThemeSwitch";
import { useAuth } from "@/lib/firebase/authContext";
import { auth, isFirebaseConfigured, firebaseConfig } from "@/lib/firebase/config";
import { saveUserProfileToFirestore, getUserProfileFromFirestore } from "@/lib/firebase/firestore";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";

interface AuthErrorInfo {
  title?: string;
  message: string;
  code?: string;
  type: "redirect" | "config" | "credentials" | "domain" | "general";
  redirectUri?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, logout } = useAuth();
  const [authMode, setAuthMode] = useState<"register" | "signin">("register");
  const [isSuperadminMode, setIsSuperadminMode] = useState(false);
  const [showFirebaseModal, setShowFirebaseModal] = useState(false);
  const [showRedirectGuide, setShowRedirectGuide] = useState(false);

  // Close modals on Escape
  useEscapeKey(() => {
    setShowFirebaseModal(false);
    setShowRedirectGuide(false);
  }, showFirebaseModal || showRedirectGuide);

  const [copiedEnv, setCopiedEnv] = useState(false);
  const [copiedUri, setCopiedUri] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminPasscode, setAdminPasscode] = useState("");
  const [errorInfo, setErrorInfo] = useState<AuthErrorInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const activeRedirectUri = `/api/integrations/google/callback`;

  // Check URL query for auth mode and email flag
  React.useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("signin") === "true" || params.get("login") === "true") {
        setAuthMode("signin");
      } else if (params.get("signup") === "true") {
        setAuthMode("register");
      }
      const qEmail = params.get("email");
      if (qEmail) {
        setEmail(qEmail);
        setAuthMode("register");
      }
    } catch (e) {
      // ignore
    }
  }, []);

  /**
   * Parse any error into a rich, helpful, human-readable AuthErrorInfo
   */
  const parseAuthError = (err: any): AuthErrorInfo => {
    const code = err?.code || "";
    const rawMsg = err?.message || "";

    // 1. Google OAuth 400 redirect_uri_mismatch detection
    if (
      code === "auth/invalid-oauth-provider-response" ||
      rawMsg.includes("redirect_uri_mismatch") ||
      rawMsg.includes("Error 400") ||
      rawMsg.includes("redirect_uri")
    ) {
      return {
        title: "Google OAuth Setup Required (Error 400: redirect_uri_mismatch)",
        message: `Your Google Cloud Web Client ID requires "${activeRedirectUri}" added to its Authorized redirect URIs.`,
        code: "redirect_uri_mismatch",
        type: "redirect",
        redirectUri: activeRedirectUri,
      };
    }

    // 2. Google popup closed (often happens when user sees Error 400 in the Google popup)
    if (code === "auth/popup-closed-by-user") {
      return {
        title: "Google Sign-In Cancelled or Blocked",
        message: `The Google sign-in window was closed. If Google displayed "Error 400: redirect_uri_mismatch", please add the authorized redirect URI in Google Cloud Console, or use Work Email & Password below.`,
        code,
        type: "redirect",
        redirectUri: activeRedirectUri,
      };
    }

    if (code === "auth/popup-blocked") {
      return {
        title: "Popup Blocked",
        message: "The Google Sign-In popup was blocked by your browser. Please allow popups for this site, or sign in using Work Email & Password below.",
        code,
        type: "general",
      };
    }

    // 3. Provider not allowed
    if (code === "auth/operation-not-allowed") {
      return {
        title: "Sign-In Method Not Enabled",
        message: "This sign-in method is not enabled in your Firebase Console. Please go to Firebase Console → Authentication → Sign-in method and enable 'Email/Password' and 'Google'. Alternatively, click 'Instant Demo Mode' to access immediately.",
        code,
        type: "config",
      };
    }

    // 4. Domain not authorized
    if (code === "auth/unauthorized-domain") {
      return {
        title: "Domain Authorization Required",
        message: "Your current domain is not yet authorized in Firebase. In Firebase Console → Authentication → Settings → Authorized domains, click 'Add domain' and add your current host.",
        code,
        type: "domain",
      };
    }

    // 5. Email already in use
    if (code === "auth/email-already-in-use") {
      return {
        title: "Account Already Exists",
        message: "An account with this email address already exists. Please switch to 'Log In' to access your business dashboard.",
        code,
        type: "credentials",
      };
    }

    // 6. Invalid credentials / wrong password
    if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
      return {
        title: "Invalid Credentials",
        message: "Incorrect email or password. If you have not created an account yet, switch to 'Create Account'.",
        code,
        type: "credentials",
      };
    }

    // 7. User not found
    if (code === "auth/user-not-found") {
      return {
        title: "Account Not Found",
        message: "No registered account found with this email. Please switch to 'Create Account' to register your business.",
        code,
        type: "credentials",
      };
    }

    // 8. Weak password
    if (code === "auth/weak-password") {
      return {
        title: "Weak Password",
        message: "Password must be at least 6 characters long.",
        code,
        type: "credentials",
      };
    }

    // 9. Network error
    if (code === "auth/network-request-failed") {
      return {
        title: "Network Connection Error",
        message: "Unable to reach Firebase servers. Please verify your internet connection or use Instant Demo Mode.",
        code,
        type: "general",
      };
    }

    // 10. Extract any embedded (auth/code)
    const authMatch = rawMsg.match(/\(auth\/([a-z0-9-]+)\)/i);
    if (authMatch) {
      const parsed = authMatch[1];
      if (parsed === "operation-not-allowed") {
        return {
          title: "Provider Not Enabled",
          message: "Please enable Email/Password or Google in Firebase Console → Authentication → Sign-in method.",
          code: parsed,
          type: "config",
        };
      }
      if (parsed === "invalid-credential") {
        return {
          title: "Invalid Credentials",
          message: "Incorrect credentials. Please verify your email and password or create a new account.",
          code: parsed,
          type: "credentials",
        };
      }
      return {
        title: "Authentication Error",
        message: `Firebase returned (${parsed}). You can explore the platform right now using Instant Demo Mode.`,
        code: parsed,
        type: "general",
      };
    }

    // 11. Clean message without reducing to bare "Error"
    const cleaned = rawMsg
      .replace(/^Firebase:\s*/i, "")
      .replace(/^Error:\s*/i, "")
      .replace(/FirebaseError:\s*/i, "")
      .trim();

    if (cleaned && cleaned.toLowerCase() !== "error") {
      return {
        title: "Authentication Notice",
        message: cleaned,
        code,
        type: "general",
      };
    }

    return {
      title: "Authentication Notice",
      message: "Unable to complete authentication with the cloud service. You can immediately access the AI Business OS with Instant Demo Mode.",
      code,
      type: "general",
    };
  };

  /**
   * Helper: Restore business details and navigate directly to dashboard
   */
  const restoreAndNavigateOldUser = async (userEmail: string, displayName?: string, uid?: string) => {
    const cleanEmail = (userEmail || "").trim().toLowerCase();
    let businessProfile: any = null;

    if (cleanEmail) {
      try {
        const localUserBiz = localStorage.getItem(`bizzpal_user_business_${cleanEmail}`);
        if (localUserBiz) businessProfile = JSON.parse(localUserBiz);
      } catch (e) { }
    }

    if (!businessProfile) {
      try {
        const existingStr = localStorage.getItem("bizzpal_business_profile");
        if (existingStr) businessProfile = JSON.parse(existingStr);
      } catch (e) { }
    }

    if (!businessProfile) {
      const fallbackName = displayName || fullName || "Founder";
      businessProfile = {
        name: `${fallbackName}'s Enterprise`,
        founderName: fallbackName,
        industry: "it_tech",
        industryLabel: "IT & Technology Services",
        revenue: 0,
        monthlyRevenue: 0,
        annualRevenue: 0,
        burn: 0,
        monthlyBurn: 0,
        cash: 0,
        cashOnHand: 0,
        teamSize: 1,
        completedAt: new Date().toISOString(),
      };
    }

    const userSession = {
      id: uid || `usr_${Date.now()}`,
      email: cleanEmail || "user@bizzpal.in",
      name: displayName || fullName || "Founder",
      role: "owner",
      provider: "email",
      authenticatedAt: new Date().toISOString(),
    };
    localStorage.setItem("bizzpal_user_session", JSON.stringify(userSession));
    localStorage.setItem("bizzpal_business_profile", JSON.stringify(businessProfile));
    if (cleanEmail) {
      localStorage.setItem(`bizzpal_user_business_${cleanEmail}`, JSON.stringify(businessProfile));
    }

    router.push("/dashboard");

    // Background sync
    (async () => {
      try {
        const res = await fetch(`/api/auth/account-status?email=${encodeURIComponent(cleanEmail)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.businessProfile && (data.businessProfile.name || data.businessProfile.revenue !== undefined)) {
            localStorage.setItem("bizzpal_business_profile", JSON.stringify(data.businessProfile));
            localStorage.setItem(`bizzpal_user_business_${cleanEmail}`, JSON.stringify(data.businessProfile));
          }
        }
      } catch (e) { }

      if (uid && isFirebaseConfigured) {
        try {
          const firestoreData = await getUserProfileFromFirestore(uid);
          if (firestoreData?.businessProfile) {
            localStorage.setItem("bizzpal_business_profile", JSON.stringify(firestoreData.businessProfile));
            localStorage.setItem(`bizzpal_user_business_${cleanEmail}`, JSON.stringify(firestoreData.businessProfile));
          }
        } catch (e) { }
      }
    })().catch(() => { });
  };

  /**
   * Business Login / Registration handler
   */
  const handleBusinessAuth = async (e?: React.FormEvent, provider: "google" | "email" = "email") => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorInfo(null);

    if (isFirebaseConfigured) {
      try {
        if (provider === "google") {
          // Direct Google OAuth flow using real Google Client ID (never routes through nuralix-firebase)
          const width = 540;
          const height = 680;
          const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
          const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);

          const popup = window.open(
            `/api/integrations/google/connect?returnTo=${encodeURIComponent("/login")}&source=auth`,
            "BizzPalGoogleAuth",
            `width=${width},height=${height},left=${left},top=${top},status=0,toolbar=0,menubar=0`
          );

          const handleGoogleMessage = async (event: MessageEvent) => {
            if (event.data?.type === "BIZZPAL_GOOGLE_AUTH_SUCCESS") {
              window.removeEventListener("message", handleGoogleMessage);
              const data = event.data.data;
              const userEmail = (data.email || "").trim().toLowerCase();
              const userName = data.name || fullName || "Founder";
              const uid = `usr_google_${Date.now()}`;

              const userSession = {
                id: uid,
                email: userEmail,
                name: userName,
                role: "owner",
                provider: "google.com",
                picture: data.picture || null,
                authenticatedAt: new Date().toISOString(),
              };
              localStorage.setItem("bizzpal_user_session", JSON.stringify(userSession));

              if (authMode === "register") {
                localStorage.removeItem("bizzpal_business_profile");
                localStorage.removeItem("bizzpal_onboarding_step");
                router.push("/onboarding?mode=new_signup");
              } else {
                await restoreAndNavigateOldUser(userEmail, userName, uid);
              }
            } else if (event.data?.type === "BIZZPAL_GOOGLE_AUTH_ERROR") {
              window.removeEventListener("message", handleGoogleMessage);
              setLoading(false);
              setErrorInfo({
                title: "Google Sign-In Cancelled",
                message: event.data.error || "Google authentication was cancelled.",
                type: "general",
              });
            }
          };

          window.addEventListener("message", handleGoogleMessage);

          const checkClosed = setInterval(() => {
            if (!popup || popup.closed) {
              clearInterval(checkClosed);
              setLoading(false);
            }
          }, 1200);

          return;
        }

        // Email & Password flow
        const cleanEmail = (email || "").trim().toLowerCase();
        if (authMode === "register") {
          if (!cleanEmail || !cleanEmail.includes("@")) {
            setErrorInfo({
              title: "Email Required",
              message: "Please enter a valid work email address.",
              type: "credentials",
            });
            setLoading(false);
            return;
          }
          if (!password || password.length < 6) {
            setErrorInfo({
              title: "Password Too Short",
              message: "Password must be at least 6 characters long.",
              type: "credentials",
            });
            setLoading(false);
            return;
          }

          let authUser: any = null;
          try {
            authUser = await signUpWithEmail(cleanEmail, password, fullName);
          } catch (signUpErr: any) {
            setLoading(false);
            const parsed = parseAuthError(signUpErr);
            setErrorInfo(parsed);
            return;
          }

          if (authUser) {
            localStorage.removeItem("bizzpal_business_profile");
            localStorage.removeItem("bizzpal_onboarding_step");

            const userSession = {
              id: authUser.uid,
              email: authUser.email || cleanEmail,
              name: authUser.displayName || fullName || "Founder",
              role: "owner",
              provider: "password",
              authenticatedAt: new Date().toISOString(),
            };
            localStorage.setItem("bizzpal_user_session", JSON.stringify(userSession));

            router.push("/onboarding?mode=new_signup");

            saveUserProfileToFirestore(authUser.uid, {
              email: cleanEmail,
              displayName: fullName || "Founder",
              role: "owner",
              createdAt: new Date().toISOString(),
            }).catch(() => { });
            return;
          }
        } else {
          // authMode === "signin"
          if (!cleanEmail || !cleanEmail.includes("@")) {
            setErrorInfo({
              title: "Email Required",
              message: "Please enter your registered work email address.",
              type: "credentials",
            });
            setLoading(false);
            return;
          }
          if (!password) {
            setErrorInfo({
              title: "Password Required",
              message: "Please enter your password.",
              type: "credentials",
            });
            setLoading(false);
            return;
          }

          try {
            const authUser = await signInWithEmail(cleanEmail, password);
            if (authUser) {
              const userSession = {
                id: authUser.uid,
                email: authUser.email || cleanEmail,
                name: authUser.displayName || fullName || "Founder",
                role: "owner",
                provider: "password",
                authenticatedAt: new Date().toISOString(),
              };
              localStorage.setItem("bizzpal_user_session", JSON.stringify(userSession));

              await restoreAndNavigateOldUser(cleanEmail, authUser.displayName || fullName || "Founder", authUser.uid);
              return;
            }
          } catch (signInErr: any) {
            setLoading(false);
            const parsed = parseAuthError(signInErr);
            setErrorInfo(parsed);
            return;
          }
        }
      } catch (err: any) {
        setLoading(false);
        const parsed = parseAuthError(err);
        setErrorInfo(parsed);
        return;
      }
    } else {
      setLoading(false);
      setErrorInfo({
        message: "Authentication service is not configured. Please ensure your environment credentials are set.",
        type: "config"
      });
    }
  };

  // Developer Superadmin Login handler
  const handleSuperadminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorInfo(null);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: adminPasscode }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        const adminSession = {
          id: "adm_platform_developer",
          role: "platform_admin",
          mfaVerified: true,
          authenticatedAt: new Date().toISOString(),
        };
        localStorage.setItem("bizzpal_admin_session", JSON.stringify(adminSession));
        router.push("/admin");
      } else {
        setErrorInfo({
          title: "Developer Passcode Invalid",
          message: data.error || "Incorrect developer passcode.",
          type: "credentials",
        });
      }
    } catch {
      setErrorInfo({
        title: "Authentication Error",
        message: "Network error validating developer passcode.",
        type: "credentials",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text relative flex flex-col justify-between overflow-x-hidden transition-colors duration-300">
      {/* Ambient Lighting & Atmosphere */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Top-left warm amber aura */}
        <div className="absolute top-[-15%] left-[-10%] w-[650px] h-[650px] rounded-full bg-amber-500/10 dark:bg-amber-500/[0.08] blur-[140px]" />
        {/* Bottom-right cool indigo aura */}
        <div className="absolute bottom-[-15%] right-[-10%] w-[650px] h-[650px] rounded-full bg-indigo-500/10 dark:bg-indigo-500/[0.06] blur-[150px]" />
        {/* Architectural subtle micro-grid */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage: `radial-gradient(currentColor 1px, transparent 1px)`,
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      {/* Top Navigation Bar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
        {/* Brand & AI Business OS Badge */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-surface/90 border border-line-strong flex items-center justify-center p-2 shadow-lg backdrop-blur-xl group hover:border-amber-500/50 transition-all">
            <Image
              src="/logo.png"
              alt="BizzPal Logo"
              width={34}
              height={34}
              className="object-contain group-hover:scale-105 transition-transform"
              priority
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="font-black text-2xl tracking-tight text-text font-sans leading-none">
              Bizz
              <span className="font-black ml-0.5 bizzpal-brand-pal">
                Pal
              </span>
            </span>
          </div>
        </div>

        {/* Top Right Actions */}
        <div className="flex items-center gap-3">
          <div className="w-28 sm:w-36 shrink-0">
            <ThemeSwitch compact />
          </div>
        </div>
      </header>

      {/* Main Dual-Column Content */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: AI Business OS Value & Executive Telemetry */}
          <div className="hidden lg:flex lg:col-span-6 flex-col space-y-7 pr-4 lg:-translate-y-10">
            <div className="space-y-4">

              <h1 className="text-4xl xl:text-5xl font-extrabold text-text tracking-tight font-sans leading-[1.15]">
                The Autonomous <br />
                <span
                  style={{
                    background: "linear-gradient(135deg, #F7ECD1 0%, #DFBA73 50%, #A37C2C 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    color: "#DFBA73",
                  }}
                >
                  AI Business OS
                </span>{" "}
                for Founders.
              </h1>

              <p className="text-sm text-text-muted leading-relaxed max-w-lg">
                Calibrate a 24/7 AI C-Suite executive team — CEO, CFO, CMO, and CTO agents running on continuous
                financial telemetry, Monte Carlo decision simulations, and automated strategic workflows.
              </p>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <div className="p-3.5 rounded-2xl bg-surface/75 border border-line backdrop-blur-md space-y-1.5 hover:border-amber-500/30 transition-all">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <Zap className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-text">Autonomous C-Suite</h3>
                <p className="text-[11px] text-text-muted leading-relaxed">
                  10 specialized executive agents continuously monitor growth, runway, and risk.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-surface/75 border border-line backdrop-blur-md space-y-1.5 hover:border-amber-500/30 transition-all">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-text">Decision Simulator</h3>
                <p className="text-[11px] text-text-muted leading-relaxed">
                  Real-time scenario forecasting for hiring, pricing models, and capital runway.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-surface/75 border border-line backdrop-blur-md space-y-1.5 hover:border-amber-500/30 transition-all">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <Cpu className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-text">Executive Intelligence</h3>
                <p className="text-[11px] text-text-muted leading-relaxed">
                  Multimodal AI reasoning engine with deep contextual company memory and adaptive synthesis.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-surface/75 border border-line backdrop-blur-md space-y-1.5 hover:border-amber-500/30 transition-all">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-text">Strategic Execution</h3>
                <p className="text-[11px] text-text-muted leading-relaxed">
                  Turn C-Suite insights into automated operational workflows, delegations, and playbooks.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Luxury Glassmorphism Auth Card */}
          <div className="w-full max-w-md mx-auto lg:col-span-6">
            <div className="p-4 sm:p-8 rounded-2xl sm:rounded-3xl border border-line-strong/80 bg-surface/90 dark:bg-surface/80 backdrop-blur-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] space-y-5">
              {!isSuperadminMode ? (
                <>
                  {/* Top Segmented Tab Switcher */}
                  <div className="flex items-center p-1 rounded-2xl bg-surface-2 border border-line">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("register");
                        setErrorInfo(null);
                      }}
                      className={`flex-1 py-2 text-xs rounded-xl font-bold transition-all ${authMode === "register"
                        ? "bg-surface text-text shadow-sm border border-line"
                        : "text-text-muted hover:text-text"
                        }`}
                    >
                      Create Account
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("signin");
                        setErrorInfo(null);
                      }}
                      className={`flex-1 py-2 text-xs rounded-xl font-bold transition-all ${authMode === "signin"
                        ? "bg-surface text-text shadow-sm border border-line"
                        : "text-text-muted hover:text-text"
                        }`}
                    >
                      Log In
                    </button>
                  </div>

                  {/* Card Title & Subtitle */}
                  <div className="space-y-1.5 text-center sm:text-left">
                    <h2 className="text-xl font-bold text-text tracking-tight font-sans">
                      {authMode === "register" ? "Register Your Business" : "Access your AI Business OS"}
                    </h2>
                    <p className="text-xs text-text-muted leading-relaxed">
                      {authMode === "register"
                        ? "Create your founder profile to calibrate your autonomous AI executive team."
                        : "Sign in to review executive intelligence, simulated runway, and strategic playbooks."}
                    </p>
                  </div>

                  {/* Rich Error Alert Banner */}
                  {errorInfo && (
                    <div className="p-4 rounded-2xl bg-rust/10 border border-rust/30 text-rust space-y-3 animate-fade-in">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rust" />
                        <div className="flex-1 space-y-1 text-xs">
                          {errorInfo.title && <div className="font-bold text-rust">{errorInfo.title}</div>}
                          <div className="leading-relaxed opacity-95">{errorInfo.message}</div>
                        </div>
                      </div>

                      {/* Action buttons based on error type */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-rust/20 pl-6 text-xs">
                        {/* If Google redirect_uri_mismatch */}
                        {errorInfo.type === "redirect" && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(activeRedirectUri);
                                setCopiedUri(true);
                                setTimeout(() => setCopiedUri(false), 2000);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rust/20 hover:bg-rust/30 text-rust font-bold transition-colors"
                            >
                              {copiedUri ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>URI Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy Redirect URI</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => setShowRedirectGuide(true)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rust/20 hover:bg-rust/30 text-rust font-bold transition-colors"
                            >
                              <span>View Fix Steps</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </>
                        )}

                        {/* Account switchers */}
                        {errorInfo.message.includes("already exists") && (
                          <button
                            type="button"
                            onClick={() => {
                              setAuthMode("signin");
                              setErrorInfo(null);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brass text-white font-bold transition-all shadow hover:brightness-110"
                          >
                            <span>Switch to Log In →</span>
                          </button>
                        )}

                        {(errorInfo.message.includes("Account Not Found") ||
                          errorInfo.message.includes("create an account") ||
                          errorInfo.message.includes("switch to 'Create Account'")) && (
                            <button
                              type="button"
                              onClick={() => {
                                setAuthMode("register");
                                setErrorInfo(null);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brass text-white font-bold transition-all shadow hover:brightness-110"
                            >
                              <span>Switch to Create Account →</span>
                            </button>
                          )}
                      </div>
                    </div>
                  )}

                  {/* One-Click Google Auth */}
                  <button
                    id="btn-google-login"
                    type="button"
                    onClick={() => handleBusinessAuth(undefined, "google")}
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-xl border border-line bg-surface hover:bg-surface-2 text-text font-semibold text-xs transition-all shadow-sm flex items-center justify-center gap-3 hover:border-line-strong active:scale-[0.99]"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                    <span>{authMode === "register" ? "Sign up with Google" : "Log in with Google"}</span>
                  </button>

                  {/* Divider */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-line" />
                    <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">
                      or with work email
                    </span>
                    <div className="flex-1 h-px bg-line" />
                  </div>

                  {/* Email & Password Form */}
                  <form onSubmit={e => handleBusinessAuth(e, "email")} className="space-y-3.5">
                    {authMode === "register" && (
                      <div>
                        <label className="text-xs font-semibold text-text block mb-1">
                          Founder / Owner Name *
                        </label>
                        <div className="relative flex items-center">
                          <User className="w-3.5 h-3.5 text-text-muted absolute left-3.5" />
                          <input
                            type="text"
                            required
                            placeholder="e.g. Alex Morgan"
                            value={fullName}
                            onChange={e => setFullName(e.target.value)}
                            className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl border border-line bg-surface-2 text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-semibold text-text block mb-1">
                        Work Email Address *
                      </label>
                      <div className="relative flex items-center">
                        <Mail className="w-3.5 h-3.5 text-text-muted absolute left-3.5" />
                        <input
                          id="input-login-email"
                          type="email"
                          required
                          placeholder="e.g. founder@company.com"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl border border-line bg-surface-2 text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-text block mb-1">
                        Password *
                      </label>
                      <div className="relative flex items-center">
                        <Lock className="w-3.5 h-3.5 text-text-muted absolute left-3.5" />
                        <input
                          type="password"
                          required
                          placeholder="•••••••• (min 6 characters)"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl border border-line bg-surface-2 text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
                        />
                      </div>
                    </div>

                    {/* Primary Submit Button */}
                    <button
                      id="btn-login-email"
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 px-4 rounded-xl font-bold text-xs shadow-lg transition-all mt-2 active:scale-[0.99] flex items-center justify-center gap-2 btn-gold-gradient cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <span>
                            {authMode === "register"
                              ? "Create Account & Continue →"
                              : "Log In to Business OS →"}
                          </span>
                        </>
                      )}
                    </button>
                  </form>
                </>
              ) : (
                /* Developer Superadmin Mode */
                <form onSubmit={handleSuperadminLogin} className="space-y-4">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-500 text-[10px] font-bold uppercase tracking-wider">
                      <KeyRound className="w-3 h-3" />
                      <span>Platform Developer Control Plane</span>
                    </div>
                    <h2 className="text-base font-bold text-text">Developer Authorization</h2>
                    <p className="text-xs text-text-muted leading-relaxed">
                      Restricted to platform developers. Default developer passcode is: <code>bizzpal2026</code>
                    </p>
                  </div>

                  {errorInfo && (
                    <div className="p-3 rounded-xl bg-rust/10 border border-rust/30 text-rust text-xs font-medium">
                      {errorInfo.message}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text block">Developer Passcode</label>
                    <div className="relative flex items-center">
                      <Lock className="w-3.5 h-3.5 text-text-muted absolute left-3.5" />
                      <input
                        type="password"
                        placeholder="Enter developer passcode (bizzpal2026)"
                        value={adminPasscode}
                        onChange={e => setAdminPasscode(e.target.value)}
                        className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl border border-line bg-surface-2 text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-amber-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 rounded-xl bg-amber-500 text-black font-extrabold text-xs shadow-md hover:brightness-110 transition-all"
                    >
                      {loading ? "Authenticating..." : "Authorize as Developer →"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsSuperadminMode(false)}
                      className="w-full py-1.5 text-xs font-semibold text-text-muted hover:text-text text-center transition-colors"
                    >
                      Return to Business Auth
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Toggle to Developer Superadmin Portal */}
            {!isSuperadminMode && (
              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => setIsSuperadminMode(true)}
                  className="text-[11px] text-text-muted hover:text-amber-500 transition-colors inline-flex items-center gap-1.5 font-medium"
                >
                  <KeyRound className="w-3 h-3" />
                  <span>Platform Developer / Superadmin Portal</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </main>


      {/* Google OAuth redirect_uri_mismatch Help Modal */}
      {showRedirectGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="bg-surface border border-line rounded-3xl max-w-lg w-full shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text">Fix Google OAuth redirect_uri_mismatch</h3>
                  <p className="text-[11px] text-text-muted">Error 400 resolution in Google Cloud Console</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRedirectGuide(false)}
                className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-text-muted">
              <p className="leading-relaxed">
                Google blocks sign-in with <b>Error 400: redirect_uri_mismatch</b> when the Firebase OAuth handler is not
                listed under Authorized redirect URIs in Google Cloud Console.
              </p>

              <div className="p-3.5 rounded-xl bg-surface-2 border border-line space-y-2">
                <div className="font-semibold text-text flex items-center justify-between">
                  <span>Required Authorized Redirect URI:</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(activeRedirectUri);
                      setCopiedUri(true);
                      setTimeout(() => setCopiedUri(false), 2000);
                    }}
                    className="text-amber-500 font-bold text-[11px] hover:underline flex items-center gap-1"
                  >
                    {copiedUri ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedUri ? "Copied!" : "Copy URI"}</span>
                  </button>
                </div>
                <code className="block p-2 rounded-lg bg-black/50 text-amber-400 font-mono text-[11px] break-all select-all">
                  {activeRedirectUri}
                </code>
              </div>

              <div className="space-y-2 pt-1">
                <h4 className="font-bold text-text text-[11px] uppercase tracking-wider">Follow these 3 steps:</h4>
                <ol className="list-decimal pl-5 space-y-1.5 text-[11px] leading-relaxed">
                  <li>
                    Open{" "}
                    <a
                      href="https://console.cloud.google.com/apis/credentials"
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-500 font-semibold hover:underline inline-flex items-center gap-0.5"
                    >
                      Google Cloud Console Credentials <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </li>
                  <li>
                    Click your <b>OAuth 2.0 Client ID (Web client)</b>.
                  </li>
                  <li>
                    Scroll to <b>Authorized redirect URIs</b>, click <b>Add URI</b>, paste the URL above, and click <b>Save</b>.
                  </li>
                </ol>
              </div>
            </div>

            <div className="pt-3 border-t border-line flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowRedirectGuide(false)}
                className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-line text-text font-bold text-xs transition-all"
              >
                Done, Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
