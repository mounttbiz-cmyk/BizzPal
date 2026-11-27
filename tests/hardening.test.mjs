// Security, persistence, PDF ingestion, SSRF, and billing hardening tests.
import { deflateSync } from "node:zlib";
import { BASE, businessIdOf, call, openDatabase, reporter, sessionToken } from "./helpers.mjs";

const db = openDatabase();
const stamp = Date.now();
const A = `hardening-a-${stamp}@example.test`;
const B = `hardening-b-${stamp}@example.test`;
const now = new Date().toISOString();

function cleanup() {
  for (const e of [A, B]) {
    const biz = businessIdOf(e);
    for (const [sql, param] of [
      ["DELETE FROM document_chunks WHERE business_id = ?", biz],
      ["DELETE FROM company_documents WHERE business_id = ?", biz],
      ["DELETE FROM workspace_state WHERE business_id = ?", biz],
      ["DELETE FROM integrations WHERE business_id = ?", biz],
      ["DELETE FROM subscriptions WHERE user_email = ?", e],
      ["DELETE FROM registered_users WHERE email = ?", e],
      ["DELETE FROM businesses WHERE id = ?", biz],
    ]) {
      try {
        db.prepare(sql).run(param);
      } catch {}
    }
  }
}

cleanup();
for (const e of [A, B]) {
  db.prepare("INSERT OR IGNORE INTO registered_users (id, email, name, provider, created_at) VALUES (?, ?, ?, 'email', ?)").run(
    "usr_" + e,
    e,
    e,
    now
  );
  db.prepare("INSERT OR IGNORE INTO businesses (id, name, founder_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(
    businessIdOf(e),
    e + " Co",
    "Founder",
    now,
    now
  );
}

const t = reporter();
const { check } = t;

