import { neon } from "@neondatabase/serverless";

let sql: ReturnType<typeof neon> | null = null;

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getSql() {
  if (!sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    sql = neon(url);
  }
  return sql;
}

/**
 * Run a parameterized query and return the rows typed as T[].
 * (The driver's `query<T>()` generic is the array-mode flag, not the row
 * type, so row typing has to happen here with a cast.)
 */
export async function queryRows<T>(sqlText: string, params: unknown[]): Promise<T[]> {
  const rows = await getSql().query(sqlText, params as never[]);
  return rows as unknown as T[];
}
