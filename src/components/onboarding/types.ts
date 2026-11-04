import type { RegistryRecord } from "@/lib/verification/registry";

export type { RegistryRecord };

export type GstState =
  | { phase: "idle" }
  | { phase: "checking" }
  | { phase: "verified"; gstin: string; record: RegistryRecord }
  /** Number is well-formed but the registry could not confirm it. NOT verified. */
  | { phase: "unavailable"; gstin: string; reason: string; registryConfigured: boolean }
  | { phase: "error"; message: string };

export interface DomainInstructions {
  dns: { type: string; host: string; value: string };
  file: { url: string; content: string };
  meta: { tag: string };
}

export type DomainState =
  | { phase: "idle" }
  | { phase: "working" }
  | { phase: "challenge"; domain: string; token: string; instructions: DomainInstructions; emailMatches: boolean; tried?: string[]; checking?: boolean }
  | { phase: "verified"; domain: string; method: string; emailMatches: boolean }
  | { phase: "skipped" }
  | { phase: "error"; message: string };

export interface IfscInfo { ifsc: string; bank: string; branch: string; city: string; state: string; address?: string }

export type IfscLookup =
  | { phase: "idle" }
  | { phase: "looking" }
  | { phase: "found"; info: IfscInfo }
  | { phase: "bad"; message: string };

export type BankState =
  | { phase: "idle" }
  | { phase: "checking" }
  | { phase: "verified"; bank: IfscInfo; last4: string; holderName: string }
  /** Bank + branch are real, but the account holder could not be checked. NOT verified. */
  | { phase: "unavailable"; bank: IfscInfo; last4: string; reason: string }
  /** The bank answered but the name did not match / account not found. */
  | { phase: "rejected"; message: string; holderName?: string }
  | { phase: "error"; message: string }
  | { phase: "skipped" };

export interface PaySnapshot {
  provider: "razorpay" | "stripe";
  windowDays: number;
  grossInr: number;
  refundsInr: number;
  revenueInr: number;
  paymentCount: number;
  otherCurrencyCount: number;
  truncated: boolean;
  syncedAt: string;
}
export interface PaySource { provider: "razorpay" | "stripe"; status: string; label: string; snapshot: PaySnapshot | null; connectedAt: string; syncedAt: string | null }
export interface PayTotal { revenueInr: number; sources: string[]; asOf: string }

export interface InviteRow {
  id: string; email: string; name: string; role: string; status: "invited" | "verified";
  link: string; sameDomain: boolean | null; createdAt: string; verifiedAt: string | null;
}

export type StepId = "business" | "website" | "bank" | "payments" | "team" | "sources" | "industry" | "priorities";
export interface StepDef { id: StepId; label: string; hint: string; phase: "Verify" | "Connect" | "Tailor" }

export const STEPS: StepDef[] = [
  { id: "business", label: "Verify business", hint: "GSTIN check", phase: "Verify" },
  { id: "website", label: "Verify website", hint: "Prove ownership", phase: "Verify" },
  { id: "bank", label: "Bank account", hint: "Name must match", phase: "Verify" },
  { id: "payments", label: "Payments", hint: "Real revenue", phase: "Connect" },
  { id: "team", label: "Your team", hint: "Confirmed by Google", phase: "Connect" },
  { id: "sources", label: "Other tools", hint: "Google & more", phase: "Connect" },
  { id: "industry", label: "Industry", hint: "What you do", phase: "Tailor" },
  { id: "priorities", label: "Priorities", hint: "Where to focus", phase: "Tailor" },
];

export const inr = (n: number) => "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
