import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  HOST: z
    .union([z.ipv4(), z.ipv6(), z.literal("localhost")])
    .default("0.0.0.0"),

  PORT: z.coerce
    .number()
    .int()
    .min(1, "PORT must be between 1 and 65535")
    .max(65535, "PORT must be between 1 and 65535")
    .default(3000),

  TRUST_PROXY: z
    .enum(["true", "false"])
    .default("false")
    .transform((val) => val === "true"),

  BODY_LIMIT: z
    .string()
    .regex(/^\d+(b|kb|mb|gb)$/i, "Must be a valid byte size (e.g., 10kb, 5mb)")
    .default("10kb"),

  CORS_ORIGINS: z
    .string()
    .default("http://localhost:5173")
    .transform((val) =>
      Object.freeze(
        val
          .split(",")
          .map((origin) => origin.trim())
          .filter(Boolean),
      ),
    ),

  DATABASE_URL: z
    .url("DATABASE_URL must be a valid URL")
    .refine(
      (val) => val.startsWith("postgres://") || val.startsWith("postgresql://"),
      "DATABASE_URL must use the postgres:// or postgresql:// protocol",
    ),

  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),

  SHUTDOWN_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive("SHUTDOWN_TIMEOUT_MS must be a positive number")
    .default(15000),
});

export function parseEnv(rawEnv = process.env) {
  const result = envSchema.safeParse(rawEnv);

  if (!result.success) {
    const formattedErrors = result.error.issues.map(
      (issue) => `  - ${issue.path.join(".") || "ENV"}: ${issue.message}`,
    );
    return {
      ok: false,
      errorMessage: `Invalid environment configuration:\n${formattedErrors.join("\n")}`,
    };
  }

  return {
    ok: true,
    data: Object.freeze(result.data),
  };
}

const parsed = parseEnv(process.env);

if (!parsed.ok) {
  console.error(parsed.errorMessage);
  process.exit(1);
}

export const env = parsed.data;
