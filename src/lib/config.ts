export type Env = Record<string, string | undefined>;

export const MOCK_PAYPAL_BANNER = "MOCK PayPal. No request was sent to PayPal. Invoice ids are fake.";
export const CANNED_MODEL_BANNER = "CANNED MODEL OUTPUT, not live AI.";
export const SANDBOX_BANNER = "PayPal SANDBOX";

/** Each default supports tool calling and image input. LLM_MODEL overrides. */
export const DEFAULT_MODELS = {
  gateway: "anthropic/claude-haiku-5.5",
  anthropic: "claude-sonnet-4-5",
  openai: "gpt-4o",
} as const;

export type LlmProvider = keyof typeof DEFAULT_MODELS;

export type PayPalMode =
  | { mode: "mock"; warning: string | null }
  | { mode: "sandbox"; clientId: string; clientSecret: string; warning: null };

export type LlmMode =
  | { mode: "canned"; warning: string | null }
  | { mode: "live"; provider: "anthropic" | "openai"; model: string; apiKey: string; warning: string | null }
  // The AI SDK resolves the gateway credential itself: AI_GATEWAY_API_KEY, else the Vercel OIDC token.
  | { mode: "live"; provider: "gateway"; model: string; apiKey: null; warning: string | null };

const value = (env: Env, key: string) => env[key]?.trim() || "";

/** Read at request time, so adding keys in Vercel and redeploying needs no code change. */
export function resolvePayPalMode(env: Env = process.env): PayPalMode {
  const clientId = value(env, "PAYPAL_CLIENT_ID");
  const clientSecret = value(env, "PAYPAL_CLIENT_SECRET");
  if (clientId && clientSecret) return { mode: "sandbox", clientId, clientSecret, warning: null };
  if (clientId || clientSecret) {
    const missing = clientId ? "PAYPAL_CLIENT_SECRET" : "PAYPAL_CLIENT_ID";
    return { mode: "mock", warning: `${missing} is not set, so PayPal stays in mock mode.` };
  }
  return { mode: "mock", warning: null };
}

/**
 * Order: an explicit LLM_PROVIDER, then a direct provider key, then Vercel AI Gateway. The gateway
 * counts as available with a gateway key, a pulled OIDC token, or when running on Vercel, where the
 * OIDC token arrives per request. "live" means configured. Only a successful call proves it.
 */
export function resolveLlmMode(env: Env = process.env): LlmMode {
  const anthropic = value(env, "ANTHROPIC_API_KEY");
  const openai = value(env, "OPENAI_API_KEY");
  const requested = value(env, "LLM_PROVIDER").toLowerCase();
  const model = value(env, "LLM_MODEL");

  const gatewayAvailable = Boolean(value(env, "AI_GATEWAY_API_KEY") || value(env, "VERCEL_OIDC_TOKEN") || value(env, "VERCEL"));

  if (requested && requested !== "anthropic" && requested !== "openai" && requested !== "gateway") {
    return { mode: "canned", warning: `LLM_PROVIDER "${requested}" is not supported. Use gateway, anthropic or openai.` };
  }
  if (requested === "gateway" && !gatewayAvailable) {
    return { mode: "canned", warning: "LLM_PROVIDER is gateway but no gateway credential is available. Run vercel env pull, or set AI_GATEWAY_API_KEY." };
  }
  if (requested === "anthropic" && !anthropic) {
    return { mode: "canned", warning: "LLM_PROVIDER is anthropic but ANTHROPIC_API_KEY is not set." };
  }
  if (requested === "openai" && !openai) {
    return { mode: "canned", warning: "LLM_PROVIDER is openai but OPENAI_API_KEY is not set." };
  }

  const provider: LlmProvider | null = requested
    ? (requested as LlmProvider)
    : anthropic
      ? "anthropic"
      : openai
        ? "openai"
        : gatewayAvailable
          ? "gateway"
          : null;
  if (!provider) return { mode: "canned", warning: null };

  if (provider === "gateway") return { mode: "live", provider, model: model || DEFAULT_MODELS.gateway, apiKey: null, warning: null };
  return {
    mode: "live",
    provider,
    model: model || DEFAULT_MODELS[provider],
    apiKey: provider === "anthropic" ? anthropic : openai,
    warning: null,
  };
}

/** Safe to send to the browser: mode names and warnings only, never a credential. */
export function publicModes(env: Env = process.env) {
  const paypal = resolvePayPalMode(env);
  const llm = resolveLlmMode(env);
  return {
    paypal: paypal.mode,
    // "configured" is not proof the model works. /api/model-check makes a real call.
    llm: llm.mode === "live" ? ("configured" as const) : ("canned" as const),
    llmModel: llm.mode === "live" ? `${llm.provider}/${llm.model}` : null,
    warnings: [paypal.warning, llm.warning].filter((w): w is string => Boolean(w)),
  };
}

export type PublicModes = ReturnType<typeof publicModes>;

/** Removes configured secret values from text that may reach a client. */
export function redactSecrets(text: string, env: Env = process.env): string {
  let out = text;
  for (const key of ["PAYPAL_CLIENT_SECRET", "PAYPAL_CLIENT_ID", "ANTHROPIC_API_KEY", "OPENAI_API_KEY", "AI_GATEWAY_API_KEY", "VERCEL_OIDC_TOKEN"]) {
    const secret = value(env, key);
    if (secret) out = out.split(secret).join("[redacted]");
  }
  return out;
}
