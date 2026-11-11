/**
 * Team roles and what each role can open.
 * The owner sets the matrix on the Team page; it is saved on the server and
 * applied to the sidebar and to page access.
 */

export const ROLES = ["Owner", "Executive", "Manager", "Operator"] as const;
export type Role = (typeof ROLES)[number];

export const LEVELS = ["Full", "Edit", "Read only", "None"] as const;
export type Level = (typeof LEVELS)[number];

export interface Area {
  id: string;
  label: string;
  /** Pages that belong to this area */
  paths: string[];
}

export const AREAS: Area[] = [
  { id: "finance", label: "Cash ledger and financial projections", paths: ["/analytics", "/simulator"] },
  { id: "advisors", label: "AI advisors", paths: ["/chat"] },
  { id: "compliance", label: "Legal and GST compliance", paths: ["/knowledge"] },
  { id: "tools", label: "Tools and calculators", paths: ["/tools", "/datapal"] },
  { id: "workflows", label: "Workflows and automations", paths: ["/workflows", "/automations"] },
  { id: "integrations", label: "Integrations and API tokens", paths: ["/integrations", "/settings/tools"] },
];

export type Matrix = Record<string, Record<Role, Level>>;

export const DEFAULT_MATRIX: Matrix = {
  finance: { Owner: "Full", Executive: "Full", Manager: "Read only", Operator: "None" },
  advisors: { Owner: "Full", Executive: "Full", Manager: "Full", Operator: "Read only" },
  compliance: { Owner: "Full", Executive: "Edit", Manager: "None", Operator: "None" },
  tools: { Owner: "Full", Executive: "Full", Manager: "Full", Operator: "Read only" },
  workflows: { Owner: "Full", Executive: "Full", Manager: "Edit", Operator: "None" },
  integrations: { Owner: "Full", Executive: "None", Manager: "None", Operator: "None" },
};

/** Pages only the owner may open, whatever the matrix says */
const OWNER_ONLY_PATHS = ["/team"];

export function roleFromSession(raw: string | null | undefined): Role {
  const r = String(raw || "owner").toLowerCase();
  if (r === "executive") return "Executive";
  if (r === "manager") return "Manager";
  if (r === "operator") return "Operator";
  return "Owner";
}

/** Makes sure a saved or submitted matrix only has known areas, roles and levels. The owner always has full access. */
export function sanitizeMatrix(input: any): Matrix {
  const out: Matrix = {};
  for (const area of AREAS) {
    out[area.id] = {} as Record<Role, Level>;
    for (const role of ROLES) {
      const v = input?.[area.id]?.[role];
      out[area.id][role] = role === "Owner" ? "Full" : (LEVELS as readonly string[]).includes(v) ? v : DEFAULT_MATRIX[area.id][role];
    }
  }
  return out;
}

export function areaForPath(pathname: string): Area | null {
  return AREAS.find(a => a.paths.some(p => pathname === p || pathname.startsWith(p + "/"))) || null;
}

export function canAccessPath(matrix: Matrix, role: Role, pathname: string): boolean {
  if (role === "Owner") return true;
  if (OWNER_ONLY_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"))) return false;
  const area = areaForPath(pathname);
  if (!area) return true;
  return (matrix[area.id]?.[role] ?? "Full") !== "None";
}
