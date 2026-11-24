import cors from "cors";
import { env } from "../../config/env.js";

export const corsMiddleware = cors({
  origin(requestOrigin, callback) {
    if (!requestOrigin) {
      return callback(null, true);
    }

    if (env.CORS_ORIGINS.includes(requestOrigin)) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
  exposedHeaders: ["X-Request-Id"],
  maxAge: 86_400,
});