try {
  const tA = sessionToken(A);
  const tB = sessionToken(B);

  // 1. Hardcoded admin backdoor passcodes rejected
  for (const badCode of ["bizzpal2026", "bizzpal@2026"]) {
    const r = await call("/api/admin/auth", { method: "POST", body: { passcode: badCode } });
    check(`hardcoded admin passcode "${badCode}" rejected`, r.status === 401 || r.status === 503, `got ${r.status}`);
  }

  // 2. Enterprise ("Custom" price) never parses as ₹0 free
  const entAct = await call("/api/payments/activate", { method: "POST", cookie: tA, body: { planId: "enterprise" } });
  check("enterprise plan cannot be activated free without payment", entAct.status === 402, `got ${entAct.status}`);

  const entOrder = await call("/api/payments/razorpay/order", { method: "POST", cookie: tA, body: { planId: "enterprise" } });
  check("enterprise order does not return isFreePlan: true", entOrder.status >= 400 && !entOrder.json?.isFreePlan, `got ${entOrder.status}`);

  // 3. Cross-tenant x-business-id header spoof ignored on /api/knowledge/documents
  const docRes = await fetch(BASE + "/api/knowledge/documents", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `bizzpal_user_token=${tA}`,
      "x-business-id": businessIdOf(B),
    },
    body: JSON.stringify({ title: "A Private Strategy", fileName: "secret.txt", content: "Confidential margin roadmap for tenant A only." }),
  });
  check("knowledge doc upload for A succeeds", docRes.status === 200);
  const docsB = await call("/api/knowledge/documents", { cookie: tB });
  check("B does NOT receive A's doc despite x-business-id header spoof", !(docsB.json?.documents || []).some(d => d.title === "A Private Strategy"));

  // 4. FlateDecode compressed PDF extraction extracts readable text (not binary stream) & image-only PDF is rejected
  const contentStream = deflateSync(Buffer.from("BT /F1 12 Tf 72 720 Td (BizzPal Q4 Revenue 45 Lakhs) Tj ET", "latin1"));
  const pdfBuf = Buffer.concat([
    Buffer.from("%PDF-1.4\n1 0 obj << /Length " + contentStream.length + " /Filter /FlateDecode >>\nstream\n", "latin1"),
    contentStream,
    Buffer.from("\nendstream\nendobj\n%%EOF", "latin1"),
  ]);
  const form = new FormData();
  form.set("title", "Q4 Financial PDF");
  form.set("file", new File([pdfBuf], "q4-financials.pdf", { type: "application/pdf" }));
  const pdfUpload = await fetch(BASE + "/api/knowledge/documents", {
    method: "POST",
    headers: { Cookie: `bizzpal_user_token=${tA}` },
    body: form,
  });
  const pdfJson = await pdfUpload.json().catch(() => null);
  const chunkRow = db
    .prepare("SELECT content FROM document_chunks WHERE business_id = ? AND content LIKE '%BizzPal Q4 Revenue%'")
    .get(businessIdOf(A));
  check(
    "compressed PDF extracts readable text instead of binary headers",
    pdfUpload.status === 200 && pdfJson?.success === true && Boolean(chunkRow) && !String(chunkRow.content).includes("%PDF-"),
    `status=${pdfUpload.status}`
  );

  const emptyPdf = Buffer.from("%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\n%%EOF", "latin1");
  const badForm = new FormData();
  badForm.set("title", "Scanned Blank PDF");
  badForm.set("file", new File([emptyPdf], "scanned.pdf", { type: "application/pdf" }));
  const badPdfRes = await fetch(BASE + "/api/knowledge/documents", {
    method: "POST",
    headers: { Cookie: `bizzpal_user_token=${tA}` },
    body: badForm,
  });
  check("image-only/empty PDF is rejected cleanly (422)", badPdfRes.status === 422, `got ${badPdfRes.status}`);

  // 5. SSRF blocked on /api/extract-website
  for (const target of ["http://127.0.0.1:8080", "http://169.254.169.254/latest/meta-data/"]) {
    const r = await call("/api/extract-website", { method: "POST", cookie: tA, body: { url: target } });
    check(`SSRF blocked on /api/extract-website (${target})`, r.status === 422, `got ${r.status}`);
  }

  // 6. /api/news requires signed-in user
  const anonNews = await call("/api/news");
  check("GET /api/news requires authentication", anonNews.status === 401, `got ${anonNews.status}`);

  // 7. /api/workspace/state persistence, allowlist, and tenant isolation
  check("anon GET /api/workspace/state -> 401", (await call("/api/workspace/state?scope=reports")).status === 401);
  check("invalid scope -> 400", (await call("/api/workspace/state?scope=evil_scope", { cookie: tA })).status === 400);

  const sampleState = { decisions: [{ id: "dec_1", title: "Trim cloud spend", status: "approved" }], history: [] };
  const putRes = await call("/api/workspace/state?scope=reports", { method: "PUT", cookie: tA, body: { scope: "reports", data: sampleState } });
  const getA = await call("/api/workspace/state?scope=reports", { cookie: tA });
  const getB = await call("/api/workspace/state?scope=reports", { cookie: tB });
  check(
    "workspace_state saves and restores A's state while isolating B",
    putRes.status === 200 && getA.json?.data?.decisions?.[0]?.id === "dec_1" && getB.json?.data === null
  );

  // 8. POST /api/business/intake preserves connected integrations when connectedTools is omitted
  db.prepare(
    "INSERT OR REPLACE INTO integrations (id, business_id, tool_key, status, config, updated_at) VALUES (?, ?, 'google_drive', 'connected', '{\"liveOAuth\":true}', ?)"
  ).run(`int_${stamp}`, businessIdOf(A), now);
  const intakeRes = await call("/api/business/intake", {
    method: "POST",
    cookie: tA,
    body: { name: "Updated Name Only" },
  });
  const driveRow = db
    .prepare("SELECT status FROM integrations WHERE business_id = ? AND tool_key = 'google_drive'")
    .get(businessIdOf(A));
  check(
    "POST /api/business/intake without connectedTools preserves connected integrations",
    intakeRes.status === 200 && driveRow?.status === "connected"
  );
} finally {
  cleanup();
  console.log(`(tested against ${BASE})`);
}

process.exit(t.done() ? 0 : 1);
