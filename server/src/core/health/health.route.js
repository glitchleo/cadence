import { checkDbHealth } from "../../config/db.js";

export function createHealthHandler(dbHealthCheck = checkDbHealth) {
  return async function healthCheckHandler(req, res) {
    try {
      const db = await dbHealthCheck();

      return res.status(200).json({
        success: true,
        data: {
          status: "ok",
          database: db.status,
          latencyMs: db.latencyMs,
          uptimeSeconds: Math.floor(process.uptime()),
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id ?? null,
        },
      });
    } catch (err) {
      req.log?.error({ err }, "Health check failed: PostgreSQL unreachable");

      return res.status(503).json({
        success: false,
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "Database health check failed",
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.id ?? null,
        },
      });
    }
  };
}
