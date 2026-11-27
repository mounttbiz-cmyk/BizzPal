import { db, getGroupBusinessId, getUserBusinessId } from "@/lib/db";
import { searchCompanyKnowledge } from "@/lib/knowledge/retrieval";
import { briefForAdvisors } from "@/lib/brief";

/**
 * Everything the AI advisors are told about the business, written as plain facts. All of it comes from this
 * account's own records on the server (never from what the browser sends), and anything not recorded is said to be
 * unknown rather than shown as zero, so the advisor asks instead of guessing.
 */

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const known = (v: any) => Number.isFinite(Number(v)) && Number(v) > 0;
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

function companyLines(b: any): string[] {
  const lines: string[] = [];
  lines.push(`Name: ${b.name || "not recorded"}`);
  if (b.industry_label || b.custom_industry || b.industry) lines.push(`Industry: ${b.industry_label || b.custom_industry || b.industry}`);
  if (b.website) lines.push(`Website: ${b.website}`);
  if (b.founder_name && b.founder_name !== "Founder") lines.push(`Founder / leader: ${b.founder_name}`);
  lines.push(`Team size: ${known(b.team_size) ? `${Number(b.team_size)} people` : "not recorded"}`);
  lines.push(`Monthly revenue: ${known(b.monthly_revenue) ? inr(b.monthly_revenue) : "not recorded"}`);
  lines.push(`Monthly spend (burn): ${known(b.monthly_burn) ? inr(b.monthly_burn) : "not recorded"}`);
  lines.push(`Cash in bank: ${known(b.cash_on_hand) ? inr(b.cash_on_hand) : "not recorded"}`);
  if (known(b.cash_on_hand) && known(b.monthly_burn)) {
    lines.push(`Cash runway: about ${(Number(b.cash_on_hand) / Number(b.monthly_burn)).toFixed(1)} months at the current spend`);
  }
  return lines;
}

function groupLines(email: string, activeId: string): string[] {
  const groupId = getGroupBusinessId(email);
  let companies: any[] = [];
  try {
    companies = db
      .prepare(
        `SELECT b.id, b.name, b.industry_label, b.monthly_revenue, b.parent_id, s.name AS segment
         FROM businesses b LEFT JOIN business_segments s ON s.id = b.segment_id
         WHERE b.group_id = ? ORDER BY s.sort_order, b.name LIMIT 60`
      )
      .all(groupId) as any[];
  } catch {
    return [];
  }
  if (companies.length === 0) return [];
  const group = db.prepare("SELECT name FROM businesses WHERE id = ?").get(groupId) as any;
  const byId = new Map(companies.map(c => [c.id, c]));
  const describe = (c: any) =>
    [
      c.name,
      c.segment ? `category ${c.segment}` : "",
      c.parent_id && byId.get(c.parent_id) ? `part of ${byId.get(c.parent_id).name}` : "",
      c.industry_label || "",
      known(c.monthly_revenue) ? `${inr(c.monthly_revenue)}/month revenue` : "",
    ]
      .filter(Boolean)
      .join(", ");

  if (activeId === groupId) {
    return [
      `This is the parent group of ${companies.length} companies. When a question is about "the group", consider all of them.`,
      ...companies.map(c => `- ${describe(c)}`),
    ];
  }
  const self = byId.get(activeId);
  const siblings = companies.filter(c => c.id !== activeId).slice(0, 25);
  return [
    `This company belongs to the group ${group?.name || "(unnamed)"}${self?.segment ? `, in its ${self.segment} category` : ""}.`,
    siblings.length ? `Other companies in the group: ${siblings.map(c => c.name).join(", ")}.` : "",
  ].filter(Boolean);
}

function taskLines(businessId: string): string[] {
  try {
    const rows = db
      .prepare(
        `SELECT title, priority, status, owner FROM tasks WHERE business_id = ? AND status != 'done'
         ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, created_at DESC LIMIT 10`
      )
      .all(businessId) as any[];
    return rows.map(t => `- ${clip(String(t.title), 140)} (${t.priority || "medium"} priority, ${t.status === "in_progress" ? "in progress" : "to do"}${t.owner ? `, owner ${t.owner}` : ""})`);
  } catch {
    return [];
  }
}

function factLines(businessId: string): string[] {
  try {
    const now = new Date().toISOString();
    const rows = db
      .prepare(
        `SELECT category, fact_key, fact_value, source_citation, version FROM business_facts
         WHERE business_id = ? AND is_active = 1
           AND (valid_to IS NULL OR valid_to > ?)
           AND (expires_at IS NULL OR expires_at > ?)
         ORDER BY confidence DESC, updated_at DESC LIMIT 25`
      )
      .all(businessId, now, now) as any[];
    return rows.map(f => `- ${f.category}: ${clip(String(f.fact_key), 80)} = ${clip(String(f.fact_value), 200)} (source: ${f.source_citation || "verified"}, v${Number(f.version || 1)})`);
  } catch {
    return [];
  }
}

function alertLines(businessId: string): string[] {
  try {
    const rows = db
      .prepare(
        `SELECT title, severity FROM business_insights WHERE business_id = ? AND status NOT IN ('resolved', 'dismissed')
         ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END, created_at DESC LIMIT 5`
      )
      .all(businessId) as any[];
    return rows.map(r => `- ${clip(String(r.title), 160)} (${r.severity})`);
  } catch {
    return [];
  }
}

async function documentLines(question: string, businessId: string): Promise<string[]> {
  try {
    const chunks = await searchCompanyKnowledge(question, businessId, { limit: 4, minSimilarity: 0.5 });
    return chunks.map(c => `- From "${c.documentTitle}"${c.sectionTitle ? ` (${c.sectionTitle})` : ""}: ${clip(c.content.replace(/\s+/g, " "), 600)}`);
  } catch {
    return [];
  }
}

/** The business facts for one question, as a block of text for the advisor's instructions. */
export async function buildBusinessContext(email: string, question: string): Promise<{ text: string; companyName: string; missingBrief: string[] }> {
  const businessId = getUserBusinessId(email);
  const b = (db.prepare("SELECT * FROM businesses WHERE id = ?").get(businessId) as any) || {};
  const docs = await documentLines(question, businessId);

  const brief = briefForAdvisors(businessId);
  const sections: Array<[string, string[]]> = [
    ["WHAT THE BUSINESS DOES (from the owner)", brief.lines.length ? brief.lines : ["The owner has not described the business yet."]],
    ["THE COMPANY", companyLines(b)],
    ["GROUP", groupLines(email, businessId)],
    ["OPEN TASKS", taskLines(businessId)],
    ["ALERTS FROM THEIR NUMBERS", alertLines(businessId)],
    ["SAVED FACTS ABOUT THE BUSINESS", factLines(businessId)],
    ["FROM THEIR DOCUMENTS (most relevant to this question)", docs],
  ];
  const text = sections
    .filter(([, lines]) => lines.length > 0)
    .map(([title, lines]) => `${title}\n${lines.join("\n")}`)
    .join("\n\n");
  return { text, companyName: b.name || "the business", missingBrief: brief.missing };
}
