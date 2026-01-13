import { FastifyInstance } from "fastify";
import { db } from "../config/database";
import { type CreateOrderInput } from "../schemas/orders";
import { OrdersController } from "../controllers/orders.controller";

interface OrderParams {
  id: string;
}

export const orderRoutes = async (fastify: FastifyInstance) => {
  const ordersController = new OrdersController(db, fastify.log, {
    webhookBaseUrl: process.env.WEBHOOK_BASE_URL || "",
    lateLogisticsApiUrl: process.env.LATE_LOGISTICS_API_URL || "",
    lateLogisticsApiKey: process.env.LATE_LOGISTICS_API_KEY || "",
  });

  // Create order
  fastify.post<{ Body: CreateOrderInput }>("/", ordersController.createOrder);

  // Get order by ID
  fastify.get<{ Params: OrderParams }>("/:id", ordersController.getOrderById);

  // List all orders
  fastify.get("/", ordersController.listOrders);

  // Mark order as read (reset has_updates to false)
  fastify.patch<{ Params: OrderParams }>(
    "/:id/mark-read",
    ordersController.markOrderAsRead
  );

  // Retry shipment creation for stuck/failed orders
  fastify.post<{ Params: OrderParams }>(
    "/:id/retry",
    ordersController.retryShipment
  );
};
