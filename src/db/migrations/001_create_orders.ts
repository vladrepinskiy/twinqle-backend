import { Kysely, sql } from "kysely";

export const up = async (db: Kysely<any>): Promise<void> => {
  await db.schema
    .createTable("orders")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn("merchant_reference", "text", (col) => col.notNull())
    .addColumn("carrier", "text", (col) => col.notNull())
    .addColumn("barcode", "text", (col) => col.notNull().unique())
    .addColumn("carrier_shipment_id", "text", (col) => col.unique())
    .addColumn("status", "text", (col) => col.notNull())
    .addColumn("label_pdf_base64", "text")
    .addColumn("has_updates", "boolean", (col) =>
      col.notNull().defaultTo(false)
    )
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addColumn("updated_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute();

  await db.schema
    .createIndex("orders_merchant_reference_idx")
    .on("orders")
    .column("merchant_reference")
    .execute();

  await db.schema
    .createIndex("orders_carrier_idx")
    .on("orders")
    .column("carrier")
    .execute();

  await db.schema
    .createIndex("orders_status_idx")
    .on("orders")
    .column("status")
    .execute();

  await db.schema
    .createIndex("orders_created_at_idx")
    .on("orders")
    .column("created_at")
    .execute();
};

export const down = async (db: Kysely<any>): Promise<void> => {
  await db.schema.dropTable("orders").execute();
};
