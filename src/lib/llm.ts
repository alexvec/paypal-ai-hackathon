import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGateway, generateText, type LanguageModel } from "ai";
import { redactSecrets, resolveLlmMode, type Env } from "./config";

/** Null means no model is configured. The mode is read per request. */
export function getModel(env: Env = process.env): LanguageModel | null {
  const mode = resolveLlmMode(env);
  if (mode.mode !== "live") return null;
  if (mode.provider === "gateway") return createGateway()(mode.model);
  return mode.provider === "anthropic" ? createAnthropic({ apiKey: mode.apiKey })(mode.model) : createOpenAI({ apiKey: mode.apiKey })(mode.model);
}

/** The provider's own error text, with any configured secret removed. */
export function safeModelError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return redactSecrets(message).slice(0, 600);
}

export type ModelCheck = { llmSource: "LIVE_MODEL" | "CANNED"; llmModel: string | null; modelError: string | null; checkedAt: string };

const SUCCESS_TTL_MS = 10 * 60 * 1000;
const FAILURE_TTL_MS = 60 * 1000;
let cache: { key: string; at: number; result: ModelCheck } | null = null;

/** One tiny real call, cached per instance, so the banner on page load is a fact and not a guess. */
export async function checkModel(env: Env = process.env, now = Date.now()): Promise<ModelCheck> {
  const mode = resolveLlmMode(env);
  const checkedAt = new Date(now).toISOString();
  if (mode.mode !== "live") return { llmSource: "CANNED", llmModel: null, modelError: mode.warning, checkedAt };

  const label = `${mode.provider}/${mode.model}`;
  if (cache?.key === label) {
    const ttl = cache.result.llmSource === "LIVE_MODEL" ? SUCCESS_TTL_MS : FAILURE_TTL_MS;
    if (now - cache.at < ttl) return cache.result;
  }
  let result: ModelCheck;
  try {
    await generateText({ model: getModel(env)!, prompt: "Reply with the word OK.", maxOutputTokens: 8, maxRetries: 0 });
    result = { llmSource: "LIVE_MODEL", llmModel: label, modelError: null, checkedAt };
  } catch (error) {
    result = { llmSource: "CANNED", llmModel: label, modelError: safeModelError(error), checkedAt };
  }
  cache = { key: label, at: now, result };
  return result;
}

export function clearModelCheckCache() {
  cache = null;
}
