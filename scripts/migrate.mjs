// Runs migrations/*.sql against the Neon database in DATABASE_URL.
// Usage: npm run db:migrate   (loads .env via `node --env-file=.env`)
// The Neon serverless HTTP driver executes one statement per call, so this
// script splits each file on statement boundaries. Keep one statement per
// block in the SQL files and no semicolons inside string literals.
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "..", "migrations");

function splitStatements(sql) {
  return sql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => (s.endsWith(";") ? s : s + ";"));
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
    process.exit(1);
  }
  const sql = neon(url);
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  if (files.length === 0) {
    console.log("No migration files found.");
    return;
  }
  for (const file of files) {
    const text = readFileSync(join(migrationsDir, file), "utf8");
    const statements = splitStatements(text);
    console.log(`${file}: ${statements.length} statements`);
    for (const stmt of statements) {
      await sql.query(stmt, []);
    }
    console.log(`  applied ${file}`);
  }
  console.log("Migrations complete.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
