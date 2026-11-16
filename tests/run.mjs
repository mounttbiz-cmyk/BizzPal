// Runs every *.test.mjs in this folder against a running app and exits non-zero if any check fails.
//   npm run dev        (or npm start)   in one terminal
//   npm run test:security               in another
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const files = readdirSync(dir).filter(f => f.endsWith(".test.mjs")).sort();
let failed = 0;
for (const f of files) {
  console.log(`\n=== ${f} ===`);
  const r = spawnSync(process.execPath, [path.join(dir, f)], { stdio: "inherit" });
  if (r.status !== 0) failed++;
}
console.log(failed ? `\n${failed} test file(s) failed` : "\nAll test files passed");
process.exit(failed ? 1 : 0);
