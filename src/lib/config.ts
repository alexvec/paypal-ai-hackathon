import { NotConnectedError } from "./errors";

export type Env = Record<string, string | undefined>;

/**
 * The only PayPal host this app talks to. It is a constant on purpose: no environment variable,
 * header or request field can point the app at live PayPal.
 */
export const PAYPAL_SANDBOX_BASE_URL = "https://api-m.sandbox.paypal.com";

/** Return URLs on the deployment are fixed, so a forged Host header cannot redirect a buyer. */
export const PRODUCTION_ORIGIN = "https://paypal-ai-hackathon-phi.vercel.app";

/** The model this entry is built on. LLM_MODEL may carry it, with or without the gateway/ prefix. */
export const DEFAULT_MODEL = "deepseek/deepseek-v4.1-flash";

const read = (env: Env, key: string) => env[key]?.trim() || "";

export type PayPalCredentials = { clientId: string; clientSecret: string };

export function missingPayPalVariables(env: Env = process.env): string[] {
  return ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET"].filter((key) => !read(env, key));
}

export function paypalCredentials(env: Env = process.env): PayPalCredentials {
  const missing = missingPayPalVariables(env);
  if (missing.length) throw new NotConnectedError("PayPal sandbox", missing);
  return { clientId: read(env, "PAYPAL_CLIENT_ID"), clientSecret: read(env, "PAYPAL_CLIENT_SECRET") };
}

/** The AI SDK gateway client reads AI_GATEWAY_API_KEY itself, else a pulled VERCEL_OIDC_TOKEN. */
export function missingModelVariables(env: Env = process.env): string[] {
  return read(env, "AI_GATEWAY_API_KEY") || read(env, "VERCEL_OIDC_TOKEN") ? [] : ["AI_GATEWAY_API_KEY"];
}

export function gatewayModelId(env: Env = process.env): string {
  return (read(env, "LLM_MODEL") || DEFAULT_MODEL).replace(/^gateway\//, "");
}

export function originFor(request: Request, env: Env = process.env): string {
  return read(env, "VERCEL_ENV") === "production" ? PRODUCTION_ORIGIN : new URL(request.url).origin;
}

/** Variable names only. Safe to send to the browser. */
export function connectionStatus(env: Env = process.env) {
  const paypalMissing = missingPayPalVariables(env);
  const modelMissing = missingModelVariables(env);
  return {
    paypal: {
      connected: paypalMissing.length === 0,
      missing: paypalMissing,
      environment: "sandbox" as const,
      message: paypalMissing.length ? new NotConnectedError("PayPal sandbox", paypalMissing).message : null,
    },
    model: {
      connected: modelMissing.length === 0,
      missing: modelMissing,
      id: `gateway/${gatewayModelId(env)}`,
      message: modelMissing.length ? new NotConnectedError("Model", modelMissing).message : null,
    },
  };
}

export type ConnectionStatus = ReturnType<typeof connectionStatus>;

/** Removes configured secret values from text that may reach a client or a log. */
export function redactSecrets(text: string, env: Env = process.env): string {
  let out = text;
  for (const key of ["PAYPAL_CLIENT_SECRET", "PAYPAL_CLIENT_ID", "AI_GATEWAY_API_KEY", "VERCEL_OIDC_TOKEN"]) {
    const secret = read(env, key);
    if (secret) out = out.split(secret).join("[redacted]");
  }
  return out.replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, "Bearer [redacted]");
}
