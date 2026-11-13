import { db, DEFAULT_BUSINESS_ID } from "@/lib/db";
import { safeEncrypt, safeDecrypt } from "./crypto";
import * as XLSX from "xlsx";

export interface CloudFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  modifiedTime?: string;
  iconUrl?: string;
  webViewLink?: string;
  isFolder: boolean;
  provider: "google" | "onedrive";
  fileCategory: "spreadsheet" | "json" | "document" | "folder" | "other";
}

/**
 * Determine high-level category from MIME type and filename
 */
export function categorizeFile(mimeType: string, fileName: string): CloudFileItem["fileCategory"] {
  const lowerName = fileName.toLowerCase();
  if (
    mimeType === "application/vnd.google-apps.folder" ||
    mimeType === "folder"
  ) {
    return "folder";
  }
  if (
    mimeType === "application/vnd.google-apps.spreadsheet" ||
    mimeType === "text/csv" ||
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "application/vnd.ms-excel" ||
    lowerName.endsWith(".csv") ||
    lowerName.endsWith(".xlsx") ||
    lowerName.endsWith(".xls")
  ) {
    return "spreadsheet";
  }
  if (
    mimeType === "application/json" ||
    lowerName.endsWith(".json")
  ) {
    return "json";
  }
  if (
    mimeType.includes("text") ||
    mimeType.includes("pdf") ||
    mimeType.includes("word") ||
    lowerName.endsWith(".txt") ||
    lowerName.endsWith(".md") ||
    lowerName.endsWith(".pdf") ||
    lowerName.endsWith(".docx")
  ) {
    return "document";
  }
  return "other";
}

/**
 * Retrieve active Google Drive access token from SQLite.
 * Auto-refreshes if expired and a refresh token is present.
 */
export async function getGoogleDriveToken(): Promise<{
  connected: boolean;
  accessToken?: string;
  email?: string;
  name?: string;
  error?: string;
}> {
  try {
    // Check google_drive first, then fallback to google integration
    let record = db
      .prepare("SELECT * FROM integrations WHERE business_id = ? AND tool_key = ?")
      .get(DEFAULT_BUSINESS_ID, "google_drive") as any;

    if (!record || record.status !== "connected") {
      record = db
        .prepare("SELECT * FROM integrations WHERE business_id = ? AND tool_key = ?")
        .get(DEFAULT_BUSINESS_ID, "google") as any;
    }

    if (!record || record.status !== "connected" || !record.config) {
      return { connected: false };
    }

    let config: any = {};
    try {
      config = JSON.parse(record.config);
    } catch {
      return { connected: false };
    }

    let accessToken = config.accessToken ? safeDecrypt(config.accessToken) : null;
    const refreshToken = config.refreshToken ? safeDecrypt(config.refreshToken) : null;
    const expiresAt = config.expiresAt ? Number(config.expiresAt) : null;
    const email = config.connectedEmail || config.email || "";
    const name = config.accountName || config.name || "Google User";

    // Check if token is expired or about to expire in the next 2 minutes
    const isExpired = expiresAt ? Date.now() > expiresAt - 120000 : false;

    if ((!accessToken || isExpired) && refreshToken) {
      const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

      if (clientId && clientSecret) {
        const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: "refresh_token",
          }),
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          accessToken = refreshData.access_token;
          const newExpiresAt = Date.now() + (refreshData.expires_in || 3600) * 1000;

          config.accessToken = safeEncrypt(accessToken!);
          config.expiresAt = newExpiresAt;

          // Update both records in database
          const now = new Date().toISOString();
          for (const key of ["google_drive", "google"]) {
            db.prepare(`
              UPDATE integrations SET config = ?, updated_at = ?
              WHERE business_id = ? AND tool_key = ?
            `).run(JSON.stringify(config), now, DEFAULT_BUSINESS_ID, key);
          }
        }
      }
    }

    if (!accessToken) {
      return { connected: false, error: "Access token missing or expired" };
    }

    return {
      connected: true,
      accessToken,
      email,
      name,
    };
  } catch (err: any) {
    console.error("[getGoogleDriveToken] Error:", err);
    return { connected: false, error: err.message };
  }
}

/**
 * List files from Google Drive API v3
 */
