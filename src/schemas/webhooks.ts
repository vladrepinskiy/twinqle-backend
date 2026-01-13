import { z } from "zod";

export const lateLogisticsWebhookSchema = z.object({
  event_id: z.string(),
  shipment_id: z.string(),
  barcode: z.string(),
  status: z.enum([
    "created",
    "confirmed",
    "in_transit",
    "out_for_delivery",
    "delivered",
    "failed",
  ]),
  occurred_at: z.string(),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
    })
    .optional(),
  failedReason: z.string().optional(),
  data: z
    .object({
      signature_png_base64: z.string(),
    })
    .optional(),
});

export type LateLogisticsWebhookPayload = z.infer<
  typeof lateLogisticsWebhookSchema
>;
