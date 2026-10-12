import pLimit from "p-limit";
import pRetry, { AbortError } from "p-retry";

export interface BatchOptions {
  concurrency?: number;
  retries?: number;
  minTimeout?: number;
  maxTimeout?: number;
}

export function isRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("429") || message.includes("RATELIMIT_EXCEEDED") ||
    message.toLowerCase().includes("quota") || message.toLowerCase().includes("rate limit");
}

export async function batchProcess<T, R>(
  items: T[], processor: (item: T, index: number) => Promise<R>, options: BatchOptions = {},
): Promise<R[]> {
  const { concurrency = 2, retries = 7, minTimeout = 2000, maxTimeout = 128000 } = options;
  const limit = pLimit(concurrency);
  return Promise.all(items.map((item, index) => limit(() => pRetry(async () => {
    try { return await processor(item, index); }
    catch (error) {
      if (isRateLimitError(error)) throw error;
      throw new AbortError(error instanceof Error ? error : new Error(String(error)));
    }
  }, { retries, minTimeout, maxTimeout, factor: 2 }))));
}
