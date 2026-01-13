import { z } from "zod";

export const orderStatusSchema = z.enum([
  "creating_shipment",
  "creation_unknown",
  "created",
  "confirming",
  "confirmation_unknown",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "failed",
  "needs_attention",
]);

export const createOrderSchema = z.object({
  merchant_reference: z.string().min(1),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;
