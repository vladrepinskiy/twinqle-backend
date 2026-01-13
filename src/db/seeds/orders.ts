import { Kysely } from "kysely";
import { faker } from "@faker-js/faker";
import type { DB } from "../../types/database";

const generateBarcode = (): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let barcode = "";
  for (let i = 0; i < 16; i++) {
    barcode += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return barcode;
};

const shipmentStatuses = [
  "pending_creation",
  "creation_in_flight",
  "created",
  "confirming",
  "confirmed",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "failed",
] as const;

export const seed = async (db: Kysely<DB>) => {
  // Check if orders already exist
  const existingOrders = await db
    .selectFrom("orders")
    .select("id")
    .limit(1)
    .executeTakeFirst();

  if (existingOrders) {
    console.log("Orders already seeded, skipping...");
    return;
  }

  // Sample base64 encoded PDF (minimal valid PDF)
  const samplePdfBase64 =
    "JVBERi0xLjQKJdPr6eEKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovUmVzb3VyY2VzIDw8Ci9Gb250IDw8Ci9GMSA0IDAgUgo+Pgo+PgovQ29udGVudHMgNSAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL1R5cGUgL0ZvbnQKL1N1YnR5cGUgL1R5cGUxCi9CYXNlRm9udCAvSGVsdmV0aWNhCj4+CmVuZG9iago1IDAgb2JqCjw8Ci9MZW5ndGggNDQKPj4Kc3RyZWFtCkJUCi9GMSAxMiBUZgooVGVzdCBQREYpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE1IDAwMDAwIG4gCjAwMDAwMDAwNjAgMDAwMDAgbiAKMDAwMDAwMDEzMyAwMDAwMCBuIAowMDAwMDAwMjA3IDAwMDAwIG4gCjAwMDAwMDAzNzEgMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA2Ci9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgo0ODMKJSVFT0Y=";

  // Generate 10 sample orders with realistic data
  const sampleOrders = Array.from({ length: 10 }, (_, index) => {
    const status =
      shipmentStatuses[Math.floor(Math.random() * shipmentStatuses.length)];
    const hasLabel = [
      "confirmed",
      "in_transit",
      "out_for_delivery",
      "delivered",
    ].includes(status);
    const hasCarrierData = status !== "pending_creation";
    const hasFailed = status === "failed";

    return {
      merchant_reference: `ORD-${faker.string.alphanumeric(8).toUpperCase()}`,
      carrier: "late_logistics",
      barcode: generateBarcode(),
      shipment_status: status,
      carrier_shipment_id: hasCarrierData ? `shp_${faker.string.uuid()}` : null,
      tracking_code: hasCarrierData
        ? `TRK${faker.string.alphanumeric(9).toUpperCase()}`
        : null,
      // Recipient fields
      recipient_name: faker.person.fullName(),
      recipient_address1: faker.location.streetAddress(),
      recipient_address2:
        Math.random() > 0.5 ? faker.location.secondaryAddress() : null,
      recipient_postal_code: faker.location.zipCode(),
      recipient_city: faker.location.city(),
      recipient_country: faker.location.countryCode(),
      // Parcel fields
      parcel_weight_grams: faker.number.int({ min: 100, max: 5000 }),
      parcel_length_cm: String(faker.number.int({ min: 10, max: 100 })),
      parcel_width_cm: String(faker.number.int({ min: 10, max: 80 })),
      parcel_height_cm: String(faker.number.int({ min: 5, max: 60 })),
      // Shipment status
      shipment_status_reason: hasFailed
        ? faker.helpers.arrayElement([
            "Address not found",
            "Recipient not available",
            "Invalid postal code",
            "Package damaged",
          ])
        : null,
      // Label
      label_pdf_base64: hasLabel ? samplePdfBase64 : null,
      label_fetched_at: hasLabel ? faker.date.recent({ days: 7 }) : null,
      // Metadata
      has_updates: Math.random() > 0.7,
      created_at: faker.date.recent({ days: 30 }),
      updated_at: faker.date.recent({ days: 7 }),
    };
  });

  await db
    .insertInto("orders")
    .values(sampleOrders as any)
    .execute();
  console.log(
    `✅ Inserted ${sampleOrders.length} sample orders with realistic data`
  );
};
