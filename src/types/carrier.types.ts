// Common carrier client types for all shipping carriers.

export interface CreateShipmentParams {
  reference: string;
  barcode: string;
  webhookUrl: string;
  recipient: {
    name: string;
    address1: string;
    address2?: string;
    postal_code: string;
    city: string;
    country: string;
  };
  parcel: {
    weight_grams: number;
    length_cm: number;
    width_cm: number;
    height_cm: number;
  };
}

export interface CreateShipmentResponse {
  shipment_id: string;
  tracking_code: string;
  barcode: string;
}

export interface GetLabelResponse {
  shipment_id: string;
  label_pdf_base64: string;
  content_type: string;
}
