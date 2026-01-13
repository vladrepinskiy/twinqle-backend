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
  carrier: z.string().min(1),
  barcode: z.string().min(1),
  status: orderStatusSchema,
  carrier_shipment_id: z.string().optional(),
  label_pdf_base64: z.string().optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;
