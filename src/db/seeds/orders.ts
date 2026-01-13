import { Kysely } from "kysely";
import type { DB } from "../../types/database";

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

  const sampleOrders = [
    {
      merchant_reference: "ORD-001",
      carrier: "late_logistics",
      barcode: "BC001234567",
      status: "creating_shipment" as const,
      carrier_shipment_id: null,
      label_pdf_base64: null,
      has_updates: false,
    },
    {
      merchant_reference: "ORD-002",
      carrier: "late_logistics",
      barcode: "BC002345678",
      status: "created" as const,
      carrier_shipment_id: "SHIP-001",
      label_pdf_base64: samplePdfBase64,
      has_updates: true,
    },
    {
      merchant_reference: "ORD-003",
      carrier: "late_logistics",
      barcode: "BC003456789",
      status: "in_transit" as const,
      carrier_shipment_id: "SHIP-002",
      label_pdf_base64: samplePdfBase64,
      has_updates: false,
    },
    {
      merchant_reference: "ORD-004",
      carrier: "late_logistics",
      barcode: "BC004567890",
      status: "delivered" as const,
      carrier_shipment_id: "SHIP-003",
      label_pdf_base64: samplePdfBase64,
      has_updates: false,
    },
    {
      merchant_reference: "ORD-005",
      carrier: "late_logistics",
      barcode: "BC005678901",
      status: "needs_attention" as const,
      carrier_shipment_id: "SHIP-004",
      label_pdf_base64: null,
      has_updates: true,
    },
  ];

  await db.insertInto("orders").values(sampleOrders).execute();
  console.log(`Inserted ${sampleOrders.length} sample orders`);
};
