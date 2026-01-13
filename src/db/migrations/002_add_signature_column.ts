import { Kysely } from "kysely";

export const up = async (db: Kysely<any>): Promise<void> => {
  await db.schema
    .alterTable("orders")
    .addColumn("signature_png_base64", "text")
    .execute();
};

export const down = async (db: Kysely<any>): Promise<void> => {
  await db.schema
    .alterTable("orders")
    .dropColumn("signature_png_base64")
    .execute();
};
