import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { db } from "../config/database";
import { type CreateOrderInput } from "../schemas/orders";
import { OrdersRepository } from "../repositories/orders.repository";

interface OrderParams {
  id: string;
}

export const orderRoutes = async (fastify: FastifyInstance) => {
  const ordersRepository = new OrdersRepository(db);

  // Create order
  fastify.post<{ Body: CreateOrderInput }>(
    "/",
    async (
      request: FastifyRequest<{ Body: CreateOrderInput }>,
      reply: FastifyReply
    ) => {
      const order = await ordersRepository.create(request.body);
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
      const order = await ordersRepository.findById(id);

      if (!order) {
        return reply.code(404).send({ error: "Order not found" });
      }

      return order;
    }
  );

  // List all orders
  fastify.get("/", async () => {
    const orders = await ordersRepository.findAll();
    return orders;
  });

  // Mark order as read (reset has_updates to false)
  fastify.patch<{ Params: OrderParams }>(
    "/:id/mark-read",
    async (
      request: FastifyRequest<{ Params: OrderParams }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;
      try {
        const order = await ordersRepository.markAsRead(id);
        return order;
      } catch (error) {
        return reply.code(404).send({ error: "Order not found" });
      }
    }
  );
};
