import pg from "pg";
import { env } from "./env.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (err) => {
  console.error("Unexpected idle PostgreSQL client error:", err);
});

export async function query(text, params) {
  return pool.query(text, params);
}

export async function checkDbHealth() {
  const start = performance.now();
  await pool.query("SELECT 1");
  const latencyMs = Math.round((performance.now() - start) * 100) / 100;
  return { status: "connected", latencyMs };
}

export async function closeDbPool() {
  await pool.end();
}
