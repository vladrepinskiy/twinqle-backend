import type { CarrierClient } from "../clients/abstract.client";
import { TimeoutError } from "../errors/timeout.error";
import { OrdersRepository } from "../repositories/orders.repository";

export class ShipmentService {
  constructor(
    private ordersRepository: OrdersRepository,
    private carrierClient: CarrierClient,
    private webhookBaseUrl: string,
    private logger: {
      info: (meta: object, msg: string) => void;
      warn: (meta: object, msg: string) => void;
      error: (meta: object, msg: string) => void;
    }
  ) {}

  // This is called async after order creation (fire-and-forget)
  async initiateShipmentCreation(orderId: string): Promise<void> {
    const order = await this.ordersRepository.findById(orderId);
    if (!order) {
      this.logger.error({ orderId }, "Order not found for shipment creation");
      return;
    }

    const webhookUrl = `${this.webhookBaseUrl}/webhooks/late-logistics`;

    this.logger.info(
      { orderId, barcode: order.barcode, webhookUrl },
      "Starting shipment creation with carrier"
    );

    // Update status to creation_in_flight
    await this.ordersRepository.updateShipmentStatus(
      orderId,
      "creation_in_flight"
    );

    const startTime = Date.now();

    try {
      // Always await - this is our only chance to get tracking_code
      const response = await this.carrierClient.createShipment({
        reference: order.id,
        barcode: order.barcode,
        webhookUrl,
        recipient: {
          name: order.recipient_name,
          address1: order.recipient_address1,
          address2: order.recipient_address2 ?? undefined,
          postal_code: order.recipient_postal_code,
          city: order.recipient_city,
          country: order.recipient_country,
        },
        parcel: {
          weight_grams: order.parcel_weight_grams,
          length_cm: Number(order.parcel_length_cm),
          width_cm: Number(order.parcel_width_cm),
          height_cm: Number(order.parcel_height_cm),
        },
      });

      const durationMs = Date.now() - startTime;

      this.logger.info(
        {
          orderId,
          carrierShipmentId: response.shipment_id,
          trackingCode: response.tracking_code,
          durationMs,
        },
        "Shipment created successfully with carrier"
      );

      // Success - persist carrier data immediately
      await this.ordersRepository.updateCarrierData(orderId, {
        carrier_shipment_id: response.shipment_id,
        tracking_code: response.tracking_code,
      });

      // Status will transition via webhook (created -> confirming -> confirmed)
    } catch (error) {
      const durationMs = Date.now() - startTime;

      if (error instanceof TimeoutError) {
        // Timeout - leave as creation_in_flight, wait for webhook
        // Carrier may still succeed, webhook will reconcile
        this.logger.warn(
          { orderId, durationMs },
          "Shipment creation timed out - waiting for webhook to reconcile"
        );
      } else {
        // Actual error - mark as failed
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        await this.ordersRepository.updateShipmentStatus(
          orderId,
          "failed",
          errorMessage
        );
        this.logger.error(
          { orderId, error: errorMessage, durationMs },
          "Shipment creation failed"
        );
      }
    }
  }

  // Called when we receive a 'created' webhook event
  async fetchAndStoreLabel(orderId: string): Promise<void> {
    const order = await this.ordersRepository.findById(orderId);
    if (!order) {
      this.logger.error({ orderId }, "Order not found for label fetch");
      return;
    }

    if (!order.carrier_shipment_id) {
      this.logger.error(
        { orderId, barcode: order.barcode },
        "No carrier_shipment_id for label fetch - cannot proceed"
      );
      return;
    }

    this.logger.info(
      { orderId, carrierShipmentId: order.carrier_shipment_id },
      "Fetching label from carrier"
    );

    // Update status to confirming
    await this.ordersRepository.updateShipmentStatus(orderId, "confirming");

    const startTime = Date.now();

    try {
      const labelResponse = await this.carrierClient.getLabel(
        order.carrier_shipment_id
      );

      const durationMs = Date.now() - startTime;

      // Store label and set status to confirmed
      await this.ordersRepository.storeLabel(
        orderId,
        labelResponse.label_pdf_base64
      );

      this.logger.info(
        { orderId, durationMs },
        "Label fetched and stored successfully"
      );
    } catch (error) {
      const durationMs = Date.now() - startTime;
      // Label fetch failed - leave status as confirming for retry
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        { orderId, error: errorMessage, durationMs },
        "Label fetch failed"
      );
    }
  }
}
