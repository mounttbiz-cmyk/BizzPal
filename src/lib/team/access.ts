import { NextResponse } from "next/server";
import { getPlatformConfig, type TeamMembership } from "@/lib/db";
import { DEFAULT_MATRIX, sanitizeMatrix, type Level, type Role } from "@/lib/permissions";

/**
 * What a teammate may do through the APIs. The owner's permissions table (Team page) is applied here on the
 * server, so it holds even if someone calls the API directly instead of using the app.
 */

// First matching prefix wins.
const AREA_BY_PREFIX: Array<[string, string]> = [
  ["/api/analytics", "finance"],
  ["/api/bi", "finance"],
  ["/api/ai/chat", "advisors"],
  ["/api/knowledge", "compliance"],
  ["/api/datapal", "tools"],
  ["/api/extract-website", "tools"],
  ["/api/automations", "workflows"],
  ["/api/integrations", "integrations"],
];

// Only the owner may use these at all.
const OWNER_ONLY_PREFIXES = ["/api/team/invites", "/api/team/hris", "/api/payments", "/api/verify", "/api/business/register"];
// Owner-only when changing something; teammates may read.
const OWNER_ONLY_WRITES = ["/api/team", "/api/business"];

// These use POST only to carry a question; they do not change data, so "Read only" still allows them.
const READ_ONLY_POSTS = ["/api/ai/chat", "/api/knowledge/query", "/api/knowledge/search", "/api/bi/evaluate", "/api/bi/forecast"];

const startsWith = (path: string, prefix: string) => path === prefix || path.startsWith(prefix + "/");

function forbidden(message: string) {
  return NextResponse.json({ success: false, error: message }, { status: 403 });
}

/** Returns an error response if this teammate may not make this request, otherwise null. */
export function checkTeamAccess(req: Request, membership: TeamMembership, ownerBusinessId: string): NextResponse | null {
  let path = "";
  try { path = new URL(req.url).pathname; } catch { return forbidden("Not allowed."); }
  const method = req.method.toUpperCase();
  const isRead = method === "GET" || method === "HEAD";

  if (OWNER_ONLY_PREFIXES.some(p => startsWith(path, p))) return forbidden("Only the account owner can do this.");
  // Account removal and the owner's own profile
  if (startsWith(path, "/api/auth/account-status") && method === "DELETE") return forbidden("Only the account owner can do this.");
  if (!isRead && path !== "/api/team/permissions" && OWNER_ONLY_WRITES.some(p => startsWith(path, p))) return forbidden("Only the account owner can change this.");
  if (!isRead && startsWith(path, "/api/team/permissions")) return forbidden("Only the account owner can change permissions.");

  const area = AREA_BY_PREFIX.find(([p]) => startsWith(path, p))?.[1];
  if (!area) return null;

  let matrix = DEFAULT_MATRIX;
  try { matrix = sanitizeMatrix(getPlatformConfig<any>(`team_permissions:${ownerBusinessId}`, DEFAULT_MATRIX)); } catch {}
  const role = membership.role as Role;
  const level: Level = matrix[area]?.[role] ?? "None";

  if (level === "None") return forbidden("Your role doesn't have access to this section. Ask the account owner.");
  if (level === "Read only" && !isRead && !READ_ONLY_POSTS.some(p => startsWith(path, p))) {
    return forbidden("Your role can view this section but not change it. Ask the account owner.");
  }
  return null;
}
