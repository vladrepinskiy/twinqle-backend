import type {
  CreateShipmentParams,
  CreateShipmentResponse,
  GetLabelResponse,
} from "../types/carrier.types";

// Implement this interface when adding a new carrier

export interface CarrierClient {
  createShipment(params: CreateShipmentParams): Promise<CreateShipmentResponse>;

  getLabel(shipmentId: string): Promise<GetLabelResponse>;
}
