import type { CreateShipmentParams } from "../types/carrier.types";

export const mapToLateLogisticsRequest = (params: CreateShipmentParams) => ({
  reference: params.reference,
  webhook_url: params.webhookUrl,
  barcode: params.barcode,
  recipient: {
    name: params.recipient.name,
    address1: params.recipient.address1,
    address2: params.recipient.address2,
    postal_code: params.recipient.postal_code,
    city: params.recipient.city,
    country: params.recipient.country,
  },
  parcel: {
    weight_grams: params.parcel.weight_grams,
    length_cm: params.parcel.length_cm,
    width_cm: params.parcel.width_cm,
    height_cm: params.parcel.height_cm,
  },
});
