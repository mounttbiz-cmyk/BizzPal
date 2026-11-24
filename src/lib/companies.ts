import { randomBytes } from "crypto";
import { db, deleteBusinessData } from "@/lib/db";

/**
 * Groups of companies (for example a holding group with companies in several industries).
 *
 * - The account's own business is the group. Every company it adds is a full BizzPal business of its own
 *   (dashboard, tasks, documents, AI advisors...) whose `group_id` points to the group.
 * - Categories (segments) are created and named by the group. Nothing about them is built in.
 * - A company can sit under another company of the same group (`parent_id`). Companies under another company
 *   always share their parent's category, so the tree and the categories never disagree.
 *
 * Every function takes the group id from the signed-in person on the server and checks that each id it is given
 * belongs to that group.
 */

export const MAX_COMPANIES_PER_GROUP = 500;
export const MAX_SEGMENTS_PER_GROUP = 50;
export const MAX_DEPTH = 4; // levels of companies below the group

export interface CompanyInput {
  name?: string;
  segmentId?: string | null;
  parentId?: string | null;
  industry?: string;
  industryLabel?: string;
  website?: string;
  teamSize?: number | null;
  monthlyRevenue?: number | null;
  monthlyBurn?: number | null;
  cashOnHand?: number | null;
}

export interface Company {
  id: string;
  name: string;
  segmentId: string | null;
  parentId: string | null;
  industry: string;
  industryLabel: string;
  website: string;
  logoUrl: string | null;
  teamSize: number | null;
  monthlyRevenue: number | null;
  monthlyBurn: number | null;
  cashOnHand: number | null;
  openTasks: number;
  sortOrder: number;
  createdAt: string;
}

export interface Segment {
  id: string;
  name: string;
  sortOrder: number;
}

export interface GroupOverview {
  group: { id: string; name: string; industryLabel: string; logoUrl: string | null; website: string };
  segments: Segment[];
  companies: Company[];
}

export class CompanyError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const newId = (prefix: string) => `${prefix}_${randomBytes(12).toString("hex")}`;

const cleanText = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** A figure the person typed: a non-negative number, or null for "not given". */
function cleanFigure(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw new CompanyError("Figures must be positive numbers.");
  return Math.round(n * 100) / 100;
}

function cleanWebsite(v: unknown): string {
  const s = cleanText(v, 200);
  if (!s) return "";
  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withScheme);
    if (!u.hostname.includes(".")) throw new Error();
    return u.toString().replace(/\/$/, "");
  } catch {
    throw new CompanyError("Please enter a valid website, for example tata.com.");
  }
}

/** A figure stored as 0 by older forms means "not entered". */
const figure = (v: any): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

function companyRow(groupId: string, id: string): any {
  const row = db.prepare("SELECT * FROM businesses WHERE id = ? AND group_id = ?").get(id, groupId);
  if (!row) throw new CompanyError("That company is not part of your group.", 404);
  return row;
}

function segmentExists(groupId: string, segmentId: string): boolean {
  return Boolean(db.prepare("SELECT id FROM business_segments WHERE id = ? AND group_id = ?").get(segmentId, groupId));
}

/** Ids of a company and everything under it. */
function subtreeIds(groupId: string, rootId: string): string[] {
  const all = db.prepare("SELECT id, parent_id FROM businesses WHERE group_id = ?").all(groupId) as any[];
  const children = new Map<string, string[]>();
  for (const r of all) {
    if (!r.parent_id) continue;
    children.set(r.parent_id, [...(children.get(r.parent_id) || []), r.id]);
  }
  const out: string[] = [];
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    out.push(id);
    stack.push(...(children.get(id) || []));
  }
  return out;
}

/** How many levels below the group a company sits (a company directly in the group is 1). */
function depthOf(groupId: string, id: string | null): number {
  let depth = 0;
  let current = id;
  const seen = new Set<string>();
  while (current && !seen.has(current)) {
    seen.add(current);
    depth++;
    const row = db.prepare("SELECT parent_id FROM businesses WHERE id = ? AND group_id = ?").get(current, groupId) as any;
    current = row?.parent_id || null;
  }
  return depth;
}

