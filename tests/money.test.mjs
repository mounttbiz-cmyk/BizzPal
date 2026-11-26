// Phase 2: bank statements and Tally become real revenue, spending and cash; the dashboard shows where each figure
// came from. Uses the sample files in tests/fixtures (test inputs, not app data).
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";
import { BASE, call, reporter, sessionToken } from "./helpers.mjs";

const t = reporter();
const dir = path.dirname(fileURLToPath(import.meta.url));
const stamp = Date.now();
const OWNER = `money_owner_${stamp}@example.test`;
const OTHER = `money_other_${stamp}@example.test`;

async function upload(cookie, source, name, content, type = "text/csv") {
  const fd = new FormData();
  fd.append("file", new Blob([content], { type }), name);
  fd.append("source", source);
  const res = await fetch(BASE + "/api/money", { method: "POST", body: fd, headers: { Cookie: `bizzpal_user_token=${cookie}` } });
  return { status: res.status, json: await res.json().catch(() => null) };
}
const month = (data, ym) => (data?.months || []).find(m => m.month === ym);

try {
  for (const e of [OWNER, OTHER]) await call("/api/auth/register", { method: "POST", body: { email: e, name: e.split("@")[0], password: "MoneyTest123!" } });
  const owner = sessionToken(OWNER);
  const other = sessionToken(OTHER);

  t.check("money figures need sign-in", (await call("/api/money")).status === 401);
  const empty = (await call("/api/business/figures", { cookie: owner })).json;
  t.check("with nothing added, every figure says so instead of showing ₹0", empty?.figures?.monthlyRevenue?.value === null && empty.figures.cash.value === null && empty.figures.runwayMonths === null);

  // ---------------------------------------------------------------- bank statement
  const csv = readFileSync(path.join(dir, "fixtures", "bank-hdfc.csv"));
  t.check("a file that is not a statement is refused with a reason", (await upload(owner, "bank", "notes.pdf", "hello")).status === 400);
  const up = await upload(owner, "bank", "bank-hdfc.csv", csv);
  t.check("an HDFC-style statement is read (header rows and the opening-balance line are skipped)", up.status === 200 && up.json?.import?.rowsAdded === 11 && up.json.import.rowsSkipped >= 1);

  const oct = month(up.json, "2026-10");
  t.check("October revenue is the customer payments only (interest is left out)", oct?.revenue === 100000);
  t.check("October spending counts salary, rent and GST", oct?.spending === 55000);
  t.check("cash is the last bank balance of the month", oct?.closingCash === 167620);
  const sep = month(up.json, "2026-09");
  t.check("money moved to your own account is not counted as spending", sep?.spending === 32500 && sep.revenue === 75000);

  const list = (await call("/api/money?month=2026-09", { cookie: owner })).json;
  const cat = d => list.movements.find(m => m.description.includes(d))?.category;
  t.check("salary, software and own transfers get the right category", cat("SALARY SEP") === "Salaries" && cat("AWS") === "Software" && cat("SELF TRANSFER") === "Own transfer");

  const again = await upload(owner, "bank", "bank-hdfc.csv", csv);
  t.check("uploading the same statement again adds nothing", again.json?.import?.rowsAdded === 0 && again.json.import.rowsDuplicate === 11);

  // An overlapping statement in another bank's layout, as Excel: only the new November rows are added
  const sheet = XLSX.utils.aoa_to_sheet([
    ["State Bank of India"],
    ["Txn Date", "Value Date", "Description", "Ref No./Cheque No.", "Debit", "Credit", "Balance"],
    ["20 Oct 2026", "20 Oct 2026", "IMPS CR-CITY HOSPITAL", "I5513", "", 40000, 167500],
    ["02 Nov 2026", "02 Nov 2026", "NEFT CR-ACME CLINIC PVT LTD-INV 103", "N2403", "", 70000, 237620],
    ["04 Nov 2026", "04 Nov 2026", "ATM CASH WDL", "A1", 5000, "", 232620],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Statement");
  const xlsx = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const sbi = await upload(owner, "bank", "sbi.xlsx", xlsx, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  t.check("an SBI-style Excel statement is read", sbi.status === 200 && sbi.json?.import?.rowsRead === 3);
  t.check("only the new rows are added from an overlapping statement", sbi.json?.import?.rowsAdded === 2);

  // ---------------------------------------------------------------- figures on the dashboard
  const f = (await call("/api/business/figures", { cookie: owner })).json?.figures;
  t.check("the dashboard revenue comes from the bank, for the last full month", f?.monthlyRevenue?.source === "bank" && f.monthlyRevenue.value === 100000 && /October 2026/.test(f.monthlyRevenue.label));
  t.check("cash is the latest bank balance", f?.cash?.value === 232620 && f.cash.source === "bank");
  t.check("runway is worked out from real cash and spending", f?.runwayMonths === Math.round((232620 / 55000) * 10) / 10);

  // ---------------------------------------------------------------- correcting a category
  const acme = (await call("/api/money?month=2026-10&q=acme", { cookie: owner })).json?.movements?.[0];
  const fix = await call(`/api/money/movements/${acme?.id}`, { method: "PATCH", cookie: owner, body: { category: "Loans & investment" } });
  t.check("the owner can change a category", fix.status === 200 && fix.json?.movement?.categoryBy === "owner");
  t.check("a category that does not fit is refused", (await call(`/api/money/movements/${acme?.id}`, { method: "PATCH", cookie: owner, body: { category: "Salaries" } })).status === 400);
  t.check("changing it updates the monthly revenue", month((await call("/api/money", { cookie: owner })).json, "2026-10")?.revenue === 40000);
  await call(`/api/money/movements/${acme?.id}`, { method: "PATCH", cookie: owner, body: { category: "Sales" } });

  // ---------------------------------------------------------------- Tally
  const xml = readFileSync(path.join(dir, "fixtures", "tally-daybook.xml"));
  const tx = await upload(owner, "tally", "daybook.xml", xml, "text/xml");
  t.check("a Tally Day Book (XML) is read: sales and payments, journals left out", tx.status === 200 && tx.json?.import?.rowsAdded === 3);
  const octT = month(tx.json, "2026-10");
  t.check("when Tally covers a month, its sales are the revenue (₹1,18,000 + ₹59,000)", octT?.revenue === 177000 && octT.revenueFrom === "tally");
  t.check("spending still comes from the bank for that month", octT?.spendingFrom === "bank" && octT.spending === 55000);

  const day = XLSX.utils.aoa_to_sheet([
    ["Day Book"],
    ["Date", "Particulars", "Vch Type", "Vch No.", "Debit Amount", "Credit Amount"],
    ["01-Dec-2026", "Sharma Dental", "Sales", "S-9", 25000, ""],
    ["", "Stationery Mart", "Payment", "P-4", "", 1200],
  ]);
  const wb2 = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb2, day, "Day Book");
  const tallyX = await upload(owner, "tally", "daybook.xlsx", XLSX.write(wb2, { type: "buffer", bookType: "xlsx" }), "application/octet-stream");
  t.check("a Tally Day Book exported to Excel is read (a blank date means the same day)", tallyX.status === 200 && tallyX.json?.import?.rowsAdded === 2 && month(tallyX.json, "2026-12")?.revenue === 25000);

  // ---------------------------------------------------------------- privacy and removal
  t.check("another account sees none of it", (await call("/api/money", { cookie: other })).json?.imports?.length === 0);
  t.check("another account cannot change a category", (await call(`/api/money/movements/${acme?.id}`, { method: "PATCH", cookie: other, body: { category: "Sales" } })).status === 404);
  t.check("another account cannot remove an upload", (await call(`/api/money/imports/${tx.json?.import?.id}`, { method: "DELETE", cookie: other })).status === 404);
  t.check("another account's dashboard is unaffected", (await call("/api/business/figures", { cookie: other })).json?.figures?.monthlyRevenue?.value === null);

  const del = await call(`/api/money/imports/${tx.json?.import?.id}`, { method: "DELETE", cookie: owner });
  t.check("removing an upload removes its transactions", del.status === 200 && month((await call("/api/money", { cookie: owner })).json, "2026-10")?.revenueFrom === "bank");
} catch (err) {
  t.check("test run", false, String(err?.stack || err));
}
// The accounts made here are removed by tests/cleanup.mjs after the run
process.exit(t.done() ? 0 : 1);
