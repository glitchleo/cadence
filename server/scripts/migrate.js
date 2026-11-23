import path from "node:path";
import { runner } from "node-pg-migrate";
import { env } from "../src/config/env.js";

const direction = process.argv[2];
const allowedDirections = new Set(["up", "down", "redo"]);

if (!allowedDirections.has(direction)) {
  console.error(
    "Usage: node --env-file=.env scripts/migrate.js <up|down|redo> [--dry-run] [count]",
  );
  process.exit(1);
}

const extraArgs = process.argv.slice(3);
const dryRun = extraArgs.includes("--dry-run");
const countArg = extraArgs.find((arg) => /^\d+$/.test(arg));
const count = countArg ? Number(countArg) : direction === "up" ? undefined : 1;

const migrationsDir = path.resolve(import.meta.dirname, "../migrations");

try {
  await runner({
    databaseUrl: env.DATABASE_URL,
    dir: migrationsDir,
    migrationsTable: "pgmigrations",
    direction,
    count,
    dryRun,
    checkOrder: true,
    singleTransaction: true,
    verbose: true,
  });
} catch (err) {
  console.error("Migration failed:", err);
  process.exit(1);
}
