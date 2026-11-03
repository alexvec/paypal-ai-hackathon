import { HttpError } from "./errors";

type Rule = { limit: number; windowMs: number };

const MINUTE = 60_000;
export const RULES = {
  /** Public model routes spend Alex's money. Both rules apply to every model call. */
  modelPerAddress: { limit: 5, windowMs: 10 * MINUTE },
  modelPerInstance: { limit: 40, windowMs: 60 * MINUTE },
  ordersPerAddress: { limit: 6, windowMs: 60 * MINUTE },
  ordersPerInstance: { limit: 60, windowMs: 60 * MINUTE },
  paypalPerAddress: { limit: 40, windowMs: 10 * MINUTE },
  refundsPerAddress: { limit: 10, windowMs: 60 * MINUTE },
} satisfies Record<string, Rule>;

const hits = new Map<string, number[]>();

export function clientAddress(request: Request): string {
  const forwarded = request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

/**
 * Best effort: memory is per serverless instance and resets on a cold start. It slows abuse on a
 * public URL. It is not a spending limit.
 */
export function enforce(bucket: string, rule: Rule, now = Date.now()): void {
  const recent = (hits.get(bucket) ?? []).filter((at) => now - at < rule.windowMs);
  if (recent.length >= rule.limit) {
    hits.set(bucket, recent);
    throw new HttpError(429, "RATE_LIMITED", "Too many requests. Try again in a few minutes.");
  }
  recent.push(now);
  hits.set(bucket, recent);
}

export function limitModelCall(request: Request, now = Date.now()): void {
  enforce(`model:${clientAddress(request)}`, RULES.modelPerAddress, now);
  enforce("model:*", RULES.modelPerInstance, now);
}

export function limitOrderCreate(request: Request, now = Date.now()): void {
  enforce(`orders:${clientAddress(request)}`, RULES.ordersPerAddress, now);
  enforce("orders:*", RULES.ordersPerInstance, now);
}

export function limitPayPalRead(request: Request, now = Date.now()): void {
  enforce(`paypal:${clientAddress(request)}`, RULES.paypalPerAddress, now);
}

export function limitRefund(request: Request, now = Date.now()): void {
  enforce(`refunds:${clientAddress(request)}`, RULES.refundsPerAddress, now);
}

const dayTotals = new Map<string, number>();

/** Same limit as above: per instance. PayPal's remaining balance and the per-case cap always apply too. */
export function dailyRefundedCents(now = Date.now()): number {
  return dayTotals.get(new Date(now).toISOString().slice(0, 10)) ?? 0;
}

export function addDailyRefund(amountCents: number, now = Date.now()): void {
  const day = new Date(now).toISOString().slice(0, 10);
  dayTotals.set(day, (dayTotals.get(day) ?? 0) + amountCents);
}

export function resetLimits(): void {
  hits.clear();
  dayTotals.clear();
}
