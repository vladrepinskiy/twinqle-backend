import { readdir } from "fs/promises";
import { join } from "path";
import { db } from "../config/database";
import { sql } from "kysely";

const runMigrations = async () => {
  try {
    await db.schema
      .createTable("kysely_migrations")
      .ifNotExists()
      .addColumn("name", "varchar(255)", (col) => col.primaryKey())
      .addColumn("timestamp", "timestamp", (col) =>
        col.notNull().defaultTo(sql`now()`)
      )
      .execute();

    const migrationsDir = join(__dirname, "migrations");
    const files = await readdir(migrationsDir);
    const migrationFiles = files
      .filter((file) => file.endsWith(".ts") && file !== "migrate.ts")
      .sort();

    for (const file of migrationFiles) {
      const migrationName = file.replace(".ts", "");

      // Check if migration already ran
      const existing = await db
        .selectFrom("kysely_migrations")
        .select("name")
        .where("name", "=", migrationName)
        .executeTakeFirst();

      if (existing) {
        console.log(`Migration ${migrationName} already applied, skipping...`);
        continue;
      }

      console.log(`Running migration: ${migrationName}`);
      const migration = await import(join(migrationsDir, file));

      if (typeof migration.up === "function") {
        await migration.up(db);
        await db
          .insertInto("kysely_migrations")
          .values({ name: migrationName })
          .execute();
        console.log(`✓ Migration ${migrationName} completed`);
      } else {
        console.error(
          `Migration ${migrationName} does not export an 'up' function`
        );
      }
    }

    console.log("All migrations completed successfully");
  } catch (error) {
    console.error("Migration error:", error);
    throw error;
  } finally {
    await db.destroy();
  }
};

runMigrations();
