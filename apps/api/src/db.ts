import { Pool } from "pg";

const connectionName = process.env.INSTANCE_CONNECTION_NAME;

if (!connectionName && process.env.NODE_ENV !== "test") {
  throw new Error("INSTANCE_CONNECTION_NAME is not configured");
}

export const db = new Pool(
  connectionName
    ? {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        host: `/cloudsql/${connectionName}`,
      }
    : {
        // Vitest / local inject tests mock this Pool; connection is unused.
        connectionString: process.env.DATABASE_URL ?? "postgres://localhost/test",
      }
);
