import { MockLanguageModelV4 } from "ai/test";
import type { Claim } from "@/lib/claim";

export const claim = (overrides: Partial<Claim> = {}): Claim => ({
  language: "English",
  outcome_wanted: "partial",
  reason_category: "damaged",
  reason_summary: "A fictional customer says a mug arrived cracked.",
  whole_order: false,
  claimed_items: [{ line_id: "MUG", quantity: 1, customer_words: "the mug" }],
  asserted_amount: null,
  asserted_date: null,
  clauses: [{ id: "C-FAULT", why: "Damage on arrival." }],
  draft_reply: "Thanks for writing in. The owner will confirm the outcome.",
  cannot_parse: false,
  ...overrides,
});

/** A scripted model. Every response is text, as the real model returns. */
export function scriptedModel(...responses: string[]) {
  let index = 0;
  return new MockLanguageModelV4({
    doGenerate: async () => {
      const text = responses[Math.min(index, responses.length - 1)];
      index += 1;
      return {
        content: [{ type: "text" as const, text }],
        finishReason: { unified: "stop" as const, raw: "stop" },
        usage: { inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 1, text: 1, reasoning: 0 } },
        warnings: [],
      };
    },
  });
}
