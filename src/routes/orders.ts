import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { db } from "../config/database";
import { createOrderSchema, type CreateOrderInput } from "../schemas/orders";
import { sql } from "kysely";

interface OrderParams {
  id: string;
}

export const orderRoutes = async (fastify: FastifyInstance) => {
  // Create order
  fastify.post<{ Body: CreateOrderInput }>(
    "/",
    async (
      request: FastifyRequest<{ Body: CreateOrderInput }>,
      reply: FastifyReply
    ) => {
      const body = createOrderSchema.parse(request.body);

      const order = await db
        .insertInto("orders")
        .values({
          merchant_reference: body.merchant_reference,
          carrier: body.carrier,
          barcode: body.barcode,
          status: body.status,
          carrier_shipment_id: body.carrier_shipment_id,
          label_pdf_base64: body.label_pdf_base64,
        } as any)
        .returningAll()
        .executeTakeFirstOrThrow();

      reply.code(201).send(order);
    }
  );

  // Get order by ID
  fastify.get<{ Params: OrderParams }>(
    "/:id",
    async (
      request: FastifyRequest<{ Params: OrderParams }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;

      const order = await db
        .selectFrom("orders")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();

      if (!order) {
        return reply.code(404).send({ error: "Order not found" });
      }

      // Set has_updates to false when reading order
      if (order.has_updates) {
        await db
          .updateTable("orders")
          .set({ has_updates: false, updated_at: sql`now()` })
          .where("id", "=", id)
          .execute();

        return { ...order, has_updates: false };
      }

      return order;
    }
  );

  // List all orders
  fastify.get("/", async () => {
    const orders = await db
      .selectFrom("orders")
      .selectAll()
      .orderBy("created_at", "desc")
      .execute();

    return orders;
  });
};
