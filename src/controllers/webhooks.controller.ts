import { FastifyRequest, FastifyReply, FastifyBaseLogger } from "fastify";
import { type Kysely } from "kysely";
import {
  lateLogisticsWebhookSchema,
  type LateLogisticsWebhookPayload,
} from "../schemas/webhooks";
import { type DB } from "../types/database";
import { OrdersRepository } from "../repositories/orders.repository";
import { EventsRepository } from "../repositories/events.repository";
import { ShipmentService } from "../services/shipment.service";
import { LateLogisticsClient } from "../clients/latelogistics.client";

export class WebhooksController {
  private ordersRepository: OrdersRepository;
  private eventsRepository: EventsRepository;
  private shipmentService: ShipmentService;
  private logger: FastifyBaseLogger;

  constructor(
    db: Kysely<DB>,
    logger: FastifyBaseLogger,
    config: {
      webhookBaseUrl: string;
      lateLogisticsApiUrl: string;
      lateLogisticsApiKey: string;
    }
  ) {
    this.logger = logger;
    this.ordersRepository = new OrdersRepository(db);
    this.eventsRepository = new EventsRepository(db);
    const lateLogisticsClient = new LateLogisticsClient(
      config.lateLogisticsApiUrl,
      config.lateLogisticsApiKey
    );
    this.shipmentService = new ShipmentService(
      this.ordersRepository,
      lateLogisticsClient,
      config.webhookBaseUrl,
      logger
    );
  }

  handleLateLogisticsWebhook = async (
    request: FastifyRequest<{ Body: LateLogisticsWebhookPayload }>,
    reply: FastifyReply
  ) => {
    let payload: LateLogisticsWebhookPayload;
    try {
      payload = lateLogisticsWebhookSchema.parse(request.body);
    } catch (error) {
      this.logger.error(
        { err: error, body: request.body },
        "Invalid webhook payload"
      );
      return reply.code(400).send({ error: "Invalid payload" });
    }

    // Find order by carrier_shipment_id first, fallback to barcode
    let order = await this.ordersRepository.findByCarrierShipmentId(
      payload.shipment_id
    );
    if (!order) {
      order = await this.ordersRepository.findByBarcode(payload.barcode);
    }

    if (!order) {
      this.logger.warn(
        { shipment_id: payload.shipment_id, barcode: payload.barcode },
        "Order not found for webhook"
      );
      return reply.code(200).send({ error: "Order not found" });
    }

    // Check for duplicate event (idempotency)
    const inserted = await this.eventsRepository.create({
      event_id: payload.event_id,
      order_id: order.id,
      status: payload.status,
      occurred_at: new Date(payload.occurred_at),
      raw_payload: payload as unknown as Record<string, unknown>,
    });

    if (!inserted) {
      this.logger.info(
        { event_id: payload.event_id },
        "Duplicate webhook event ignored"
      );
      return reply.code(200).send({ status: "duplicate" });
    }

    // If we don't have carrier_shipment_id yet (timeout case), update it now
    if (!order.carrier_shipment_id) {
      await this.ordersRepository.updateCarrierData(order.id, {
        carrier_shipment_id: payload.shipment_id,
        tracking_code: order.tracking_code || "", // May not have it if creation timed out
      });
    }

    // Handle status-specific logic
    if (payload.status === "created") {
      // Fetch label to confirm the shipment
      // Fire and forget - don't block webhook response
      setImmediate(() => {
        this.shipmentService.fetchAndStoreLabel(order.id);
      });
      // Don't update status here - fetchAndStoreLabel will handle it
      return reply.code(200).send({ status: "accepted" });
    }

    if (payload.status === "failed") {
      await this.ordersRepository.updateShipmentStatus(
        order.id,
        "failed",
        payload.failedReason
      );
      return reply.code(200).send({ status: "accepted" });
    }

    // For other statuses (confirmed, in_transit, out_for_delivery, delivered)
    await this.ordersRepository.updateShipmentStatus(order.id, payload.status);

    return reply.code(200).send({ status: "accepted" });
  };
}
