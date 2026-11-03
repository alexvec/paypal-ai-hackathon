import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { PayPalCredentials } from "./config";
import { HttpError } from "./errors";

/**
 * Stateless proof of two facts, keyed from the PayPal client secret so no new secret or database is
 * needed: this app created the order (a signature in the order's PayPal custom_id, which only this
 * server can write), and this browser created it (an owner hash from an HttpOnly cookie).
 */
const keyFor = (credentials: PayPalCredentials, purpose: string) => createHmac("sha256", credentials.clientSecret).update(`refund-referee/${purpose}/v1`).digest();
const sign = (credentials: PayPalCredentials, purpose: string, payload: string) => createHmac("sha256", keyFor(credentials, purpose)).update(payload).digest("base64url");

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export const newOwnerSecret = () => randomBytes(32).toString("base64url");

export const ownerHash = (credentials: PayPalCredentials, ownerSecret: string) => sign(credentials, "owner", ownerSecret).slice(0, 22);

export function orderCustomId(credentials: PayPalCredentials, owner: string): string {
  return `rr1.${owner}.${sign(credentials, "order", owner).slice(0, 32)}`;
}

/** The owner hash if this custom_id was written by this app, else null. */
export function readOrderCustomId(credentials: PayPalCredentials, customId: string | undefined): string | null {
  const [version, owner, signature] = (customId ?? "").split(".");
  if (version !== "rr1" || !owner || !signature) return null;
  return safeEqual(signature, sign(credentials, "order", owner).slice(0, 32)) ? owner : null;
}

/** What the owner saw and approved. Code computed every number. The browser can read it, not change it. */
export type Approval = {
  nonce: string;
  orderId: string;
  captureId: string;
  owner: string;
  amountCents: number;
  currency: string;
  lines: Record<string, number>;
  includesShipping: boolean;
  clauseId: string;
  expiresAt: number;
};

export function issueApproval(credentials: PayPalCredentials, approval: Approval): string {
  const payload = Buffer.from(JSON.stringify(approval)).toString("base64url");
  return `${payload}.${sign(credentials, "approval", payload)}`;
}

export function readApproval(credentials: PayPalCredentials, token: string, now = Date.now()): Approval {
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !safeEqual(signature, sign(credentials, "approval", payload))) {
    throw new HttpError(403, "APPROVAL_INVALID", "This approval was not issued by this server for this amount.");
  }
  const approval = JSON.parse(Buffer.from(payload, "base64url").toString()) as Approval;
  if (approval.expiresAt <= now) throw new HttpError(409, "APPROVAL_EXPIRED", "This proposal has expired. Read the message again to get a fresh one.");
  return approval;
}

/** Written to the refund's custom_id, so PayPal's own record says which units a refund covered. */
export function refundMarker(approval: Pick<Approval, "nonce" | "lines" | "includesShipping">): string {
  const lines = Object.entries(approval.lines).map(([sku, units]) => `${sku}:${units}`).join(",");
  return `rr1|${approval.nonce}|${lines}|${approval.includesShipping ? "ship" : "noship"}`;
}

export function readRefundMarker(customId: string | undefined): { nonce: string; lines: Record<string, number>; includesShipping: boolean } | null {
  const parts = (customId ?? "").split("|");
  if (parts.length !== 4 || parts[0] !== "rr1") return null;
  const lines: Record<string, number> = {};
  for (const pair of parts[2].split(",").filter(Boolean)) {
    const [sku, units] = pair.split(":");
    if (!sku || !/^\d+$/.test(units ?? "")) return null;
    lines[sku] = Number(units);
  }
  return { nonce: parts[1], lines, includesShipping: parts[3] === "ship" };
}
