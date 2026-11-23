import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { env, parseEnv } from "../src/config/env.js";
import { checkDbHealth, closeDbPool, query } from "../src/config/db.js";

describe("Environment Validation (config/env.js)", () => {
  const validBase = {
    DATABASE_URL:
      "postgresql://cadence:cadence_dev_pass@localhost:5432/cadence_dev",
  };

  it("applies safe defaults when optional variables are omitted", () => {
    const result = parseEnv(validBase);
    assert.equal(result.ok, true);
    assert.equal(result.data.NODE_ENV, "development");
    assert.equal(result.data.PORT, 3000);
    assert.equal(result.data.TRUST_PROXY, false);
    assert.deepEqual(result.data.CORS_ORIGINS, ["http://localhost:5173"]);
  });

  it('converts TRUST_PROXY string "false" to real boolean false', () => {
    const result = parseEnv({ ...validBase, TRUST_PROXY: "false" });
    assert.equal(result.ok, true);
    assert.strictEqual(result.data.TRUST_PROXY, false);
  });

  it("splits, trims, and freezes multiple CORS_ORIGINS", () => {
    const result = parseEnv({
      ...validBase,
      CORS_ORIGINS: "http://localhost:5173, https://cadence.app , ",
    });
    assert.equal(result.ok, true);
    assert.deepEqual(result.data.CORS_ORIGINS, [
      "http://localhost:5173",
      "https://cadence.app",
    ]);
    assert.throws(() => {
      result.data.CORS_ORIGINS.push("http://evil.com");
    }, TypeError);
  });

  it("fails fast and lists multiple invalid variables at once", () => {
    const result = parseEnv({
      PORT: "99999",
      BODY_LIMIT: "banana",
      DATABASE_URL: "https://not-postgres.com",
    });
    assert.equal(result.ok, false);
    assert.match(result.errorMessage, /PORT/);
    assert.match(result.errorMessage, /BODY_LIMIT/);
    assert.match(result.errorMessage, /DATABASE_URL/);
  });

  it("exports a frozen runtime env object", () => {
    assert.equal(Object.isFrozen(env), true);
    assert.throws(() => {
      env.PORT = 9999;
    }, TypeError);
  });
});

describe("PostgreSQL Connection Pool (config/db.js)", () => {
  after(async () => {
    await closeDbPool();
  });

  it("passes SELECT 1 health check against Docker Postgres", async () => {
    const health = await checkDbHealth();
    assert.equal(health.status, "connected");
    assert.equal(typeof health.latencyMs, "number");
  });

  it("executes parameterized SQL queries cleanly", async () => {
    const res = await query("SELECT $1::int + $2::int AS sum", [2, 3]);
    assert.equal(res.rows[0].sum, 5);
  });
});
