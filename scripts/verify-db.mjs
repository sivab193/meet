// Dev-only verification: runs migrations/001_init.sql against an in-memory
// PGlite (real Postgres, WASM build) and exercises the exact SQL the API
// routes use: seed rows, the atomic overlap-checked booking insert, cancel,
// override upsert, and rate-limit counting.
// Usage: npm run db:verify   (no DATABASE_URL needed)
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "..", "migrations");

function splitStatements(sql) {
  return sql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => (s.endsWith(";") ? s : s + ";"));
}

let failures = 0;
function check(name, cond) {
  console.log(`${cond ? "ok  " : "FAIL"} ${name}`);
  if (!cond) failures++;
}

async function main() {
  const db = new PGlite();
  try {
    const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
    for (const file of files) {
      const text = readFileSync(join(migrationsDir, file), "utf8");
      for (const stmt of splitStatements(text)) await db.query(stmt);
    }
    check("migration applies", true);

    const tables = await db.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    const names = tables.rows.map((r) => r.table_name);
    for (const t of ["settings", "date_overrides", "bookings", "rate_limits"]) {
      check(`table ${t} exists`, names.includes(t));
    }

    const settings = await db.query("SELECT key, value FROM settings ORDER BY key");
    const byKey = Object.fromEntries(settings.rows.map((r) => [r.key, r.value]));
    check("weekly_hours seeded (Mon-Fri 09:00-17:00)", Array.isArray(byKey.weekly_hours) && byKey.weekly_hours.length === 5);
    check("event_types seeded (call, 15/30/60)", Array.isArray(byKey.event_types) && byKey.event_types[0].id === "call");
    check("min_notice_minutes seeded as 60", byKey.min_notice_minutes === 60);

    // Atomic overlap-checked insert (same SQL shape as POST /api/book).
    const insertSql = `INSERT INTO bookings (event_type, start_utc, end_utc, booker_name, booker_email, notes, cancel_token)
      SELECT $1, $2, $3, $4, $5, $6, $7
      WHERE NOT EXISTS (
        SELECT 1 FROM bookings
        WHERE status = 'confirmed' AND start_utc < $3 AND end_utc > $2
      ) RETURNING id`;
    const first = await db.query(insertSql, [
      "call", "2026-11-02T14:00:00Z", "2026-11-02T14:30:00Z",
      "Test Person", "test@example.com", null, "token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    ]);
    check("first booking inserts", first.rows.length === 1);

    const overlap = await db.query(insertSql, [
      "call", "2026-11-02T14:15:00Z", "2026-11-02T14:45:00Z",
      "Someone Else", "other@example.com", null, "token-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    ]);
    check("overlapping booking rejected (0 rows)", overlap.rows.length === 0);

    const adjacent = await db.query(insertSql, [
      "call", "2026-11-02T14:30:00Z", "2026-11-02T15:00:00Z",
      "Next Person", "next@example.com", null, "token-cccccccccccccccccccccccccccccccc",
    ]);
    check("adjacent (touching) booking inserts", adjacent.rows.length === 1);

    // Cancel by token.
    const cancelled = await db.query(
      "UPDATE bookings SET status = 'cancelled' WHERE cancel_token = $1 AND status = 'confirmed' RETURNING id",
      ["token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"]
    );
    check("cancel by token updates 1 row", cancelled.rows.length === 1);
    const cancelledAgain = await db.query(
      "UPDATE bookings SET status = 'cancelled' WHERE cancel_token = $1 AND status = 'confirmed' RETURNING id",
      ["token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"]
    );
    check("re-cancel of cancelled booking updates 0 rows", cancelledAgain.rows.length === 0);

    // Override upsert by date (unique index on date).
    await db.query(
      "INSERT INTO date_overrides (date, start_time, end_time, is_unavailable) VALUES ($1, $2, $3, $4) " +
        "ON CONFLICT (date) DO UPDATE SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time, is_unavailable = EXCLUDED.is_unavailable",
      ["2026-12-25", null, null, true]
    );
    await db.query(
      "INSERT INTO date_overrides (date, start_time, end_time, is_unavailable) VALUES ($1, $2, $3, $4) " +
        "ON CONFLICT (date) DO UPDATE SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time, is_unavailable = EXCLUDED.is_unavailable",
      ["2026-12-25", "10:00", "12:00", false]
    );
    const ov = await db.query("SELECT * FROM date_overrides WHERE date = $1", ["2026-12-25"]);
    check("override upsert replaces row (1 row, 10:00-12:00)", ov.rows.length === 1 && ov.rows[0].start_time === "10:00:00");

    // Rate-limit counting.
    for (let i = 0; i < 3; i++) {
      await db.query("INSERT INTO rate_limits (ip, endpoint) VALUES ($1, $2)", ["1.2.3.4", "/api/book"]);
    }
    const rl = await db.query(
      "SELECT COUNT(*)::int AS n FROM rate_limits WHERE ip = $1 AND endpoint = $2 AND created_at > $3::timestamptz",
      ["1.2.3.4", "/api/book", new Date(Date.now() - 3600_000).toISOString()]
    );
    check("rate-limit count reads back 3", rl.rows[0].n === 3);
  } finally {
    await db.close();
  }
  console.log(failures === 0 ? "db:verify passed." : `db:verify FAILED (${failures} checks).`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("db:verify crashed:", err);
  process.exit(1);
});
