import { z } from "zod";

export const shipmentStatusSchema = z.enum([
  "pending_creation",
  "creation_in_flight",
  "created",
  "confirming",
  "confirmed",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "failed",
]);

export const recipientSchema = z.object({
  name: z.string().min(1),
  address1: z.string().min(1),
  address2: z.string().optional(),
  postal_code: z.string().min(1),
  city: z.string().min(1),
  country: z.string().min(1),
});

export const parcelSchema = z.object({
  weight_grams: z.number().int().min(1),
  length_cm: z.number().min(0.1),
  width_cm: z.number().min(0.1),
  height_cm: z.number().min(0.1),
});

export const createOrderSchema = z.object({
  merchant_reference: z.string().min(1),
  recipient: recipientSchema,
  parcel: parcelSchema,
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type ShipmentStatus = z.infer<typeof shipmentStatusSchema>;
export type Recipient = z.infer<typeof recipientSchema>;
export type Parcel = z.infer<typeof parcelSchema>;
