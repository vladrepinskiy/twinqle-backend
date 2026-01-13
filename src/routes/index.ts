import { FastifyInstance } from "fastify";
import { orderRoutes } from "./orders";
import { webhookRoutes } from "./webhooks";

export const registerRoutes = async (fastify: FastifyInstance) => {
  await fastify.register(orderRoutes, { prefix: "/orders" });
  await fastify.register(webhookRoutes, { prefix: "/webhooks" });
};
