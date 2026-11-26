import * as XLSX from "xlsx";

/**
 * Reading bank statements and Tally exports into plain money movements: a date, a description and an amount
 * (positive = money in, negative = money out). Nothing is guessed: rows that cannot be read are counted and reported,
 * never filled in.
 */

export interface Movement {
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // + in, - out (rupees)
  balance: number | null;
  /** Tally voucher type, when it came from Tally */
  voucherType?: string;
}

export interface ParseResult {
  movements: Movement[];
  skipped: number;
  /** What the file looked like, for the owner (for example "HDFC-style statement") */
  layout: string;
}

export class ParseError extends Error {}

// ------------------------------------------------------------------ helpers

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };

/** Indian statements write dates day first: 05/11/2026, 05-11-26, 05 Nov 2026, 5-Nov-26, 2026-11-05, or an Excel serial. */
export function parseDate(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  if (typeof v === "number" && v > 20000 && v < 80000) {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(v).trim();
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(s);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{2,4})\b/.exec(s);
  if (m) return iso(year(+m[3]), +m[2], +m[1]);
  m = /^(\d{1,2})[-/. ]([A-Za-z]{3,4})[a-z]*[-/., ]+(\d{2,4})\b/.exec(s);
  if (m && MONTHS[m[2].toLowerCase()]) return iso(year(+m[3]), MONTHS[m[2].toLowerCase()], +m[1]);
  // Tally XML: 20261105
  m = /^(\d{4})(\d{2})(\d{2})$/.exec(s);
  if (m) return iso(+m[1], +m[2], +m[3]);
  return null;
}
const year = (y: number) => (y < 100 ? 2000 + y : y);
function iso(y: number, mo: number, d: number): string | null {
  if (y < 1990 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** "1,23,456.50", "1,234.00 Cr", "(500)", "-", "" -> number or null */
export function parseAmount(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return isFinite(v) ? v : null;
  let s = String(v).trim();
  if (!s || s === "-" || s === "--") return null;
  let sign = 1;
  if (/\(.*\)/.test(s)) sign = -1;
  if (/\bdr\.?$/i.test(s)) sign = -1;
  s = s.replace(/[₹,\s()]|cr\.?$|dr\.?$|inr/gi, "");
  const n = Number(s);
  return isFinite(n) && s !== "" ? sign * n : null;
}

const norm = (h: unknown) => String(h ?? "").toLowerCase().replace(/[^a-z]/g, "");

// ------------------------------------------------------------------ bank statements

interface Columns {
  date: number;
  desc: number;
  debit: number;
  credit: number;
  amount: number;
  type: number;
  balance: number;
}

function findColumns(row: unknown[]): Columns | null {
  const h = row.map(norm);
  const pick = (tests: Array<(x: string) => boolean>) => {
    for (const t of tests) {
      const i = h.findIndex(t);
      if (i >= 0) return i;
    }
    return -1;
  };
  const date = pick([x => x === "txndate" || x === "transactiondate" || x === "trandate", x => x === "date", x => x === "valuedate" || x === "valuedt", x => x.includes("date")]);
  const desc = pick([x => x.includes("narration"), x => x.includes("description"), x => x.includes("particular"), x => x.includes("remark"), x => x.includes("details")]);
  const debit = pick([x => x.includes("withdrawal"), x => x === "debit" || x.startsWith("debitamount") || x === "dr" || x.includes("debit"), x => x === "withdrawaldr"]);
  const credit = pick([x => x.includes("deposit"), x => x === "credit" || x.startsWith("creditamount") || x === "cr" || x.includes("credit")]);
  const amount = pick([x => x === "amount" || x === "amountinr" || x === "transactionamount"]);
  const type = pick([x => x === "drcr" || x === "crdr" || x === "type" || x === "debitcredit"]);
  const balance = pick([x => x.includes("balance") || x === "bal"]);
  if (date < 0 || desc < 0) return null;
  if (debit < 0 && credit < 0 && amount < 0) return null;
  return { date, desc, debit, credit, amount, type, balance };
}

function rowsFromFile(buf: Buffer, fileName: string): unknown[][] {
  const lower = fileName.toLowerCase();
  if (!/\.(csv|xlsx|xls|txt)$/.test(lower)) throw new ParseError("Upload the statement as a CSV or Excel file (most banks offer one of these when you download a statement).");
  // A CSV is read as plain text: the spreadsheet library would read "01/09/26" the American way (9 January), while
  // Indian statements write the day first. parseDate below reads it correctly. Excel files carry real dates.
  const isText = /\.(csv|txt)$/.test(lower);
  const wb = isText
    ? XLSX.read(buf.toString("utf8").replace(/^﻿/, ""), { type: "string", raw: true })
    : XLSX.read(buf, { type: "buffer", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw new ParseError("The file is empty.");
  return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" }) as unknown[][];
}

export function parseBankStatement(buf: Buffer, fileName: string): ParseResult {
  const rows = rowsFromFile(buf, fileName);
  // The header is usually a few rows down, under the bank's name and account details
  let cols: Columns | null = null;
  let start = 0;
  for (let i = 0; i < Math.min(rows.length, 40); i++) {
    cols = findColumns(rows[i]);
    if (cols) {
      start = i + 1;
      break;
    }
  }
  if (!cols) {
    throw new ParseError("Could not find the columns in this file. A bank statement needs a date, a description, and withdrawal and deposit (or amount) columns.");
  }

  const movements: Movement[] = [];
  let skipped = 0;
  for (const r of rows.slice(start)) {
    const date = parseDate(r[cols.date]);
    const description = String(r[cols.desc] ?? "").replace(/\s+/g, " ").trim();
    if (!date && !description) continue; // blank line
    let amount: number | null = null;
    if (cols.debit >= 0 || cols.credit >= 0) {
      const dr = cols.debit >= 0 ? parseAmount(r[cols.debit]) : null;
      const cr = cols.credit >= 0 ? parseAmount(r[cols.credit]) : null;
      if (cr && cr !== 0) amount = Math.abs(cr);
      else if (dr && dr !== 0) amount = -Math.abs(dr);
    }
    if (amount === null && cols.amount >= 0) {
      const a = parseAmount(r[cols.amount]);
      if (a !== null) {
        const t = cols.type >= 0 ? String(r[cols.type] ?? "").toLowerCase() : "";
        amount = t.startsWith("d") ? -Math.abs(a) : t.startsWith("c") ? Math.abs(a) : a;
      }
    }
    if (!date || amount === null || amount === 0) {
      // Footer lines ("Opening balance", totals) and anything unreadable
      skipped++;
      continue;
    }
    const balance = cols.balance >= 0 ? parseAmount(r[cols.balance]) : null;
    movements.push({ date, description: description.slice(0, 300) || "No description", amount: Math.round(amount * 100) / 100, balance });
  }
  if (movements.length === 0) throw new ParseError("No transactions could be read from this file. Check that it is the statement itself, not a summary.");
  return { movements, skipped, layout: "Bank statement" };
}

// ------------------------------------------------------------------ Tally

/** Which Tally vouchers count as what */
const VOUCHERS: Record<string, "sale" | "receipt" | "payment" | "purchase" | null> = {
  sales: "sale",
  "sales order": null,
  "credit note": null,
  receipt: "receipt",
  payment: "payment",
  purchase: "purchase",
  "debit note": null,
  journal: null,
  contra: null,
};

function voucherKind(type: string) {
  const t = type.trim().toLowerCase();
  if (t in VOUCHERS) return VOUCHERS[t];
  if (t.includes("sale")) return "sale";
  if (t.includes("receipt")) return "receipt";
  if (t.includes("payment")) return "payment";
  if (t.includes("purchase")) return "purchase";
  return null;
}

/**
 * A Tally Day Book, exported as Excel (Date, Particulars, Vch Type, Vch No, Debit, Credit) or as XML
 * (Display > Day Book > Export > XML). Sales become revenue; receipts are money in; payments are money out.
 */
export function parseTally(buf: Buffer, fileName: string): ParseResult {
  const lower = fileName.toLowerCase();
  const movements: Movement[] = [];
  let skipped = 0;

  if (lower.endsWith(".xml")) {
    const xml = buf.toString("utf8").replace(/^﻿/, "");
    const vouchers = xml.match(/<VOUCHER\b[\s\S]*?<\/VOUCHER>/gi) || [];
    if (vouchers.length === 0) throw new ParseError("This XML file has no Tally vouchers. Export the Day Book from Tally as XML.");
    for (const v of vouchers) {
      const type = (/VCHTYPE="([^"]+)"/i.exec(v)?.[1] || /<VOUCHERTYPENAME>([^<]+)</i.exec(v)?.[1] || "").trim();
      const kind = voucherKind(type);
      const date = parseDate(/<DATE>(\d{8})<\/DATE>/i.exec(v)?.[1]);
      const party = (/<PARTYLEDGERNAME>([^<]*)</i.exec(v)?.[1] || /<NARRATION>([^<]*)</i.exec(v)?.[1] || type).trim();
      // The party's ledger line carries the voucher total
      const amounts = Array.from(v.matchAll(/<AMOUNT>\s*(-?[\d.]+)\s*<\/AMOUNT>/gi)).map(m => Math.abs(Number(m[1])));
      const total = amounts.length ? Math.max(...amounts) : NaN;
      if (!kind || !date || !isFinite(total) || total === 0) {
        if (kind) skipped++;
        continue;
      }
      movements.push({
        date,
        description: decodeXml(party).slice(0, 300),
        amount: kind === "payment" || kind === "purchase" ? -total : total,
        balance: null,
        voucherType: type,
      });
    }
  } else {
    const rows = rowsFromFile(buf, fileName);
    let start = -1;
    let c = { date: -1, part: -1, type: -1, debit: -1, credit: -1 };
    for (let i = 0; i < Math.min(rows.length, 40); i++) {
      const h = rows[i].map(norm);
      const type = h.findIndex(x => x === "vchtype" || x === "vouchertype");
      const date = h.findIndex(x => x === "date");
      if (type >= 0 && date >= 0) {
        c = {
          date,
          type,
          part: h.findIndex(x => x.includes("particular")),
          debit: h.findIndex(x => x.includes("debit")),
          credit: h.findIndex(x => x.includes("credit")),
        };
        start = i + 1;
        break;
      }
    }
    if (start < 0) throw new ParseError("Could not find the Day Book columns. Export the Day Book from Tally with Date, Particulars, Vch Type, Debit and Credit.");
    let lastDate: string | null = null;
    for (const r of rows.slice(start)) {
      const type = String(r[c.type] ?? "").trim();
      const date: string | null = parseDate(r[c.date]) || (type ? lastDate : null); // Tally leaves the date blank on later lines of a day
      if (date) lastDate = date;
      const kind = voucherKind(type);
      if (!type) continue;
      const dr = c.debit >= 0 ? parseAmount(r[c.debit]) : null;
      const cr = c.credit >= 0 ? parseAmount(r[c.credit]) : null;
      const total = Math.abs(dr || cr || 0);
      if (!kind || !date || !total) {
        if (kind) skipped++;
        continue;
      }
      movements.push({
        date,
        description: String(r[c.part] ?? type).replace(/\s+/g, " ").trim().slice(0, 300) || type,
        amount: kind === "payment" || kind === "purchase" ? -total : total,
        balance: null,
        voucherType: type,
      });
    }
  }
  if (movements.length === 0) throw new ParseError("No sales, receipts or payments could be read from this file.");
  return { movements, skipped, layout: "Tally Day Book" };
}

function decodeXml(s: string) {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}
