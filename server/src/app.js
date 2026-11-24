import express from "express";
import { env } from "./config/env.js";

export function createApp(options = {}) {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", options.trustProxy ?? env.TRUST_PROXY);
  app.set("etag", "strong");

  app.get("/api/v1/status", (req, res) => {
    res.status(200).json({
      status: "ok",
      service: "cadence-api",
      environment: env.NODE_ENV,
    });
  });

  if (options.router) {
    app.use("/api/v1", options.router);
  }

  return app;
}
