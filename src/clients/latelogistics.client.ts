import type {
  CreateShipmentParams,
  CreateShipmentResponse,
  GetLabelResponse,
} from "../types/carrier.types";
import { mapToLateLogisticsRequest } from "../utils/mapper.utils";
import { fetchWithOptions } from "../utils/network.utils";
import type { CarrierClient } from "./abstract.client";

const SHIPMENT_CREATION_TIMEOUT_MS = 65000;
const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_RETRIES = 2;

export class LateLogisticsClient implements CarrierClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
  }

  async createShipment(
    params: CreateShipmentParams
  ): Promise<CreateShipmentResponse> {
    const response = await fetchWithOptions(
      `${this.baseUrl}/v1/shipments`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(mapToLateLogisticsRequest(params)),
      },
      SHIPMENT_CREATION_TIMEOUT_MS,
      DEFAULT_RETRIES
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Late Logistics API error: ${response.status} - ${errorText}`
      );
    }

    return response.json() as Promise<CreateShipmentResponse>;
  }

  async getLabel(shipmentId: string): Promise<GetLabelResponse> {
    const response = await fetchWithOptions(
      `${this.baseUrl}/v1/shipments/${shipmentId}/label`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
      },
      DEFAULT_TIMEOUT_MS,
      DEFAULT_RETRIES,
      1000
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Late Logistics API error: ${response.status} - ${errorText}`
      );
    }

    return response.json() as Promise<GetLabelResponse>;
  }
}
