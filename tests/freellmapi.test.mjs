// FreeLLMAPI OpenAI-compatible router integration test.
// Expects the app running with FREELMAPI_BASE_URL pointing at the local test router (set FREELMAPI_TEST_CONTROL_URL).
// Skipped during general `npm run test:security` unless FREELMAPI_TEST_CONTROL_URL is set.
import { call, openDatabase, reporter, sessionToken, businessIdOf } from "./helpers.mjs";

const controlUrl = process.env.FREELMAPI_TEST_CONTROL_URL;
if (!controlUrl) {
  console.log("SKIP FreeLLMAPI tests (run with FREELMAPI_TEST_CONTROL_URL pointing at the test FreeLLMAPI router)");
  process.exit(0);
}

const t = reporter();
const db = openDatabase();
const stamp = Date.now();
const USER = `freellm_${stamp}@example.test`;

function cleanup() {
  const del = (sql, ...a) => { try { db.prepare(sql).run(...a); } catch {} };
  const biz = businessIdOf(USER);
  del("DELETE FROM ai_usage WHERE business_id = ?", biz);
  del("DELETE FROM businesses WHERE id = ?", biz);
  del("DELETE FROM registered_users WHERE email = ?", USER);
}
cleanup();

async function setMode(mode) {
  await fetch(controlUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode }) });
}

try {
  await call("/api/auth/register", { method: "POST", body: { email: USER, name: "FreeLLM Tester", password: "FreeLlmTest123!" } });
  const cookie = sessionToken(USER);

  // 1. Direct "auto" routing works and meters usage under provider = 'freellmapi'
  await setMode("auto_ok");
  const r1 = await call("/api/ai/chat", { method: "POST", cookie, body: { agentId: "ceo", message: "Say hello briefly." } });
  t.check("chat answers through FreeLLMAPI 'auto' route", r1.status === 200 && r1.json?.text?.includes("FreeLLMAPI auto ok"));

  const biz = businessIdOf(USER);
  const usageRows = db.prepare("SELECT provider, model, input_tokens, output_tokens FROM ai_usage WHERE business_id = ?").all(biz);
  t.check(
    "usage meter records provider='freellmapi', model, and token counts",
    usageRows.length === 1 && usageRows[0].provider === "freellmapi" && usageRows[0].model === "qwen3.8-27b" && usageRows[0].input_tokens === 15 && usageRows[0].output_tokens === 9
  );

  // 2. When 'auto' returns 429 rate-limit, router queries /v1/models and falls through to a healthy model
  await setMode("auto_429_fallback");
  const r2 = await call("/api/ai/chat", { method: "POST", cookie, body: { agentId: "cfo", message: "Check cash flow." } });
  t.check("429 on 'auto' automatically discovers /v1/models and succeeds on healthy model", r2.status === 200 && r2.json?.text?.includes("FreeLLMAPI fallback ok"));

  // 3. When 'auto' returns 404 (unsupported), router queries /v1/models and succeeds
  await setMode("auto_404_fallback");
  const r3 = await call("/api/ai/chat", { method: "POST", cookie, body: { agentId: "sales", message: "Top deal focus?" } });
  t.check("404 on 'auto' discovers /v1/models and succeeds", r3.status === 200 && r3.json?.text?.includes("FreeLLMAPI fallback ok"));
} catch (err) {
  t.check("test run", false, `${err?.stack || err} cause=${err?.cause?.message || err?.cause || ""}`);
} finally {
  cleanup();
}

process.exit(t.done() ? 0 : 1);
