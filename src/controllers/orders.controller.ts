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

  constructor(
    db: Kysely<DB>,
    logger: FastifyBaseLogger,
    config: {
      webhookBaseUrl: string;
      lateLogisticsApiUrl: string;
      lateLogisticsApiKey: string;
    }
  ) {
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
}
