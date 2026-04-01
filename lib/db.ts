import "server-only";
import { Pool } from "pg";

declare global {
  var quizDbPool: Pool | undefined;
}

function getConnectionString() {
  return (
    process.env.DATABASE_URL ||
    (process.env.PGHOST &&
    process.env.PGUSER &&
    process.env.PGPASSWORD &&
    process.env.PGDATABASE
      ? [
          "postgresql://",
          encodeURIComponent(process.env.PGUSER),
          ":",
          encodeURIComponent(process.env.PGPASSWORD),
          "@",
          process.env.PGHOST,
          process.env.PGPORT || "5432",
          "/",
          process.env.PGDATABASE
        ].join("")
      : undefined)
  );
}

export function getPool() {
  const connectionString = getConnectionString();

  if (!connectionString) {
    throw new Error(
      "PostgreSQL is not configured. Set DATABASE_URL or PGHOST, PGUSER, PGPASSWORD, and PGDATABASE."
    );
  }

  if (!global.quizDbPool) {
    global.quizDbPool = new Pool({
      connectionString
    });
  }

  return global.quizDbPool;
}
