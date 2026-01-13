import type { ColumnType } from "kysely";

export type Generated<T> =
  T extends ColumnType<infer S, infer I, infer U>
    ? ColumnType<S, I | undefined, U>
    : ColumnType<T, T | undefined, T>;

export type Json = ColumnType<JsonValue, string, string>;

export type JsonArray = JsonValue[];

export type JsonObject = {
  [K in string]?: JsonValue;
};

export type JsonPrimitive = boolean | number | string | null;

export type JsonValue = JsonArray | JsonObject | JsonPrimitive;

export type Numeric = ColumnType<string, number | string, number | string>;

export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export interface Events {
  event_id: string;
  occurred_at: Timestamp;
  order_id: string;
  raw_payload: Json;
  received_at: Generated<Timestamp>;
  status: string;
}

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
  label_fetched_at: Timestamp | null;
  label_pdf_base64: string | null;
  merchant_reference: string;
  parcel_height_cm: Numeric;
  parcel_length_cm: Numeric;
  parcel_weight_grams: number;
  parcel_width_cm: Numeric;
  recipient_address1: string;
  recipient_address2: string | null;
  recipient_city: string;
  recipient_country: string;
  recipient_name: string;
  recipient_postal_code: string;
  shipment_status: string;
  shipment_status_reason: string | null;
  signature_png_base64: string | null;
  tracking_code: string | null;
  updated_at: Generated<Timestamp>;
}

export interface DB {
  events: Events;
  kysely_migrations: KyselyMigrations;
  orders: Orders;
}
