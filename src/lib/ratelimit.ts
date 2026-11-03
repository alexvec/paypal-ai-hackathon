import { HttpError } from "./errors";

const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 30;
const hits = new Map<string, number[]>();

/**
 * Best effort, per serverless instance. It slows casual abuse of a paid LLM key on a public URL.
 * It is not a spending limit. Set one with the LLM provider too.
 */
export function limitLiveModelCalls(request: Request, now = Date.now()): void {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) {
    throw new HttpError(429, "RATE_LIMITED", "Too many AI requests from this address. Try again in a few minutes.");
  }
  recent.push(now);
  hits.set(ip, recent);
}
