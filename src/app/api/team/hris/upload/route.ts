import { NextResponse } from "next/server";
import { cleanEmail, rateLimited } from "@/lib/verification/store";
import { recordHrisSync, type HrisEmployeeRecord } from "@/lib/team/hris";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

const ownerOf = (v: any) => {
  const e = cleanEmail(typeof v === "string" ? v : "");
  return e.includes("@") ? e : "";
};

function normalizeHeader(h: string): string {
  return String(h || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * POST /api/team/hris/upload
 * Handles Multipart / Form-Data upload of Excel (.xlsx, .xls) and CSV files
 */
export async function POST(req: Request) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to parse form data." }, { status: 400 });
  }

  const owner = ownerOf(formData.get("email"));
  if (!owner) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }

  if (rateLimited(`excel_up:${owner}`, 20, 3_600_000)) {
    return NextResponse.json({ error: "Too many file uploads. Please try again in a few minutes." }, { status: 429 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file uploaded. Please select an Excel (.xlsx, .xls) or CSV file." }, { status: 400 });
  }

  const fileName = file.name || "roster.xlsx";
  const ext = fileName.toLowerCase().split(".").pop();
  if (!["xlsx", "xls", "csv"].includes(ext || "")) {
    return NextResponse.json({ error: "Unsupported file format. Please upload .xlsx, .xls, or .csv." }, { status: 400 });
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json({ error: "The spreadsheet workbook appears to be empty." }, { status: 400 });
    }

    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      return NextResponse.json({ error: "No rows found in the uploaded spreadsheet." }, { status: 400 });
    }

    const domain = owner.includes("@") ? owner.split("@")[1] : "company.com";
    const parsedEmployees: HrisEmployeeRecord[] = [];

    rawRows.forEach((row, idx) => {
      // Find matching keys dynamically
      const keys = Object.keys(row);
      const getVal = (candidates: string[]): string => {
        for (const k of keys) {
          const norm = normalizeHeader(k);
          if (candidates.some((c) => norm.includes(c))) {
            return String(row[k] || "").trim();
          }
        }
        return "";
      };

      const name = getVal(["name", "fullname", "employeename", "staffname"]);
      const email = getVal(["email", "workemail", "mail", "corporateemail"]);
      const empId = getVal(["id", "empid", "code", "staffid", "memberid"]) || `XLS-${1000 + idx + 1}`;
      const title = getVal(["title", "role", "designation", "job", "position"]) || "Team Member";
      const dept = getVal(["dept", "department", "team", "division", "unit"]) || "General Operations";
      const manager = getVal(["manager", "lead", "reporting", "supervisor"]);
      const location = getVal(["location", "city", "office", "branch", "workplace"]) || "Headquarters";
      const hireDate = getVal(["hire", "joining", "doj", "startdate"]) || "2024-01-15";
      const rawType = getVal(["type", "employmenttype", "contract", "nature"]).toLowerCase();
      const rawStatus = getVal(["status", "state", "activestatus"]).toLowerCase();

      // Skip empty rows without name and email
      if (!name && !email) return;

      const employmentType: HrisEmployeeRecord["employmentType"] = rawType.includes("contract")
        ? "contractor"
        : rawType.includes("part")
        ? "part-time"
        : rawType.includes("intern")
        ? "intern"
        : "full-time";

      const status: HrisEmployeeRecord["status"] = rawStatus.includes("leave")
        ? "on_leave"
        : rawStatus.includes("term") || rawStatus.includes("exit") || rawStatus.includes("inactive")
        ? "terminated"
        : "active";

      const cleanEmpEmail = email && email.includes("@") ? email.toLowerCase() : `${name.toLowerCase().replace(/[^a-z0-9]/g, ".")}@${domain}`;

      parsedEmployees.push({
        id: empId,
        name: name || email.split("@")[0],
        email: cleanEmpEmail,
        jobTitle: title,
        department: dept,
        manager: manager || undefined,
        location,
        hireDate,
        salary: "Verified Spreadsheet",
        employmentType,
        status,
      });
    });

    if (parsedEmployees.length === 0) {
      return NextResponse.json(
        { error: "Could not identify valid employee rows. Ensure your Excel sheet has headers like Name, Email, Role, Department." },
        { status: 400 }
      );
    }

    const summary = recordHrisSync(
      owner,
      "excel_roster",
      { fileName, totalRowsParsed: String(parsedEmployees.length), sheetName },
      parsedEmployees
    );

    return NextResponse.json({
      ok: true,
      summary,
      message: `Successfully imported ${summary.activeHeadcount} active employee records from ${fileName}.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: `Failed to process Excel file: ${err?.message || "Invalid structure"}` }, { status: 500 });
  }
}

