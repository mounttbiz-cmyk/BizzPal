import { checkGstin } from "./gstin";

/**
 * GST registry lookup.
 *
 * The GST registry is only reachable through a licensed data provider (the government has no
 * open public API). Configure one in .env.local:
 *
 *   GST_API_KEY=<bearer token from your provider>
 *   GST_API_PROVIDER=surepass            (default)
 *   GST_API_BASE_URL=<override>          (optional)
 *
 * Without a key this returns { status: "unavailable" }. It NEVER invents a result: callers must
 * treat "unavailable" as "not verified".
 */

export interface RegistryRecord {
  gstin: string;
  legalName: string;
  tradeName: string;
  status: string; // e.g. "Active", "Cancelled", "Suspended"
  constitution: string; // e.g. "Private Limited Company"
  taxpayerType: string;
  registrationDate: string;
  address: string;
  state: string;
}

export type RegistryResult =
  | { status: "verified"; record: RegistryRecord; provider: string }
  | { status: "not_found"; provider: string }
  | { status: "unavailable"; reason: string };

export function registryConfigured(): boolean {
  return Boolean(process.env.GST_API_KEY);
}

function pick(obj: any, keys: string[]): string {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function flattenAddress(a: any): string {
  if (!a) return "";
  if (typeof a === "string") return a.trim();
  if (typeof a === "object") {
    return Object.values(a)
      .filter((x) => typeof x === "string" && x.trim())
      .map((x) => (x as string).trim())
      .join(", ");
  }
  return "";
}

/** Provider response -> our record. Tolerant of the field-name variants providers use. */
export function mapSurepassGstin(gstin: string, data: any): RegistryRecord {
  return {
    gstin,
    legalName: pick(data, ["legal_name", "lgnm", "legal_name_of_business"]),
    tradeName: pick(data, ["business_name", "trade_name", "tradeNam", "trade_name_of_business"]),
    status: pick(data, ["gstin_status", "status", "sts"]),
    constitution: pick(data, ["constitution_of_business", "constitution", "ctb"]),
    taxpayerType: pick(data, ["taxpayer_type", "dty"]),
    registrationDate: pick(data, ["date_of_registration", "rgdt"]),
    address: flattenAddress(data?.address) || flattenAddress(data?.principal_address) || pick(data, ["address_details", "adr"]),
    state: pick(data, ["state_jurisdiction", "state"]),
  };
}

export async function lookupGstin(rawGstin: string): Promise<RegistryResult> {
  const check = checkGstin(rawGstin);
  if (!check.valid) return { status: "unavailable", reason: check.reason };

  const key = process.env.GST_API_KEY;
  if (!key) {
    return { status: "unavailable", reason: "GST registry provider is not configured on this server (GST_API_KEY)." };
  }

  const provider = (process.env.GST_API_PROVIDER || "surepass").toLowerCase();
  if (provider !== "surepass") {
    return { status: "unavailable", reason: `Unsupported GST_API_PROVIDER "${provider}".` };
  }

  const base = (process.env.GST_API_BASE_URL || "https://kyc-api.surepass.io").replace(/\/+$/, "");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(`${base}/api/v1/corporate/gstin`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ id_number: check.gstin }),
      signal: controller.signal,
    });
    const body: any = await res.json().catch(() => ({}));

    if (res.status === 401 || res.status === 403) {
      return { status: "unavailable", reason: "The GST provider rejected our credentials (check GST_API_KEY)." };
    }
    if (res.status === 429) {
      return { status: "unavailable", reason: "The GST provider is rate-limiting us. Try again shortly." };
    }
    if (res.status === 404 || res.status === 422) {
      return { status: "not_found", provider };
    }
    if (!res.ok || body?.success === false) {
      return { status: "unavailable", reason: body?.message || `GST provider returned HTTP ${res.status}.` };
    }

    const record = mapSurepassGstin(check.gstin, body?.data);
    if (!record.legalName && !record.tradeName) {
      return { status: "not_found", provider };
    }
    return { status: "verified", record, provider };
  } catch (e: any) {
    return {
      status: "unavailable",
      reason: e?.name === "AbortError" ? "The GST provider took too long to respond." : "Could not reach the GST provider.",
    };
  } finally {
    clearTimeout(timer);
  }
}
