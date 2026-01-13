/**
 * Custom error for timeout scenarios.
 * Allows distinguishing timeouts from other errors.
 */
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}
