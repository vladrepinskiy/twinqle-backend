import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import type { DB } from "../types/database";

const dialect = new PostgresDialect({
  pool: new Pool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    database: process.env.DB_NAME || "twinqle",
    user: process.env.DB_USER || "twinqle",
    password: process.env.DB_PASSWORD || "twinqle_password",
    max: 10,
  }),
});

export const db = new Kysely<DB>({
  dialect,
});
