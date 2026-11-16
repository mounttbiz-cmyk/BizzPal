// Shared helpers for the integration tests. They talk to a RUNNING app (default http://localhost:3000)
// and clean up everything they create. Run them against a local copy only, never against live data.
import { createHmac } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const BASE = process.env.BASE_URL || "http://localhost:3000";

/** Reads KEY=value lines from .env */
export function loadEnv() {
  const file = path.join(ROOT, ".env");
  if (!existsSync(file)) return {};
  const values = {};
  for (const raw of readFileSync(file, "utf8").split("\n")) {
    const line = raw.replace(/\r$/, "");
    const i = line.indexOf("=");
    if (i > 0 && /^[A-Z0-9_]+$/.test(line.slice(0, i))) {
      values[line.slice(0, i)] = line.slice(i + 1).replace(/^"|"$/g, "");
    }
  }
  return values;
}
const env = loadEnv();

export function openDatabase() {
  const dir = process.env.BIZZPAL_DATA_DIR || env.BIZZPAL_DATA_DIR || path.join(ROOT, "data");
  return new DatabaseSync(path.join(dir, "bizzpal.db"));
}

/** Makes a session cookie value exactly like the server does, so tests can act as a signed-in customer. */
export function sessionToken(email, ttlSeconds = 3600) {
  const key = env.SECRETS_KEY || env.ADMIN_SESSION_SECRET || env.SUPERADMIN_PASSCODE;
  if (!key) throw new Error("Set ADMIN_SESSION_SECRET (or SECRETS_KEY) in .env so the tests can sign sessions.");
  const payload = Buffer.from(JSON.stringify({ sub: email, exp: Math.floor(Date.now() / 1000) + ttlSeconds })).toString("base64url");
  return payload + "." + createHmac("sha256", "user-session-v1:" + key).update(payload).digest("base64url");
}

export const businessIdOf = email => "biz_" + email.replace(/[^a-zA-Z0-9]/g, "_");

export async function call(pathname, { method = "GET", body, cookie } = {}) {
  const res = await fetch(BASE + pathname, {
    method,
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: `bizzpal_user_token=${cookie}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  const setCookie = res.headers.get("set-cookie") || "";
  const m = /bizzpal_user_token=([^;]*)/.exec(setCookie);
  return { status: res.status, json, setCookie, cookie: m ? decodeURIComponent(m[1]) : null };
}

export function reporter() {
  let pass = 0;
  let fail = 0;
  return {
    check(name, ok, extra = "") {
      ok ? pass++ : fail++;
      console.log((ok ? "PASS " : "FAIL ") + name + (extra ? "  " + extra : ""));
    },
    done() {
      console.log("\n" + pass + " passed, " + fail + " failed");
      return fail === 0;
    },
  };
}
