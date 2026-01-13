import type { CarrierClient } from "../clients/abstract.client";
import { TimeoutError } from "../errors/timeout.error";
import { OrdersRepository } from "../repositories/orders.repository";

export class ShipmentService {
  constructor(
    private ordersRepository: OrdersRepository,
    private carrierClient: CarrierClient,
    private webhookBaseUrl: string,
    private logger: {
      warn: (msg: string, meta?: object) => void;
      error: (msg: string, meta?: object) => void;
    }
  ) {}

  // This is called async after order creation (fire-and-forget)
  async initiateShipmentCreation(orderId: string): Promise<void> {
    const order = await this.ordersRepository.findById(orderId);
    if (!order) {
      this.logger.error("Order not found for shipment creation", { orderId });
      return;
    }

    // Update status to creation_in_flight
    await this.ordersRepository.updateShipmentStatus(
      orderId,
      "creation_in_flight"
    );

    try {
      // Always await - this is our only chance to get tracking_code
      const response = await this.carrierClient.createShipment({
        reference: order.id,
        barcode: order.barcode,
        webhookUrl: `${this.webhookBaseUrl}/webhooks/late-logistics`,
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

      // Success - persist carrier data immediately
      await this.ordersRepository.updateCarrierData(orderId, {
        carrier_shipment_id: response.shipment_id,
        tracking_code: response.tracking_code,
      });

      // Status will transition via webhook (created -> confirming -> confirmed)
    } catch (error) {
      if (error instanceof TimeoutError) {
        // Timeout - leave as creation_in_flight, wait for webhook
        // Carrier may still succeed, webhook will reconcile
        this.logger.warn("Shipment creation timed out", { orderId });
      } else {
        // Actual error - mark as failed
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        await this.ordersRepository.updateShipmentStatus(
          orderId,
          "failed",
          errorMessage
        );
        this.logger.error("Shipment creation failed", {
          orderId,
          error: errorMessage,
        });
      }
    }
  }

  // Called when we receive a 'created' webhook event
  async fetchAndStoreLabel(orderId: string): Promise<void> {
    const order = await this.ordersRepository.findById(orderId);
    if (!order) {
      this.logger.error("Order not found for label fetch", { orderId });
      return;
    }

    if (!order.carrier_shipment_id) {
      this.logger.error("No carrier_shipment_id for label fetch", { orderId });
      return;
    }

    // Update status to confirming
    await this.ordersRepository.updateShipmentStatus(orderId, "confirming");

    try {
      const labelResponse = await this.carrierClient.getLabel(
        order.carrier_shipment_id
      );

      // Store label and set status to confirmed
      await this.ordersRepository.storeLabel(
        orderId,
        labelResponse.label_pdf_base64
      );
    } catch (error) {
      // Label fetch failed - leave status as confirming for retry
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Label fetch failed", { orderId, error: errorMessage });
    }
  }
}
