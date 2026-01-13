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

    this.logger.info(
      {
        eventId: payload.event_id,
        shipmentId: payload.shipment_id,
        barcode: payload.barcode,
        status: payload.status,
        occurredAt: payload.occurred_at,
      },
      "Webhook received from Late Logistics"
    );

    // Find order by carrier_shipment_id first, fallback to barcode
    let order = await this.ordersRepository.findByCarrierShipmentId(
      payload.shipment_id
    );
    const foundByShipmentId = !!order;

    if (!order) {
      order = await this.ordersRepository.findByBarcode(payload.barcode);
    }

    if (!order) {
      this.logger.warn(
        { shipmentId: payload.shipment_id, barcode: payload.barcode },
        "Order not found for webhook - no matching order in database"
      );
      return reply.code(200).send({ error: "Order not found" });
    }

    this.logger.info(
      {
        orderId: order.id,
        foundByShipmentId,
        currentStatus: order.shipment_status,
        newStatus: payload.status,
      },
      "Order found for webhook"
    );

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
        { eventId: payload.event_id, orderId: order.id },
        "Duplicate webhook event ignored"
      );
      return reply.code(200).send({ status: "duplicate" });
    }

    // Handle status-specific logic
    if (payload.status === "created") {
      // Update carrier data FIRST if missing (timeout recovery case)
      // This must happen before triggering label fetch to avoid race condition
      if (!order.carrier_shipment_id) {
        this.logger.info(
          { orderId: order.id, shipmentId: payload.shipment_id },
          "Updating carrier data from webhook (timeout recovery)"
        );
        await this.ordersRepository.updateCarrierData(order.id, {
          carrier_shipment_id: payload.shipment_id,
          tracking_code: order.tracking_code || payload.barcode,
        });
      }

      this.logger.info(
        { orderId: order.id },
        "Triggering label fetch after created webhook"
      );

      // Fetch label to confirm the shipment
      // Fire and forget - don't block webhook response
      setImmediate(() => {
        this.shipmentService.fetchAndStoreLabel(order.id);
      });
      // Don't update status here - fetchAndStoreLabel will handle it
      return reply.code(200).send({ status: "accepted" });
    }

    // For non-created events, update carrier data if missing
    if (!order.carrier_shipment_id) {
      this.logger.info(
        { orderId: order.id, shipmentId: payload.shipment_id },
        "Updating carrier data from webhook (was missing)"
      );
      await this.ordersRepository.updateCarrierData(order.id, {
        carrier_shipment_id: payload.shipment_id,
        tracking_code: order.tracking_code || payload.barcode,
      });
    }

    if (payload.status === "failed") {
      this.logger.info(
        { orderId: order.id, failedReason: payload.failedReason },
        "Updating order status to failed"
      );
      await this.ordersRepository.updateShipmentStatus(
        order.id,
        "failed",
        payload.failedReason
      );
      return reply.code(200).send({ status: "accepted" });
    }

    // For other statuses (confirmed, in_transit, out_for_delivery, delivered)
    const { transitionApplied } =
      await this.ordersRepository.updateShipmentStatus(
        order.id,
        payload.status
      );

    if (transitionApplied) {
      this.logger.info(
        {
          orderId: order.id,
          fromStatus: order.shipment_status,
          toStatus: payload.status,
        },
        "Order status updated"
      );
    } else {
      this.logger.warn(
        {
          orderId: order.id,
          currentStatus: order.shipment_status,
          attemptedStatus: payload.status,
        },
        "Status transition skipped - invalid transition (out of order webhook?)"
      );
    }

    // Store signature for delivered events
    if (payload.status === "delivered" && payload.data?.signature_png_base64) {
      this.logger.info({ orderId: order.id }, "Storing delivery signature");
      await this.ordersRepository.storeSignature(
        order.id,
        payload.data.signature_png_base64
      );
    }

    return reply.code(200).send({ status: "accepted" });
  };
}
