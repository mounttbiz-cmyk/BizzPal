/**
 * Real Google Cloud spend, read from the Cloud Billing export in BigQuery.
 *
 * Google does not expose "credits left" or live spend through a simple API; the
 * supported way is to export billing data to BigQuery and query it. That export
 * includes the cost of every service and any credits applied against it.
 *
 * Required server settings:
 *   GCP_BILLING_EXPORT_TABLE   e.g. my-project.billing_export.gcp_billing_export_v1_XXXXXX_XXXXXX_XXXXXX
 *   GCP_BILLING_SERVICE_ACCOUNT  service account JSON (raw or base64) with BigQuery Data Viewer
 *                                on the dataset and BigQuery Job User on the project
 * Optional:
 *   GCP_CREDITS_TOTAL          total promotional credit you were granted, in the billing currency,
 *                              so "credits left" can be worked out
 */
import { GoogleAuth } from "google-auth-library";

export interface BillingLine {
  service: string;
  cost: number;
  credits: number; // negative numbers: credits applied
  net: number;
}

export interface BillingResult {
  configured: boolean;
  error?: string;
  currency?: string;
  monthStart?: string;
  month?: { cost: number; credits: number; net: number };
  allTime?: { cost: number; credits: number; net: number };
  creditsTotal?: number | null;
  creditsLeft?: number | null;
  services?: BillingLine[];
  places?: { cost: number; credits: number; net: number } | null;
  dataThrough?: string | null;
}

function loadCredentials(): Record<string, any> | null {
  const raw = process.env.GCP_BILLING_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const text = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    const sa = JSON.parse(text);
    if (typeof sa.private_key === "string") sa.private_key = sa.private_key.replace(/\n/g, "\n");
    return sa;
  } catch {
    return null;
  }
}

async function runQuery(projectId: string, auth: GoogleAuth, query: string, params: any[] = []) {
  const client = await auth.getClient();
  const token = (await client.getAccessToken()).token;
  const res = await fetch(`https://bigquery.googleapis.com/bigquery/v2/projects/${encodeURIComponent(projectId)}/queries`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, useLegacySql: false, parameterMode: "NAMED", queryParameters: params, timeoutMs: 20000 }),
  });
  const json: any = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `BigQuery returned ${res.status}`);
  if (json.jobComplete === false) throw new Error("BigQuery is still running the query. Try again in a moment.");
  return (json.rows || []).map((r: any) => (r.f || []).map((c: any) => c.v));
}

export async function getGcpBilling(): Promise<BillingResult> {
  const table = (process.env.GCP_BILLING_EXPORT_TABLE || "").trim();
  const sa = loadCredentials();
  if (!table || !sa) return { configured: false };

  // The table must look like project.dataset.table: it goes into SQL, so keep it strict
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_]+\.[A-Za-z0-9_]+$/.test(table)) {
    return { configured: true, error: "GCP_BILLING_EXPORT_TABLE must look like project.dataset.table" };
  }

  try {
    const auth = new GoogleAuth({ credentials: sa, scopes: ["https://www.googleapis.com/auth/bigquery.readonly"] });
    const projectId = (sa.project_id as string) || table.split(".")[0];

    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const monthIso = monthStart.toISOString();

    const rows = await runQuery(
      projectId,
      auth,
      `SELECT service.description AS service,
              currency,
              SUM(cost) AS cost,
              SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)) AS credits,
              SUM(IF(usage_start_time >= @monthStart, cost, 0)) AS month_cost,
              SUM(IF(usage_start_time >= @monthStart, IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0), 0)) AS month_credits,
              MAX(usage_end_time) AS data_through
         FROM \`${table}\`
        GROUP BY service, currency
        ORDER BY cost DESC`,
      [{ name: "monthStart", parameterType: { type: "TIMESTAMP" }, parameterValue: { value: monthIso } }]
    );

    const num = (v: any) => Number(v) || 0;
    const services: BillingLine[] = [];
    const sum = { cost: 0, credits: 0, mCost: 0, mCredits: 0 };
    let currency = "USD";
    let through: string | null = null;
    let places = { cost: 0, credits: 0, mCost: 0, mCredits: 0, found: false };

    for (const r of rows) {
      const [service, cur, cost, credits, mCost, mCredits, dt] = r;
      currency = cur || currency;
      if (dt && (!through || Number(dt) > Number(through))) through = dt;
      sum.cost += num(cost);
      sum.credits += num(credits);
      sum.mCost += num(mCost);
      sum.mCredits += num(mCredits);
      services.push({ service, cost: num(mCost), credits: num(mCredits), net: num(mCost) + num(mCredits) });
      if (/places|maps/i.test(String(service))) {
        places.found = true;
        places.cost += num(mCost);
        places.credits += num(mCredits);
      }
    }

    const creditsTotal = process.env.GCP_CREDITS_TOTAL ? Number(process.env.GCP_CREDITS_TOTAL) : null;
    const creditsUsedAllTime = Math.abs(sum.credits);

    return {
      configured: true,
      currency,
      monthStart: monthIso,
      month: { cost: sum.mCost, credits: sum.mCredits, net: sum.mCost + sum.mCredits },
      allTime: { cost: sum.cost, credits: sum.credits, net: sum.cost + sum.credits },
      creditsTotal: creditsTotal && creditsTotal > 0 ? creditsTotal : null,
      creditsLeft: creditsTotal && creditsTotal > 0 ? Math.max(0, creditsTotal - creditsUsedAllTime) : null,
      services: services.filter(s => s.cost !== 0 || s.credits !== 0).slice(0, 8),
      places: places.found ? { cost: places.cost, credits: places.credits, net: places.cost + places.credits } : null,
      dataThrough: through ? new Date(Number(through) * 1000).toISOString() : null,
    };
  } catch (err: any) {
    return { configured: true, error: err?.message || "Could not read Google Cloud billing data" };
  }
}
