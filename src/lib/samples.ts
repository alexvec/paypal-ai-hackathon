import type { Extraction, RateCardItem } from "./schemas";

/** Fictional. Example only: edit it in the UI, or replace it with your own prices. */
export const DEFAULT_RATE_CARD: RateCardItem[] = [
  { id: "call-out", name: "Call-out / site visit", unit: "visit", unitPrice: "60.00", currency: "USD" },
  { id: "labour", name: "Labour", unit: "hour", unitPrice: "85.00", currency: "USD" },
  { id: "consult", name: "Remote consultation", unit: "hour", unitPrice: "50.00", currency: "USD" },
];

export const SAMPLE_NOTE = `FICTIONAL SAMPLE. Every name and address here is made up.

Chat with Sam Placeholder at Example Bakery (sam@example.com):
"Thanks for coming out on Tuesday. The oven circuit works again. So that's the call-out, plus I think two or three hours of labour? You also picked up a spool of cable for it. Send me the bill in USD when you get a minute."`;

/** The canned stand-in for model output. It runs only for SAMPLE_NOTE and only without an LLM key. */
export const CANNED_EXTRACTION: Extraction = {
  cannot_parse: false,
  cannot_parse_reason: null,
  transcription: null,
  client_name: "Example Bakery",
  client_email: "sam@example.com",
  currency: "USD",
  invoice_date: null,
  line_items: [
    {
      description: "Call-out / site visit",
      quantity: 1,
      rate_card_id: "call-out",
      source_phrase: "the call-out",
      ambiguity: null,
    },
    {
      description: "Labour",
      quantity: null,
      rate_card_id: "labour",
      source_phrase: "two or three hours of labour",
      ambiguity: "The note says two or three hours. Enter the hours you worked.",
    },
    {
      description: "Spool of cable",
      quantity: 1,
      rate_card_id: null,
      source_phrase: "a spool of cable",
      ambiguity: null,
    },
  ],
  questions: ["How many hours of labour should this invoice bill?", "What did the spool of cable cost?"],
};

export function isSampleNote(text: string): boolean {
  const normal = (s: string) => s.replace(/\s+/g, " ").trim();
  return normal(text) === normal(SAMPLE_NOTE);
}