export async function listGoogleDriveFiles(
  accessToken: string,
  options: {
    folderId?: string;
    search?: string;
    onlySupported?: boolean;
    pageSize?: number;
    pageToken?: string;
  } = {}
): Promise<{ files: CloudFileItem[]; nextPageToken?: string }> {
  const queryParts: string[] = ["trashed = false"];

  if (options.folderId) {
    queryParts.push(`'${options.folderId}' in parents`);
  }

  if (options.search && options.search.trim()) {
    const cleanSearch = options.search.replace(/'/g, "\\'");
    queryParts.push(`name contains '${cleanSearch}'`);
  }

  // Filter for business data files if onlySupported is true
  if (options.onlySupported) {
    queryParts.push(
      "(mimeType = 'application/vnd.google-apps.folder' or " +
      "mimeType = 'application/vnd.google-apps.spreadsheet' or " +
      "mimeType = 'text/csv' or " +
      "mimeType = 'application/json' or " +
      "mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' or " +
      "mimeType = 'application/vnd.ms-excel' or " +
      "mimeType = 'text/plain')"
    );
  }

  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("q", queryParts.join(" and "));
  url.searchParams.set("pageSize", String(options.pageSize || 40));
  url.searchParams.set(
    "fields",
    "nextPageToken, files(id, name, mimeType, size, modifiedTime, iconLink, webViewLink, thumbnailLink)"
  );
  url.searchParams.set("orderBy", "folder,modifiedTime desc,name");

  if (options.pageToken) {
    url.searchParams.set("pageToken", options.pageToken);
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google Drive API error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const rawFiles = data.files || [];

  const files: CloudFileItem[] = rawFiles.map((f: any) => {
    const isFolder = f.mimeType === "application/vnd.google-apps.folder";
    return {
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      size: f.size ? Number(f.size) : undefined,
      modifiedTime: f.modifiedTime,
      iconUrl: f.iconLink,
      webViewLink: f.webViewLink,
      isFolder,
      provider: "google",
      fileCategory: categorizeFile(f.mimeType, f.name),
    };
  });

  return { files, nextPageToken: data.nextPageToken };
}

/**
 * Fetch / Export Google Drive file content.
 * Automatically exports Google Sheets to CSV and converts Excel (.xlsx) to CSV.
 */
export async function fetchGoogleDriveFile(
  accessToken: string,
  fileId: string,
  mimeType?: string,
  fileName?: string
): Promise<{
  content: string;
  fileName: string;
  mimeType: string;
  fileType: "csv" | "json" | "text";
  size?: number;
}> {
  const safeName = fileName || "google_drive_file";

  // Case 1: Google Sheet -> Export to CSV
  if (mimeType === "application/vnd.google-apps.spreadsheet") {
    const exportUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/csv`;
    const res = await fetch(exportUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error(`Failed to export Google Sheet to CSV: ${res.statusText}`);
    }

    const csvContent = await res.text();
    const finalName = safeName.endsWith(".csv") ? safeName : `${safeName}.csv`;
    return {
      content: csvContent,
      fileName: finalName,
      mimeType: "text/csv",
      fileType: "csv",
      size: Buffer.byteLength(csvContent, "utf8"),
    };
  }

  // Case 2: Binary Excel (.xlsx, .xls) -> Download and convert first sheet to CSV
  const isExcel =
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "application/vnd.ms-excel" ||
    safeName.toLowerCase().endsWith(".xlsx") ||
    safeName.toLowerCase().endsWith(".xls");

  if (isExcel) {
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const res = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error(`Failed to download Excel file: ${res.statusText}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      throw new Error("Excel file contains no worksheets.");
    }

    const sheet = workbook.Sheets[firstSheetName];
    const csvContent = XLSX.utils.sheet_to_csv(sheet);

    return {
      content: csvContent,
      fileName: safeName.replace(/\.(xlsx|xls)$/i, ".csv"),
      mimeType: "text/csv",
      fileType: "csv",
      size: Buffer.byteLength(csvContent, "utf8"),
    };
  }

  // Case 3: Standard text / CSV / JSON file
  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to download file from Google Drive: ${res.statusText}`);
  }

  const content = await res.text();
  const isJson = safeName.toLowerCase().endsWith(".json") || (mimeType && mimeType.includes("json"));

  return {
    content,
    fileName: safeName,
    mimeType: mimeType || (isJson ? "application/json" : "text/csv"),
    fileType: isJson ? "json" : "csv",
    size: Buffer.byteLength(content, "utf8"),
  };
}
