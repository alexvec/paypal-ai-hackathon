import { resolvePayPalMode, type Env } from "../config";
import { mockGateway } from "./mock";
import { createToolkitGateway } from "./toolkit";
import type { PayPalGateway } from "./types";

/** Keys present means the real toolkit path. A real failure never falls back to the mock. */
export function getGateway(env: Env = process.env): PayPalGateway {
  const mode = resolvePayPalMode(env);
  return mode.mode === "sandbox" ? createToolkitGateway(mode) : mockGateway;
}

export { PayPalError } from "./types";
export type { PayPalGateway } from "./types";
