import { TimeoutError } from "../errors/timeout.error";

export const fetchWithOptions = async (
  url: string,
  options: RequestInit,
  timeoutMs: number,
  retries = 0,
  retryDelayMs = 1000
): Promise<Response> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      // Always throw timeout errors immediately - never retry
      if (error instanceof Error && error.name === "AbortError") {
        throw new TimeoutError(`Request timed out after ${timeoutMs}ms`);
      }

      // For non-timeout errors, store and potentially retry
      lastError = error instanceof Error ? error : new Error(String(error));

      // Retry on non-timeout errors if attempts remain (with exponential backoff)
      if (attempt < retries) {
        const delay = retryDelayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Request failed");
};
