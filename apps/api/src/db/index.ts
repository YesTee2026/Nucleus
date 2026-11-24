import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? "postgresql://nucleus:nucleus@localhost:5432/nucleus",
});

export const db = drizzle(pool, { schema });
export type Database = typeof db;
