import { FastifyRequest, FastifyReply, FastifyBaseLogger } from "fastify";
import { type Kysely } from "kysely";
import { type CreateOrderInput } from "../schemas/orders";
import { type DB } from "../types/database";
import { OrdersRepository } from "../repositories/orders.repository";
import { ShipmentService } from "../services/shipment.service";
import { LateLogisticsClient } from "../clients/latelogistics.client";

interface OrderParams {
  id: string;
}

export class OrdersController {
  private ordersRepository: OrdersRepository;
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

  createOrder = async (
    request: FastifyRequest<{ Body: CreateOrderInput }>,
    reply: FastifyReply
  ) => {
    const order = await this.ordersRepository.create(request.body);

    this.logger.info(
      {
        orderId: order.id,
        merchantReference: order.merchant_reference,
        barcode: order.barcode,
      },
      "Order created, initiating shipment creation"
    );

    reply.code(201).send(order);

    // Fire-and-forget after response sent
    setImmediate(() => {
      this.shipmentService.initiateShipmentCreation(order.id);
    });
  };

  getOrderById = async (
    request: FastifyRequest<{ Params: OrderParams }>,
    reply: FastifyReply
  ) => {
    const { id } = request.params;
    const order = await this.ordersRepository.findById(id);

    if (!order) {
      return reply.code(404).send({ error: "Order not found" });
    }

    return order;
  };

  listOrders = async () => {
    const orders = await this.ordersRepository.findAll();
    return orders;
  };

  markOrderAsRead = async (
    request: FastifyRequest<{ Params: OrderParams }>,
    reply: FastifyReply
  ) => {
    const { id } = request.params;
    try {
      const order = await this.ordersRepository.markAsRead(id);
      return order;
    } catch (error) {
      return reply.code(404).send({ error: "Order not found" });
    }
  };

  retryShipment = async (
    request: FastifyRequest<{ Params: OrderParams }>,
    reply: FastifyReply
  ) => {
    const { id } = request.params;
    const order = await this.ordersRepository.findById(id);

    if (!order) {
      return reply.code(404).send({ error: "Order not found" });
    }

    // Only allow retry for stuck or failed orders
    const retryableStatuses = [
      "pending_creation",
      "creation_in_flight",
      "failed",
    ];
    if (!retryableStatuses.includes(order.shipment_status)) {
      return reply.code(400).send({
        error: "Cannot retry shipment",
        message: `Order is in '${order.shipment_status}' status. Retry is only allowed for: ${retryableStatuses.join(", ")}`,
      });
    }

    this.logger.info(
      {
        orderId: order.id,
        previousStatus: order.shipment_status,
        barcode: order.barcode,
      },
      "Retrying shipment creation"
    );

    // Reset status to pending_creation before retrying
    await this.ordersRepository.resetForRetry(id);

    reply.code(202).send({
      message: "Shipment retry initiated",
      orderId: order.id,
    });

    // Fire-and-forget after response sent
    setImmediate(() => {
      this.shipmentService.initiateShipmentCreation(order.id);
    });
  };
}
