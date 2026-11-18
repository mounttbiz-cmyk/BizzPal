import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { cleanEmail, ensureVerificationSchema } from "@/lib/verification/store";

export type HrisProvider =
  // Tier 1: Enterprise HRIS / HCM
  | "workday"
  | "sap_successfactors"
  | "oracle_hcm"
  | "adp"
  // Tier 2: Mid-market & Modern Cloud HRIS
  | "bamboohr"
  | "rippling"
  | "gusto"
  | "hibob"
  | "darwinbox"
  | "keka"
  | "greytip"
  // Alternative genuine verified methods (No HRIS)
  | "google_workspace"
  | "microsoft_entra"
  | "epfo_ecr"
  | "payroll_csv"
  // Individual CRM Connections
  | "salesforce"
  | "hubspot"
  | "zoho_crm"
  | "leadsquared"
  | "pipedrive"
  | "custom_crm"
  // Direct Excel & Spreadsheet Rosters
  | "excel_roster";

export interface HrisEmployeeRecord {
  id: string; // Employee ID (e.g. EMP-10492)
  name: string;
  email: string;
  jobTitle: string;
  department: string;
  manager?: string;
  location?: string;
  hireDate?: string;
  salary?: string;
  employmentType: "full-time" | "part-time" | "contractor" | "intern";
  status: "active" | "on_leave" | "terminated";
}

export interface HrisSyncSummary {
  provider: HrisProvider;
  totalRecords: number;
  activeHeadcount: number;
  onLeaveHeadcount: number;
  contractorHeadcount: number;
  syncedAt: string;
  employees: HrisEmployeeRecord[];
}

export interface ProviderCatalogMeta {
  id: HrisProvider;
  name: string;
  category: "enterprise_hris" | "cloud_hris" | "idp_directory" | "statutory_payroll" | "crm" | "spreadsheet";
  badge: string;
  description: string;
  authType: "oauth" | "api_key" | "epfo_upload" | "payroll_csv" | "excel_upload";
  fields: { key: string; label: string; placeholder: string; type?: string; secure?: boolean }[];
}

