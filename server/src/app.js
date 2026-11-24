import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { checkDbHealth } from "./config/db.js";
import { requestIdTracer } from "./core/middleware/request-id.js";
import { pinoHttpLogger } from "./core/logger.js";
import { createHealthHandler } from "./core/health/health.route.js";
import { corsMiddleware } from "./core/middleware/cors.js";

export function createApp({ dbHealthCheck = checkDbHealth, router } = {}) {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", env.TRUST_PROXY);

  app.use(requestIdTracer);
  app.use(pinoHttpLogger);
  app.use(helmet());
  app.use(corsMiddleware);
  app.use(express.json({ limit: env.BODY_LIMIT }));

  const healthHandler = createHealthHandler(dbHealthCheck);
  app.get("/api/v1/health", healthHandler);

  if (router) {
    app.use("/api/v1", router);
  }

  return app;
}
