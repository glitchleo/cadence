import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createApp } from "../src/app.js";
import { closeDbPool } from "../src/config/db.js";

function startTestServer(app) {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${port}`,
      });
    });
  });
}

function stopTestServer(server) {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

describe("Core Middleware Pipeline (src/app.js)", () => {
  let healthyServer;
  let healthyUrl;

  before(async () => {
    const app = createApp();
    app.post("/api/v1/echo", (req, res) => {
      res.status(200).json({ received: req.body, requestId: req.id });
    });

    const started = await startTestServer(app);
    healthyServer = started.server;
    healthyUrl = started.baseUrl;
  });

  after(async () => {
    await stopTestServer(healthyServer);
    await closeDbPool();
  });

  it("1. generates a valid UUID X-Request-Id and echoes valid incoming IDs", async () => {
    const autoRes = await fetch(`${healthyUrl}/api/v1/health`);
    const generatedId = autoRes.headers.get("x-request-id");
    assert.match(
      generatedId,
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );

    const customId = "trace-cadence-12345";
    const echoRes = await fetch(`${healthyUrl}/api/v1/health`, {
      headers: { "X-Request-Id": customId },
    });
    assert.equal(echoRes.headers.get("x-request-id"), customId);
  });

  it("2. returns 200 on GET /api/v1/health when Postgres SELECT 1 succeeds", async () => {
    const res = await fetch(`${healthyUrl}/api/v1/health`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.status, "ok");
    assert.equal(body.data.database, "connected");
    assert.equal(typeof body.data.latencyMs, "number");
    assert.equal(body.meta.requestId, res.headers.get("x-request-id"));
  });

  it("3. returns 503 on GET /api/v1/health when Postgres SELECT 1 fails", async () => {
    const brokenApp = createApp({
      dbHealthCheck: async () => {
        throw new Error("ECONNREFUSED");
      },
    });
    const { server, baseUrl } = await startTestServer(brokenApp);

    try {
      const res = await fetch(`${baseUrl}/api/v1/health`);
      assert.equal(res.status, 503);

      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.error.code, "SERVICE_UNAVAILABLE");
    } finally {
      await stopTestServer(server);
    }
  });

  it("4. sets Helmet security headers and removes X-Powered-By", async () => {
    const res = await fetch(`${healthyUrl}/api/v1/non-existent`, {
      headers: { Origin: "http://localhost:5173" },
    });
    assert.equal(res.headers.get("x-powered-by"), null);
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    assert.equal(res.headers.get("x-frame-options"), "SAMEORIGIN");
  });

  it("5. enforces strict CORS whitelist (allows localhost:5173, blocks others)", async () => {
    const allowedRes = await fetch(`${healthyUrl}/api/v1/health`, {
      headers: { Origin: "http://localhost:5173" },
    });
    assert.equal(
      allowedRes.headers.get("access-control-allow-origin"),
      "http://localhost:5173",
    );
    assert.equal(
      allowedRes.headers.get("access-control-allow-credentials"),
      "true",
    );
    assert.equal(
      allowedRes.headers.get("access-control-expose-headers"),
      "X-Request-Id",
    );

    const blockedRes = await fetch(`${healthyUrl}/api/v1/non-existent`, {
      headers: {
        Origin: "http://evil-site.example.com",
      },
    });
    assert.equal(blockedRes.headers.get("access-control-allow-origin"), null);
  });

  it("6. parses JSON within 10kb and rejects payloads larger than 10kb with 413", async () => {
    const smallRes = await fetch(`${healthyUrl}/api/v1/echo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Learn Express Middleware" }),
    });
    assert.equal(smallRes.status, 200);
    const smallBody = await smallRes.json();
    assert.equal(smallBody.received.title, "Learn Express Middleware");

    const oversizedPayload = JSON.stringify({ data: "x".repeat(12_000) });
    const largeRes = await fetch(`${healthyUrl}/api/v1/echo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: oversizedPayload,
    });
    assert.equal(largeRes.status, 413);
  });
});