/** How deep the tree goes under a company (0 when it has no companies under it). */
function heightOf(groupId: string, id: string): number {
  const kids = db.prepare("SELECT id FROM businesses WHERE group_id = ? AND parent_id = ?").all(groupId, id) as any[];
  return kids.length === 0 ? 0 : 1 + Math.max(...kids.map(k => heightOf(groupId, k.id)));
}

/** Checks a requested parent and returns the category the company must take from it (or null when it has none). */
function checkParent(groupId: string, parentId: string, movingId?: string): { segmentId: string | null } {
  const parent = companyRow(groupId, parentId);
  if (movingId && subtreeIds(groupId, movingId).includes(parentId)) {
    throw new CompanyError("A company cannot be placed under itself or under one of its own companies.");
  }
  const below = movingId ? heightOf(groupId, movingId) : 0;
  if (depthOf(groupId, parentId) + 1 + below > MAX_DEPTH) {
    throw new CompanyError(`Companies can be nested up to ${MAX_DEPTH} levels deep.`);
  }
  return { segmentId: parent.segment_id || null };
}

export function getGroupOverview(groupId: string): GroupOverview {
  const g = db.prepare("SELECT id, name, industry_label, logo_url, website FROM businesses WHERE id = ?").get(groupId) as any;
  const segments = (db
    .prepare("SELECT id, name, sort_order FROM business_segments WHERE group_id = ? ORDER BY sort_order, created_at")
    .all(groupId) as any[]).map(s => ({ id: s.id, name: s.name, sortOrder: Number(s.sort_order || 0) }));

  const rows = db
    .prepare("SELECT * FROM businesses WHERE group_id = ? ORDER BY sort_order, name COLLATE NOCASE")
    .all(groupId) as any[];

  const openTasks = new Map<string, number>();
  if (rows.length > 0) {
    try {
      const counts = db
        .prepare(
          `SELECT t.business_id AS id, COUNT(*) AS n FROM tasks t
           JOIN businesses b ON b.id = t.business_id
           WHERE b.group_id = ? AND t.status != 'done' GROUP BY t.business_id`
        )
        .all(groupId) as any[];
      for (const c of counts) openTasks.set(c.id, Number(c.n) || 0);
    } catch {}
  }

  return {
    group: {
      id: groupId,
      name: g?.name || "Your group",
      industryLabel: g?.industry_label || "",
      logoUrl: g?.logo_url || null,
      website: g?.website || "",
    },
    segments,
    companies: rows.map(r => ({
      id: r.id,
      name: r.name,
      segmentId: r.segment_id || null,
      parentId: r.parent_id || null,
      industry: r.industry || "",
      industryLabel: r.industry_label || "",
      website: r.website || "",
      logoUrl: r.logo_url || null,
      teamSize: figure(r.team_size),
      monthlyRevenue: figure(r.monthly_revenue),
      monthlyBurn: figure(r.monthly_burn),
      cashOnHand: figure(r.cash_on_hand),
      openTasks: openTasks.get(r.id) || 0,
      sortOrder: Number(r.sort_order || 0),
      createdAt: r.created_at || "",
    })),
  };
}

// ----------------------------------------------------------------- companies

