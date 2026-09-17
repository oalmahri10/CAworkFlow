import { execSync } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
import path from "node:path";

/**
 * Runs once before the whole test suite: creates a fresh, isolated SQLite
 * database file for tests (never the developer's real prisma/dev.db) and
 * pushes the current schema to it. Torn down afterwards.
 */
export default async function globalSetup() {
  const dbPath = path.resolve(__dirname, "../prisma/test.db");
  if (existsSync(dbPath)) unlinkSync(dbPath);

  execSync("npx prisma db push --skip-generate --accept-data-loss --force-reset", {
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
    stdio: "inherit",
  });

  return async () => {
    if (existsSync(dbPath)) unlinkSync(dbPath);
    const journal = `${dbPath}-journal`;
    if (existsSync(journal)) unlinkSync(journal);
  };
}
