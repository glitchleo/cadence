import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { query, closeDbPool } from "../src/config/db.js";

describe("SQL Migrations (server/migrations/)", () => {
  after(async () => {
    await closeDbPool();
  });

  it("creates the pgmigrations tracking table with at least one applied migration", async () => {
    const res = await query(
      `SELECT name, run_on FROM pgmigrations ORDER BY run_on ASC`,
    );
    assert.ok(res.rows.length >= 1, "Expected at least 1 applied migration");
    assert.match(res.rows[0].name, /init-database-foundation/);
  });

  it("installs the pgcrypto extension", async () => {
    const res = await query(
      `SELECT extname FROM pg_extension WHERE extname = 'pgcrypto'`,
    );
    assert.equal(res.rows.length, 1);
  });

  it("installs the reusable set_updated_at() trigger function", async () => {
    const res = await query(
      `SELECT proname FROM pg_proc WHERE proname = 'set_updated_at'`,
    );
    assert.equal(res.rows.length, 1);
  });
});
