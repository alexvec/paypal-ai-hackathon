import { createGateway } from "ai";
import type { LanguageModel } from "ai";
import { gatewayModelId, missingModelVariables, type Env } from "./config";
import { NotConnectedError } from "./errors";

/** The production model through Vercel AI Gateway, or a plain "not connected" error. */
export function getModel(env: Env = process.env): LanguageModel {
  const missing = missingModelVariables(env);
  if (missing.length) throw new NotConnectedError("Model", missing);
  return createGateway()(gatewayModelId(env));
}