export const HRIS_CATALOG: ProviderCatalogMeta[] = [
  // Enterprise Core Records
  {
    id: "workday",
    name: "Workday Human Capital Management",
    category: "enterprise_hris",
    badge: "Enterprise HCM",
    description: "Sync active worker directory, cost centers, supervisory hierarchy, and job profiles via Workday Web Services (WWS / RaaS).",
    authType: "api_key",
    fields: [
      { key: "tenantUrl", label: "Workday Tenant URL / Host", placeholder: "https://wd2-impl-services1.workday.com/ccx/service/your_tenant" },
      { key: "apiClient", label: "ISU Client ID / Username", placeholder: "ISU_BizzPal_Sync@your_tenant" },
      { key: "apiKey", label: "Integration System User Password / Refresh Token", placeholder: "••••••••••••••••", secure: true },
    ],
  },
  {
    id: "sap_successfactors",
    name: "SAP SuccessFactors",
    category: "enterprise_hris",
    badge: "Enterprise Core",
    description: "Direct OData v4 / Employee Central REST sync of employment, job records, positions, and company org units.",
    authType: "api_key",
    fields: [
      { key: "companyId", label: "Company ID", placeholder: "ACME_CORP" },
      { key: "apiEndpoint", label: "API Base URL", placeholder: "https://api12preview.sapsf.eu" },
      { key: "apiKey", label: "OAuth 2.0 Client Secret / Bearer Token", placeholder: "••••••••••••••••", secure: true },
    ],
  },
  {
    id: "oracle_hcm",
    name: "Oracle Cloud HCM",
    category: "enterprise_hris",
    badge: "Enterprise Cloud",
    description: "Import worker assignments, primary work relationships, departments, and active headcount via Oracle Fusion REST API.",
    authType: "api_key",
    fields: [
      { key: "podUrl", label: "Fusion Pod URL", placeholder: "https://fa-xxxx-saasfaprod1.fa.ocs.oraclecloud.com" },
      { key: "serviceUser", label: "HCM Service Account", placeholder: "hcm_integration_user" },
      { key: "apiKey", label: "Service Account Secret", placeholder: "••••••••••••••••", secure: true },
    ],
  },
  {
    id: "adp",
    name: "ADP Workforce Now / Vantage HCM",
    category: "enterprise_hris",
    badge: "Global Payroll & HCM",
    description: "Worker demographic & payroll status API sync for active employees and tax-verified payroll records.",
    authType: "api_key",
    fields: [
      { key: "orgId", label: "ADP Organization OID", placeholder: "G3XXXXXX" },
      { key: "clientId", label: "Client ID", placeholder: "8472948-adp-app" },
      { key: "clientSecret", label: "Client Secret", placeholder: "••••••••••••••••", secure: true },
    ],
  },
  {
    id: "darwinbox",
    name: "Darwinbox HR",
    category: "cloud_hris",
    badge: "Asia & Global HRMS",
    description: "Employee master directory and live organizational structure sync via Darwinbox Open API.",
    authType: "api_key",
    fields: [
      { key: "domain", label: "Darwinbox Domain", placeholder: "yourcompany.darwinbox.in" },
      { key: "apiKey", label: "API Key", placeholder: "••••••••••••••••", secure: true },
    ],
  },
  {
    id: "keka",
    name: "Keka HR & Payroll",
    category: "cloud_hris",
    badge: "Modern HRMS",
    description: "Sync employees, departments, salary bands, and active tenure directly from Keka HRMS API.",
    authType: "api_key",
    fields: [
      { key: "clientId", label: "Keka Client ID", placeholder: "kek_cli_xxxx" },
      { key: "apiKey", label: "API Key / Bearer Secret", placeholder: "••••••••••••••••", secure: true },
    ],
  },
  {
    id: "bamboohr",
    name: "BambooHR",
    category: "cloud_hris",
    badge: "Mid-Market HRIS",
    description: "Sync employee directory, custom compensation reports, and job titles via BambooHR REST API.",
    authType: "api_key",
    fields: [
      { key: "subdomain", label: "Company Subdomain", placeholder: "yourcompany" },
      { key: "apiKey", label: "BambooHR API Key", placeholder: "••••••••••••••••", secure: true },
    ],
  },
  {
    id: "rippling",
    name: "Rippling HCM",
    category: "cloud_hris",
    badge: "Unified Workforce",
    description: "Instant workforce data, devices, and department assignments via Rippling Employee Graph API.",
    authType: "api_key",
    fields: [
      { key: "companyId", label: "Rippling Organization ID", placeholder: "org_xxxx" },
      { key: "apiKey", label: "Rippling Service Token", placeholder: "••••••••••••••••", secure: true },
    ],
  },

  // Genuine Verified Alternatives for Companies WITHOUT an HRIS/HCM
  {
    id: "google_workspace",
    name: "Google Workspace Admin Directory",
    category: "idp_directory",
    badge: "Verified IdP Directory",
    description: "Authenticates with your Google Workspace Domain Admin. Automatically pulls all active Google Workspace enterprise user accounts, organizational units, and managers without manual entry.",
    authType: "oauth",
    fields: [
      { key: "domain", label: "Workspace Primary Domain", placeholder: "yourcompany.com" },
      { key: "adminEmail", label: "Admin Account Email", placeholder: "admin@yourcompany.com" },
    ],
  },
  {
    id: "microsoft_entra",
    name: "Microsoft Entra ID (Azure AD & M365)",
    category: "idp_directory",
    badge: "Verified IdP Directory",
    description: "Syncs directly from Microsoft Graph API. Pulls all licensed internal enterprise corporate users, job titles, departments, and manager reporting structure directly from Azure AD.",
    authType: "oauth",
    fields: [
      { key: "tenantId", label: "Azure / M365 Tenant ID", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" },
      { key: "clientId", label: "App / Client ID", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" },
    ],
  },
  {
    id: "epfo_ecr",
    name: "Statutory EPFO ECR / Social Security Filing",
    category: "statutory_payroll",
    badge: "Government Statutory Filing",
    description: "Verified government record: Upload your official EPFO (Employees' Provident Fund Organisation) Electronic Challan Cum Return (ECR) monthly file. Contains UAN, Member ID, Gross Wages, and active employees verified against govt filings.",
    authType: "epfo_upload",
    fields: [
      { key: "establishmentCode", label: "EPFO Establishment Code (15-digit)", placeholder: "MHBAN0012345000" },
      { key: "monthYear", label: "Filing Period (Month & Year)", placeholder: "October 2026" },
    ],
  },
  {
    id: "payroll_csv",
    name: "Verified Bank Payroll Disbursement Batch",
    category: "statutory_payroll",
    badge: "Bank Verified Payroll",
    description: "Upload the signed bank disbursement or corporate payroll register (HDFC/ICICI/SBI CMS or RazorpayX/Stripe Payroll format). Headcount and employee compensation are verified against corporate bank statements.",
    authType: "payroll_csv",
    fields: [
      { key: "bankName", label: "Disbursing Corporate Bank", placeholder: "HDFC Bank Corporate CMS" },
      { key: "batchRef", label: "Disbursement Batch Reference #", placeholder: "CMS-202610-SAL-01" },
    ],
  },

  // Individual CRM Connections (Salesforce, HubSpot, Zoho, LeadSquared, Pipedrive, Custom)
  {
    id: "salesforce",
    name: "Salesforce CRM",
    category: "crm",
    badge: "CRM Directory & Users",
    description: "Sync active licensed team members, sales reps, customer success managers, and organizational hierarchy directly via Salesforce REST API.",
    authType: "api_key",
    fields: [
      { key: "instanceUrl", label: "Salesforce Instance URL", placeholder: "https://yourcompany.my.salesforce.com" },
      { key: "clientId", label: "Connected App Consumer Key", placeholder: "3MVG9xxxxxx" },
      { key: "apiKey", label: "OAuth Access Token / Secret", placeholder: "••••••••••••••••", secure: true },
    ],
  },
  {
    id: "hubspot",
    name: "HubSpot CRM",
    category: "crm",
    badge: "CRM & Sales Hub",
    description: "Instantly import active owners, sales operators, account managers, and team assignments from HubSpot CRM User Management API.",
    authType: "api_key",
    fields: [
      { key: "hubId", label: "HubSpot Hub ID / Portal ID", placeholder: "9823412" },
      { key: "apiKey", label: "HubSpot Private App Access Token", placeholder: "pat-na1-••••••••••••", secure: true },
    ],
  },
  {
    id: "zoho_crm",
    name: "Zoho CRM",
    category: "crm",
    badge: "Enterprise CRM",
    description: "Connect Zoho CRM to sync confirmed users, roles, reporting managers, and territory department rosters automatically.",
    authType: "api_key",
    fields: [
      { key: "domain", label: "Zoho Domain / Data Center", placeholder: "crm.zoho.com (or zoho.in)" },
      { key: "apiKey", label: "Zoho CRM Org Auth Token / OAuth Token", placeholder: "••••••••••••••••", secure: true },
    ],
  },
  {
    id: "leadsquared",
    name: "LeadSquared CRM",
    category: "crm",
    badge: "High-Velocity CRM",
    description: "Sync all active sales agents, field operators, and team managers via LeadSquared Users API.",
    authType: "api_key",
    fields: [
      { key: "accessKey", label: "LeadSquared Access Key", placeholder: "u$rxxxxxxxx" },
      { key: "apiKey", label: "Secret Key", placeholder: "••••••••••••••••", secure: true },
    ],
  },
  {
    id: "pipedrive",
    name: "Pipedrive CRM",
    category: "crm",
    badge: "Pipeline CRM",
    description: "Sync active deal owners, sales reps, and managerial hierarchies from Pipedrive Users & Teams API.",
    authType: "api_key",
    fields: [
      { key: "companyDomain", label: "Pipedrive Domain", placeholder: "yourcompany.pipedrive.com" },
      { key: "apiKey", label: "Personal API Token", placeholder: "••••••••••••••••", secure: true },
    ],
  },
  {
    id: "custom_crm",
    name: "Custom / In-House CRM (Webhook & REST)",
    category: "crm",
    badge: "Proprietary CRM",
    description: "Connect your company's own custom or in-house CRM database. Provide your CRM users endpoint or API key to sync all verified staff members.",
    authType: "api_key",
    fields: [
      { key: "endpoint", label: "CRM Employee/User Endpoint URL", placeholder: "https://crm.yourcompany.com/api/v1/users" },
      { key: "authHeader", label: "Authorization Header / API Key", placeholder: "Bearer crm_token_••••••••", secure: true },
    ],
  },

  // Direct Excel & Spreadsheet Rosters (.xlsx, .xls, .csv)
  {
    id: "excel_roster",
    name: "Excel / Spreadsheet Master Roster",
    category: "spreadsheet",
    badge: "Excel (.xlsx, .csv)",
    description: "Import your company master personnel sheet directly (.xlsx, .xls, .csv). Automatically parses Employee IDs, full names, job titles, departments, managers, and active status.",
    authType: "excel_upload",
    fields: [
      { key: "sheetName", label: "Workbook / Sheet Name (Optional)", placeholder: "Employees (or leave blank for 1st sheet)" },
      { key: "fileRef", label: "Document Reference / Batch ID", placeholder: "ROSTER-Q4-2026.xlsx" },
    ],
  },
];

/** Ensures the hris_syncs and hris_employees tables exist in the db */
export function ensureHrisSchema() {
  ensureVerificationSchema();
  db.exec(`
    CREATE TABLE IF NOT EXISTS hris_connections (
      id TEXT PRIMARY KEY,
      owner_email TEXT NOT NULL,
      provider TEXT NOT NULL,
      provider_name TEXT NOT NULL,
      connection_mode TEXT NOT NULL,
      credentials_masked TEXT,
      active_headcount INTEGER DEFAULT 0,
      total_records INTEGER DEFAULT 0,
      synced_at TEXT NOT NULL,
      UNIQUE(owner_email, provider)
    );

    CREATE TABLE IF NOT EXISTS hris_employees (
      id TEXT PRIMARY KEY,
      owner_email TEXT NOT NULL,
      provider TEXT NOT NULL,
      employee_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      job_title TEXT NOT NULL,
      department TEXT NOT NULL,
      manager TEXT,
      location TEXT,
      hire_date TEXT,
      salary TEXT,
      employment_type TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(owner_email, employee_id)
    );
  `);
}

/** Return active HRIS connection and employees for this owner */
export function getHrisConnection(owner: string): { connection: any | null; summary: HrisSyncSummary | null } {
  ensureHrisSchema();
  const o = cleanEmail(owner);
  const conn = (db.prepare("SELECT * FROM hris_connections WHERE owner_email = ? ORDER BY synced_at DESC LIMIT 1").get(o) as any) || null;
  if (!conn) return { connection: null, summary: null };

  const rows = db.prepare("SELECT * FROM hris_employees WHERE owner_email = ? AND provider = ? ORDER BY name ASC").all(o, conn.provider) as any[];
  const employees: HrisEmployeeRecord[] = rows.map((r) => ({
    id: r.employee_id,
    name: r.name,
    email: r.email,
    jobTitle: r.job_title,
    department: r.department,
    manager: r.manager || undefined,
    location: r.location || undefined,
    hireDate: r.hire_date || undefined,
    salary: r.salary || undefined,
    employmentType: r.employment_type as any,
    status: r.status as any,
  }));

  const activeHeadcount = employees.filter((e) => e.status === "active").length;
  const onLeaveHeadcount = employees.filter((e) => e.status === "on_leave").length;
  const contractorHeadcount = employees.filter((e) => e.employmentType === "contractor").length;

  return {
    connection: conn,
    summary: {
      provider: conn.provider as HrisProvider,
      totalRecords: employees.length,
      activeHeadcount,
      onLeaveHeadcount,
      contractorHeadcount,
      syncedAt: conn.synced_at,
      employees,
    },
  };
}

/** Disconnect HRIS */
export function disconnectHris(owner: string, provider?: string): void {
  ensureHrisSchema();
  const o = cleanEmail(owner);
  if (provider) {
    db.prepare("DELETE FROM hris_connections WHERE owner_email = ? AND provider = ?").run(o, provider);
    db.prepare("DELETE FROM hris_employees WHERE owner_email = ? AND provider = ?").run(o, provider);
  } else {
    db.prepare("DELETE FROM hris_connections WHERE owner_email = ?").run(o);
    db.prepare("DELETE FROM hris_employees WHERE owner_email = ?").run(o);
  }
}

/** Generates or ingests records based on the provider and sample payloads */
export function recordHrisSync(
  owner: string,
  provider: HrisProvider,
  config: Record<string, string>,
  customEmployees?: HrisEmployeeRecord[]
): HrisSyncSummary {
  ensureHrisSchema();
  const o = cleanEmail(owner);
  const now = new Date().toISOString();
  const catalogEntry = HRIS_CATALOG.find((c) => c.id === provider);
  const providerName = catalogEntry ? catalogEntry.name : provider;

  let employeesToSave: HrisEmployeeRecord[] = [];

  // Only employees that were really supplied (an uploaded file) are ever saved. Nothing is generated.
  if (!Array.isArray(customEmployees) || customEmployees.length === 0) {
    throw new Error("No employee records were supplied. Upload your employee list (CSV or Excel).");
  }
  employeesToSave = customEmployees;

  // Clear previous employee records for this owner & provider
  db.prepare("DELETE FROM hris_employees WHERE owner_email = ?").run(o);

  const insertEmp = db.prepare(`
    INSERT INTO hris_employees (id, owner_email, provider, employee_id, name, email, job_title, department, manager, location, hire_date, salary, employment_type, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(owner_email, employee_id) DO UPDATE SET
      name = excluded.name,
      email = excluded.email,
      job_title = excluded.job_title,
      department = excluded.department,
      manager = excluded.manager,
      location = excluded.location,
      hire_date = excluded.hire_date,
      salary = excluded.salary,
      employment_type = excluded.employment_type,
      status = excluded.status
  `);

  for (const emp of employeesToSave) {
    insertEmp.run(
      randomUUID(),
      o,
      provider,
      emp.id,
      emp.name,
      emp.email.toLowerCase(),
      emp.jobTitle,
      emp.department,
      emp.manager || null,
      emp.location || "Headquarters",
      emp.hireDate || "2024-01-15",
      emp.salary || "Confidential",
      emp.employmentType,
      emp.status,
      now
    );
  }

  const activeCount = employeesToSave.filter((e) => e.status === "active").length;
  const onLeaveCount = employeesToSave.filter((e) => e.status === "on_leave").length;
  const contractorCount = employeesToSave.filter((e) => e.employmentType === "contractor").length;

  // Mask credentials for display
  const maskedDesc = Object.entries(config)
    .filter(([k]) => !k.toLowerCase().includes("secret") && !k.toLowerCase().includes("key") && !k.toLowerCase().includes("password"))
    .map(([k, v]) => `${k}: ${v}`)
    .join(" | ");

  db.prepare(`
    INSERT INTO hris_connections (id, owner_email, provider, provider_name, connection_mode, credentials_masked, active_headcount, total_records, synced_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(owner_email, provider) DO UPDATE SET
      provider_name = excluded.provider_name,
      connection_mode = excluded.connection_mode,
      credentials_masked = excluded.credentials_masked,
      active_headcount = excluded.active_headcount,
      total_records = excluded.total_records,
      synced_at = excluded.synced_at
  `).run(
    `hris_${randomUUID().slice(0, 8)}`,
    o,
    provider,
    providerName,
    catalogEntry?.category || "enterprise_hris",
    maskedDesc || "Verified connection",
    activeCount,
    employeesToSave.length,
    now
  );

  return {
    provider,
    totalRecords: employeesToSave.length,
    activeHeadcount: activeCount,
    onLeaveHeadcount: onLeaveCount,
    contractorHeadcount: contractorCount,
    syncedAt: now,
    employees: employeesToSave,
  };
}

