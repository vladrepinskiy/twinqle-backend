import { Kysely, Selectable } from "kysely";
import { sql } from "kysely";
import type { DB, Orders } from "../types/database";
import { createOrderSchema, type CreateOrderInput } from "../schemas/orders";
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
        status: "creating_shipment",
        carrier_shipment_id: null,
        label_pdf_base64: null,
      } as any)
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
    const updateData: any = {
      ...input,
      has_updates: true,
      updated_at: sql`now()`,
    };

    const order = await this.db
      .updateTable("orders")
      .set(updateData)
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
