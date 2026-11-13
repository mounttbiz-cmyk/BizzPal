import { db, DEFAULT_BUSINESS_ID } from "@/lib/db";
import { safeEncrypt, safeDecrypt } from "./crypto";
import { CloudFileItem, categorizeFile } from "./googleDrive";
import * as XLSX from "xlsx";

/**
 * Retrieve active Microsoft OneDrive access token from SQLite.
 * Auto-refreshes if expired and a refresh token is present.
 */
export async function getOneDriveToken(): Promise<{
  connected: boolean;
  accessToken?: string;
  email?: string;
  name?: string;
  error?: string;
}> {
  try {
    const record = db
      .prepare("SELECT * FROM integrations WHERE business_id = ? AND tool_key = ?")
      .get(DEFAULT_BUSINESS_ID, "onedrive") as any;

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
    const name = config.accountName || config.name || "Microsoft User";

    // Auto-refresh token if within 2 minutes of expiry
    const isExpired = expiresAt ? Date.now() > expiresAt - 120000 : false;

    if ((!accessToken || isExpired) && refreshToken) {
      const clientId = process.env.MICROSOFT_CLIENT_ID || process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID;
      const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

      if (clientId) {
        const bodyParams: Record<string, string> = {
          client_id: clientId,
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          scope: "offline_access Files.Read Files.Read.All User.Read",
        };
        if (clientSecret) bodyParams.client_secret = clientSecret;

        const refreshRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(bodyParams),
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          accessToken = refreshData.access_token;
          const newExpiresAt = Date.now() + (refreshData.expires_in || 3600) * 1000;

          config.accessToken = safeEncrypt(accessToken!);
          config.expiresAt = newExpiresAt;
          if (refreshData.refresh_token) {
            config.refreshToken = safeEncrypt(refreshData.refresh_token);
          }

          const now = new Date().toISOString();
          db.prepare(`
            UPDATE integrations SET config = ?, updated_at = ?
            WHERE business_id = ? AND tool_key = ?
          `).run(JSON.stringify(config), now, DEFAULT_BUSINESS_ID, "onedrive");
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
    console.error("[getOneDriveToken] Error:", err);
    return { connected: false, error: err.message };
  }
}

/**
 * List files from Microsoft Graph API v1.0
 */
export async function listOneDriveFiles(
  accessToken: string,
  options: {
    folderId?: string;
    search?: string;
    onlySupported?: boolean;
    pageSize?: number;
  } = {}
): Promise<{ files: CloudFileItem[] }> {
  let urlStr = "https://graph.microsoft.com/v1.0/me/drive/root/children";

  if (options.search && options.search.trim()) {
    const encodedQ = encodeURIComponent(options.search.trim());
    urlStr = `https://graph.microsoft.com/v1.0/me/drive/root/search(q='${encodedQ}')`;
  } else if (options.folderId) {
    urlStr = `https://graph.microsoft.com/v1.0/me/drive/items/${options.folderId}/children`;
  }

  const url = new URL(urlStr);
  url.searchParams.set("$top", String(options.pageSize || 50));
  url.searchParams.set(
    "$select",
    "id,name,size,lastModifiedDateTime,webUrl,file,folder"
  );

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Microsoft Graph API error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const rawItems = data.value || [];

  const files: CloudFileItem[] = rawItems
    .map((item: any) => {
      const isFolder = Boolean(item.folder);
      const mimeType = item.file?.mimeType || (isFolder ? "folder" : "application/octet-stream");

      return {
        id: item.id,
        name: item.name,
        mimeType,
        size: item.size ? Number(item.size) : undefined,
        modifiedTime: item.lastModifiedDateTime,
        webViewLink: item.webUrl,
        isFolder,
        provider: "onedrive" as const,
        fileCategory: categorizeFile(mimeType, item.name),
      };
    })
    .filter((f: CloudFileItem) => {
      if (!options.onlySupported) return true;
      if (f.isFolder) return true;
      return f.fileCategory === "spreadsheet" || f.fileCategory === "json" || f.fileCategory === "document";
    });

  return { files };
}

/**
 * Download file from OneDrive and parse / convert to CSV or JSON
 */
export async function fetchOneDriveFile(
  accessToken: string,
  itemId: string,
  fileName?: string
): Promise<{
  content: string;
  fileName: string;
  mimeType: string;
  fileType: "csv" | "json" | "text";
  size?: number;
}> {
  const safeName = fileName || "onedrive_file";
  const downloadUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${itemId}/content`;

  const res = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to download file from OneDrive: ${res.statusText}`);
  }

  const isExcel =
    safeName.toLowerCase().endsWith(".xlsx") ||
    safeName.toLowerCase().endsWith(".xls");

  // Excel conversion to CSV
  if (isExcel) {
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      throw new Error("Excel workbook has no sheets.");
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

  // Text, CSV, JSON
  const content = await res.text();
  const isJson = safeName.toLowerCase().endsWith(".json");

  return {
    content,
    fileName: safeName,
    mimeType: isJson ? "application/json" : "text/csv",
    fileType: isJson ? "json" : "csv",
    size: Buffer.byteLength(content, "utf8"),
  };
}

