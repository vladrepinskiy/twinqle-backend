import type { ColumnType } from "kysely";

export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;

export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export interface KyselyMigrations {
  name: string;
  timestamp: Generated<Timestamp>;
}

export interface Orders {
  barcode: string;
  carrier: string;
  carrier_shipment_id: string | null;
  created_at: Generated<Timestamp>;
  has_updates: Generated<boolean>;
  id: Generated<string>;
  label_pdf_base64: string | null;
  merchant_reference: string;
  status: string;
  updated_at: Generated<Timestamp>;
}

export interface DB {
  kysely_migrations: KyselyMigrations;
  orders: Orders;
}
