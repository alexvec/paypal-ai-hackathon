import { describe, expect, it } from "vitest";
import { buildProposal, findSpan } from "@/lib/proposal";
import { CANNED_EXTRACTION, DEFAULT_RATE_CARD, SAMPLE_NOTE } from "@/lib/samples";
import type { Extraction } from "@/lib/schemas";
import { TODAY } from "./helpers";

const base: Extraction = { ...CANNED_EXTRACTION, line_items: [], questions: [] };
const build = (extraction: Extraction, inputText = SAMPLE_NOTE) => buildProposal({ extraction, inputText, rateCard: DEFAULT_RATE_CARD, today: TODAY });

describe("buildProposal", () => {
  it("prices the sample from the rate card and flags what it cannot resolve", () => {
    const p = build(CANNED_EXTRACTION);
    const [callOut, labour, cable] = p.lines;
    expect(callOut).toMatchObject({ unitPrice: "60.00", quantity: 1, match: "matched", flags: [] });
    expect(labour.quantity).toBeNull();
    expect(labour.unitPrice).toBe("85.00");
    expect(labour.flags.join()).toContain("two or three hours");
    expect(cable).toMatchObject({ unitPrice: null, rateCardId: null, match: "unmatched" });
    expect(cable.flags.join()).toContain("Not on the rate card");
  });

  it("never takes a price for an unknown rate card id", () => {
    const p = build({ ...base, line_items: [{ description: "Gold plating", quantity: 2, rate_card_id: "made-up", source_phrase: "the call-out", ambiguity: null }] });
    expect(p.lines[0].unitPrice).toBeNull();
    expect(p.lines[0].match).toBe("unmatched");
  });

  it("rejects a source phrase that is not in the input", () => {
    const p = build({ ...base, line_items: [{ description: "Labour", quantity: 1, rate_card_id: "labour", source_phrase: "forty hours of overtime", ambiguity: null }] });
    expect(p.lines[0].sourceSpan).toBeNull();
    expect(p.lines[0].flags.join()).toContain("no phrase from the input");
  });

  it("finds a phrase through case and whitespace differences only", () => {
    const source = "plus I think Two  or\nthree hours";
    const span = findSpan(source, "two or three hours");
    expect(span && source.slice(span[0], span[1])).toBe("Two  or\nthree hours");
    expect(findSpan(source, "three or two hours")).toBeNull();
  });

  it("asks for a missing email or currency in code, whatever the model did", () => {
    const p = build({ ...base, client_email: "not an email", currency: null });
    expect(p.clientEmail).toBeNull();
    expect(p.questions.join()).toContain("email");
    expect(p.questions.join()).toContain("states no currency");
  });

  it("does not price a line when the rate card currency differs from the invoice", () => {
    const p = build({ ...base, currency: "EUR", line_items: [{ description: "Labour", quantity: 1, rate_card_id: "labour", source_phrase: "the call-out", ambiguity: null }] });
    expect(p.lines[0].unitPrice).toBeNull();
    expect(p.lines[0].flags.join()).toContain("EUR");
  });

  it("reports unparseable input plainly", () => {
    const p = build({ ...base, cannot_parse: true, cannot_parse_reason: "This is a poem." });
    expect(p).toMatchObject({ status: "cannot_parse", reason: "This is a poem.", lines: [] });
  });
});
