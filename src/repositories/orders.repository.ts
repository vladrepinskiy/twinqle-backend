import { Kysely, Selectable } from "kysely";
import { sql } from "kysely";
import type { DB, Orders } from "../types/database";
import {
  createOrderSchema,
  type CreateOrderInput,
  type ShipmentStatus,
} from "../schemas/orders";
import type { Repository } from "./abstract.repository";

type OrderEntity = Selectable<Orders>;

export class OrdersRepository implements Repository<
  OrderEntity,
  CreateOrderInput,
  Partial<CreateOrderInput>
> {
  constructor(private db: Kysely<DB>) {}

  private generateBarcode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let barcode = "";
    for (let i = 0; i < 16; i++) {
      barcode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return barcode;
  }

  async create(input: CreateOrderInput): Promise<OrderEntity> {
    const body = createOrderSchema.parse(input);

    const order = await this.db
      .insertInto("orders")
      .values({
        merchant_reference: body.merchant_reference,
        carrier: "late_logistics",
        barcode: this.generateBarcode(),
        shipment_status: "pending_creation",
        // Recipient fields
        recipient_name: body.recipient.name,
        recipient_address1: body.recipient.address1,
        recipient_address2: body.recipient.address2 ?? null,
        recipient_postal_code: body.recipient.postal_code,
        recipient_city: body.recipient.city,
        recipient_country: body.recipient.country,
        // Parcel fields
        parcel_weight_grams: body.parcel.weight_grams,
        parcel_length_cm: String(body.parcel.length_cm),
        parcel_width_cm: String(body.parcel.width_cm),
        parcel_height_cm: String(body.parcel.height_cm),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return order;
  }

  async findById(id: string): Promise<OrderEntity | null> {
    const order = await this.db
      .selectFrom("orders")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    if (!order) {
      return null;
    }

    // Set has_updates to false when reading order
    if (order.has_updates) {
      await this.db
        .updateTable("orders")
        .set({ has_updates: false, updated_at: sql`now()` })
        .where("id", "=", id)
        .execute();

      return { ...order, has_updates: false };
    }

    return order;
  }

  async findByCarrierShipmentId(
    carrierShipmentId: string
  ): Promise<OrderEntity | null> {
    const order = await this.db
      .selectFrom("orders")
      .selectAll()
      .where("carrier_shipment_id", "=", carrierShipmentId)
      .executeTakeFirst();

    return order ?? null;
  }

  async findByBarcode(barcode: string): Promise<OrderEntity | null> {
    const order = await this.db
      .selectFrom("orders")
      .selectAll()
      .where("barcode", "=", barcode)
      .executeTakeFirst();

    return order ?? null;
  }

  async findAll(): Promise<OrderEntity[]> {
    const orders = await this.db
      .selectFrom("orders")
      .selectAll()
      .orderBy("created_at", "desc")
      .execute();

    return orders;
  }

  async update(
    id: string,
    input: Partial<CreateOrderInput>
  ): Promise<OrderEntity> {
    const updateData: Record<string, unknown> = {
      has_updates: true,
      updated_at: sql`now()`,
    };

    if (input.merchant_reference) {
      updateData.merchant_reference = input.merchant_reference;
    }
    if (input.recipient) {
      if (input.recipient.name)
        updateData.recipient_name = input.recipient.name;
      if (input.recipient.address1)
        updateData.recipient_address1 = input.recipient.address1;
      if (input.recipient.address2 !== undefined)
        updateData.recipient_address2 = input.recipient.address2;
      if (input.recipient.postal_code)
        updateData.recipient_postal_code = input.recipient.postal_code;
      if (input.recipient.city)
        updateData.recipient_city = input.recipient.city;
      if (input.recipient.country)
        updateData.recipient_country = input.recipient.country;
    }
    if (input.parcel) {
      if (input.parcel.weight_grams)
        updateData.parcel_weight_grams = input.parcel.weight_grams;
      if (input.parcel.length_cm)
        updateData.parcel_length_cm = String(input.parcel.length_cm);
      if (input.parcel.width_cm)
        updateData.parcel_width_cm = String(input.parcel.width_cm);
      if (input.parcel.height_cm)
        updateData.parcel_height_cm = String(input.parcel.height_cm);
    }

    const order = await this.db
      .updateTable("orders")
      .set(updateData)
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return order;
  }

  async updateShipmentStatus(
    id: string,
    status: ShipmentStatus,
    reason?: string
  ): Promise<OrderEntity> {
    const updateData: Record<string, unknown> = {
      shipment_status: status,
      has_updates: true,
      updated_at: sql`now()`,
    };

    if (reason !== undefined) {
      updateData.shipment_status_reason = reason;
    }

    const order = await this.db
      .updateTable("orders")
      .set(updateData)
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return order;
  }

  async updateCarrierData(
    id: string,
    data: { carrier_shipment_id: string; tracking_code: string }
  ): Promise<OrderEntity> {
    const order = await this.db
      .updateTable("orders")
      .set({
        carrier_shipment_id: data.carrier_shipment_id,
        tracking_code: data.tracking_code,
        has_updates: true,
        updated_at: sql`now()`,
      })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return order;
  }

  async storeLabel(id: string, labelBase64: string): Promise<OrderEntity> {
    const order = await this.db
      .updateTable("orders")
      .set({
        label_pdf_base64: labelBase64,
        label_fetched_at: sql`now()`,
        shipment_status: "confirmed",
        has_updates: true,
        updated_at: sql`now()`,
      })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return order;
  }

  async markAsRead(id: string): Promise<OrderEntity> {
    const order = await this.db
      .updateTable("orders")
      .set({ has_updates: false, updated_at: sql`now()` })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return order;
  }
}
