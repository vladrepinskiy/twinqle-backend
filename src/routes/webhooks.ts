import { FastifyInstance } from "fastify";
import { db } from "../config/database";
import { type LateLogisticsWebhookPayload } from "../schemas/webhooks";
import { WebhooksController } from "../controllers/webhooks.controller";

export const webhookRoutes = async (fastify: FastifyInstance) => {
  const webhooksController = new WebhooksController(db, fastify.log, {
    webhookBaseUrl: process.env.WEBHOOK_BASE_URL || "",
    lateLogisticsApiUrl: process.env.LATE_LOGISTICS_API_URL || "",
    lateLogisticsApiKey: process.env.LATE_LOGISTICS_API_KEY || "",
  });

  fastify.post<{ Body: LateLogisticsWebhookPayload }>(
    "/late-logistics",
    webhooksController.handleLateLogisticsWebhook
  );
};
