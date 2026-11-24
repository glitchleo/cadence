import { describe, it } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { createApp } from "../src/app.js";

describe("Express App Factory (src/app.js)", () => {
  it("responds 200 OK on GET /api/v1/status without binding a fixed port", async () => {
    const app = createApp();
    const res = await request(app).get("/api/v1/status");

    assert.equal(res.status, 200);
    assert.equal(res.body.status, "ok");
    assert.equal(res.body.service, "cadence-api");
  });

  it("hides the X-Powered-By Express fingerprint header", async () => {
    const app = createApp();
    const res = await request(app).get("/api/v1/status");

    assert.equal(res.headers["x-powered-by"], undefined);
  });

  it("creates isolated app instances that accept injected test routers", async () => {
    const testRouter = express.Router();
    testRouter.get("/isolated-ping", (req, res) => {
      res.status(200).json({ ping: "pong" });
    });

    const appWithRouter = createApp({ router: testRouter });
    const plainApp = createApp();

    const resA = await request(appWithRouter).get("/api/v1/isolated-ping");
    const resB = await request(plainApp).get("/api/v1/isolated-ping");

    assert.equal(resA.status, 200);
    assert.equal(resA.body.ping, "pong");
    assert.equal(resB.status, 404);
  });

  it("runs multiple app instances concurrently without EADDRINUSE port conflicts", async () => {
    const appA = createApp();
    const appB = createApp();

    const [resA, resB] = await Promise.all([
      request(appA).get("/api/v1/status"),
      request(appB).get("/api/v1/status"),
    ]);

    assert.equal(resA.status, 200);
    assert.equal(resB.status, 200);
  });
});
