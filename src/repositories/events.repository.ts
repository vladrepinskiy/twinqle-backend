import { Kysely } from "kysely";
import type { DB } from "../types/database";

export interface CreateEventInput {
  event_id: string;
  order_id: string;
  status: string;
  occurred_at: Date;
  raw_payload: Record<string, unknown>;
}

export class EventsRepository {
  constructor(private db: Kysely<DB>) {}

  /**
   * Create an event record. Returns true if inserted, false if duplicate (idempotency).
   */
  async create(input: CreateEventInput): Promise<boolean> {
    try {
      await this.db
        .insertInto("events")
        .values({
          event_id: input.event_id,
          order_id: input.order_id,
          status: input.status,
          occurred_at: input.occurred_at,
          raw_payload: JSON.stringify(input.raw_payload),
        })
        .execute();
      return true;
    } catch (error: unknown) {
      // Check for unique constraint violation (duplicate event_id)
      if (
        error instanceof Error &&
        error.message.includes("duplicate key value")
      ) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Find all events for an order (for audit trail).
   */
  async findByOrderId(orderId: string) {
    return this.db
      .selectFrom("events")
      .selectAll()
      .where("order_id", "=", orderId)
      .orderBy("occurred_at", "asc")
      .execute();
  }
}
