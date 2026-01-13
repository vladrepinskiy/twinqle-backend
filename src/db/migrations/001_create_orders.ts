import { Kysely, sql } from "kysely";

export const up = async (db: Kysely<any>): Promise<void> => {
  // Create orders table
  await db.schema
    .createTable("orders")
    // Core fields
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn("merchant_reference", "text", (col) => col.notNull())
    .addColumn("carrier", "text", (col) => col.notNull())
    .addColumn("barcode", "text", (col) => col.notNull().unique())
    .addColumn("carrier_shipment_id", "text", (col) => col.unique())
    .addColumn("tracking_code", "text")
    // Recipient fields
    .addColumn("recipient_name", "text", (col) => col.notNull())
    .addColumn("recipient_address1", "text", (col) => col.notNull())
    .addColumn("recipient_address2", "text")
    .addColumn("recipient_postal_code", "text", (col) => col.notNull())
    .addColumn("recipient_city", "text", (col) => col.notNull())
    .addColumn("recipient_country", "text", (col) => col.notNull())
    // Parcel fields
    .addColumn("parcel_weight_grams", "integer", (col) => col.notNull())
    .addColumn("parcel_length_cm", "numeric", (col) => col.notNull())
    .addColumn("parcel_width_cm", "numeric", (col) => col.notNull())
    .addColumn("parcel_height_cm", "numeric", (col) => col.notNull())
    // Shipment lifecycle
    .addColumn("shipment_status", "text", (col) => col.notNull())
    .addColumn("shipment_status_reason", "text")
    // Label
    .addColumn("label_pdf_base64", "text")
    .addColumn("label_fetched_at", "timestamptz")
    // Metadata
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

  // Create indexes for orders
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
    .createIndex("orders_shipment_status_idx")
    .on("orders")
    .column("shipment_status")
    .execute();

  await db.schema
    .createIndex("orders_created_at_idx")
    .on("orders")
    .column("created_at")
    .execute();

  await db.schema
    .createIndex("orders_barcode_idx")
    .on("orders")
    .column("barcode")
    .execute();

  // Create events table
  await db.schema
    .createTable("events")
    .addColumn("event_id", "text", (col) => col.primaryKey())
    .addColumn("order_id", "uuid", (col) =>
      col.notNull().references("orders.id")
    )
    .addColumn("status", "text", (col) => col.notNull())
    .addColumn("occurred_at", "timestamptz", (col) => col.notNull())
    .addColumn("raw_payload", "jsonb", (col) => col.notNull())
    .addColumn("received_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute();

  // Create index for events lookup by order
  await db.schema
    .createIndex("events_order_id_idx")
    .on("events")
    .column("order_id")
    .execute();
};

export const down = async (db: Kysely<any>): Promise<void> => {
  await db.schema.dropTable("events").execute();
  await db.schema.dropTable("orders").execute();
};
