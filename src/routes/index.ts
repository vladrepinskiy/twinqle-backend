import { FastifyInstance } from "fastify";
import { orderRoutes } from "./orders";

export const registerRoutes = async (fastify: FastifyInstance) => {
  await fastify.register(orderRoutes, { prefix: "/orders" });
};
