// Makes a safe copy of the BizzPal database and keeps the 14 most recent copies.
//   node scripts/backup-db.mjs
// Uses the same folder rules as the app: BIZZPAL_DATA_DIR if set, otherwise ./data
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const dataDir = process.env.BIZZPAL_DATA_DIR ? path.resolve(process.env.BIZZPAL_DATA_DIR) : path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "bizzpal.db");
const backupDir = path.join(dataDir, "backups");
const KEEP = 14;

if (!fs.existsSync(dbPath)) {
  console.error(`No database found at ${dbPath}`);
  process.exit(1);
}
fs.mkdirSync(backupDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const target = path.join(backupDir, `bizzpal-${stamp}.db`);

// VACUUM INTO writes a consistent copy even while the app is running
const db = new DatabaseSync(dbPath);
db.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
db.close();

const old = fs.readdirSync(backupDir).filter(f => /^bizzpal-.*\.db$/.test(f)).sort().reverse().slice(KEEP);
for (const f of old) fs.unlinkSync(path.join(backupDir, f));

console.log(`Backup written: ${target} (${(fs.statSync(target).size / 1024).toFixed(0)} KB). Kept ${Math.min(KEEP, fs.readdirSync(backupDir).length)} copies.`);