export function createCompany(groupId: string, input: CompanyInput): string {
  const name = cleanText(input.name, 120);
  if (!name) throw new CompanyError("Please enter the company's name.");
  if (!db.prepare("SELECT id FROM businesses WHERE id = ?").get(groupId)) {
    throw new CompanyError("Finish setting up your own business first, then add companies to it.");
  }
  const count = (db.prepare("SELECT COUNT(*) AS n FROM businesses WHERE group_id = ?").get(groupId) as any)?.n || 0;
  if (count >= MAX_COMPANIES_PER_GROUP) throw new CompanyError(`A group can have up to ${MAX_COMPANIES_PER_GROUP} companies.`);
  const duplicate = db
    .prepare("SELECT id FROM businesses WHERE group_id = ? AND LOWER(name) = LOWER(?)")
    .get(groupId, name);
  if (duplicate) throw new CompanyError(`${name} is already in your group.`, 409);

  const parentId = input.parentId ? String(input.parentId) : null;
  let segmentId = input.segmentId ? String(input.segmentId) : null;
  if (parentId) segmentId = checkParent(groupId, parentId).segmentId;
  else if (segmentId && !segmentExists(groupId, segmentId)) throw new CompanyError("That category no longer exists.", 404);

  const id = newId("bizco");
  const now = new Date().toISOString();
  const inserted = db.prepare(
    `INSERT INTO businesses (
      id, name, founder_name, industry, industry_label, website, team_size,
      annual_revenue, monthly_revenue, monthly_burn, cash_on_hand, connected_tools,
      group_id, parent_id, segment_id, sort_order, created_at, updated_at
    ) VALUES (?, ?, '', ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    name,
    cleanText(input.industry, 40),
    cleanText(input.industryLabel, 80),
    cleanWebsite(input.website),
    cleanFigure(input.teamSize) ?? 0,
    (cleanFigure(input.monthlyRevenue) ?? 0) * 12,
    cleanFigure(input.monthlyRevenue) ?? 0,
    cleanFigure(input.monthlyBurn) ?? 0,
    cleanFigure(input.cashOnHand) ?? 0,
    groupId,
    parentId,
    segmentId,
    count,
    now,
    now
  );
  if (!inserted?.changes) throw new CompanyError("We could not save the company. Please try again.", 500);
  return id;
}

export function updateCompany(groupId: string, id: string, input: CompanyInput): void {
  const row = companyRow(groupId, id);
  const sets: string[] = [];
  const values: any[] = [];
  const set = (column: string, value: any) => {
    sets.push(`${column} = ?`);
    values.push(value);
  };

  if (input.name !== undefined) {
    const name = cleanText(input.name, 120);
    if (!name) throw new CompanyError("Please enter the company's name.");
    const duplicate = db
      .prepare("SELECT id FROM businesses WHERE group_id = ? AND LOWER(name) = LOWER(?) AND id != ?")
      .get(groupId, name, id);
    if (duplicate) throw new CompanyError(`${name} is already in your group.`, 409);
    set("name", name);
  }
  if (input.industry !== undefined) set("industry", cleanText(input.industry, 40));
  if (input.industryLabel !== undefined) set("industry_label", cleanText(input.industryLabel, 80));
  if (input.website !== undefined) set("website", cleanWebsite(input.website));
  if (input.teamSize !== undefined) set("team_size", cleanFigure(input.teamSize) ?? 0);
  if (input.monthlyRevenue !== undefined) {
    const m = cleanFigure(input.monthlyRevenue) ?? 0;
    set("monthly_revenue", m);
    set("annual_revenue", m * 12);
  }
  if (input.monthlyBurn !== undefined) set("monthly_burn", cleanFigure(input.monthlyBurn) ?? 0);
  if (input.cashOnHand !== undefined) set("cash_on_hand", cleanFigure(input.cashOnHand) ?? 0);

  // Placement: under another company (takes its category) or directly in the group (keeps or picks a category)
  let newSegment: string | null | undefined;
  if (input.parentId !== undefined) {
    const parentId = input.parentId ? String(input.parentId) : null;
    if (parentId) {
      newSegment = checkParent(groupId, parentId, id).segmentId;
    } else if (input.segmentId !== undefined) {
      newSegment = input.segmentId ? String(input.segmentId) : null;
    }
    set("parent_id", parentId);
  } else if (input.segmentId !== undefined) {
    if (row.parent_id) throw new CompanyError("This company takes its category from the company it sits under.");
    newSegment = input.segmentId ? String(input.segmentId) : null;
  }
  if (newSegment && !segmentExists(groupId, newSegment)) throw new CompanyError("That category no longer exists.", 404);

  if (sets.length === 0 && newSegment === undefined) return;
  const now = new Date().toISOString();
  if (sets.length > 0) {
    db.prepare(`UPDATE businesses SET ${sets.join(", ")}, updated_at = ? WHERE id = ? AND group_id = ?`).run(...values, now, id, groupId);
  }
  if (newSegment !== undefined) {
    // The company and everything under it move to the category together
    for (const cid of subtreeIds(groupId, id)) {
      db.prepare("UPDATE businesses SET segment_id = ?, updated_at = ? WHERE id = ? AND group_id = ?").run(newSegment, now, cid, groupId);
    }
  }
}

/** Removes a company, the companies under it, and everything saved for them. Returns how many were removed. */
export function deleteCompany(groupId: string, id: string): number {
  companyRow(groupId, id);
  const ids = subtreeIds(groupId, id);
  deleteBusinessData(ids);
  return ids.length;
}

// ---------------------------------------------------------------- categories

export function createSegment(groupId: string, rawName: unknown): string {
  const name = cleanText(rawName, 80);
  if (!name) throw new CompanyError("Please enter a name for the category.");
  const existing = db.prepare("SELECT COUNT(*) AS n FROM business_segments WHERE group_id = ?").get(groupId) as any;
  if ((existing?.n || 0) >= MAX_SEGMENTS_PER_GROUP) throw new CompanyError(`A group can have up to ${MAX_SEGMENTS_PER_GROUP} categories.`);
  if (db.prepare("SELECT id FROM business_segments WHERE group_id = ? AND LOWER(name) = LOWER(?)").get(groupId, name)) {
    throw new CompanyError(`You already have a category called ${name}.`, 409);
  }
  const id = newId("seg");
  const inserted = db.prepare("INSERT INTO business_segments (id, group_id, name, sort_order, created_at) VALUES (?, ?, ?, ?, ?)").run(
    id,
    groupId,
    name,
    existing?.n || 0,
    new Date().toISOString()
  );
  if (!inserted?.changes) throw new CompanyError("We could not save the category. Please try again.", 500);
  return id;
}

export function renameSegment(groupId: string, id: string, rawName: unknown): void {
  const name = cleanText(rawName, 80);
  if (!name) throw new CompanyError("Please enter a name for the category.");
  if (!segmentExists(groupId, id)) throw new CompanyError("That category no longer exists.", 404);
  if (db.prepare("SELECT id FROM business_segments WHERE group_id = ? AND LOWER(name) = LOWER(?) AND id != ?").get(groupId, name, id)) {
    throw new CompanyError(`You already have a category called ${name}.`, 409);
  }
  db.prepare("UPDATE business_segments SET name = ? WHERE id = ? AND group_id = ?").run(name, id, groupId);
}

/** Moves a category one place up or down in the list. */
export function moveSegment(groupId: string, id: string, direction: "up" | "down"): void {
  const list = db
    .prepare("SELECT id FROM business_segments WHERE group_id = ? ORDER BY sort_order, created_at")
    .all(groupId) as any[];
  const ids = list.map(s => s.id as string);
  const i = ids.indexOf(id);
  if (i === -1) throw new CompanyError("That category no longer exists.", 404);
  const j = direction === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  ids.forEach((sid, order) => db.prepare("UPDATE business_segments SET sort_order = ? WHERE id = ? AND group_id = ?").run(order, sid, groupId));
}

/** Deletes a category. Its companies stay in the group, without a category. */
export function deleteSegment(groupId: string, id: string): void {
  if (!segmentExists(groupId, id)) throw new CompanyError("That category no longer exists.", 404);
  db.prepare("UPDATE businesses SET segment_id = NULL WHERE group_id = ? AND segment_id = ?").run(groupId, id);
  db.prepare("DELETE FROM business_segments WHERE id = ? AND group_id = ?").run(id, groupId);
}
