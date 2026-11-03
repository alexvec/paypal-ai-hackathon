import type { Extraction, Proposal, ProposalLine, RateCardItem } from "./schemas";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Finds a phrase in the source, tolerating case and whitespace only. Paraphrase does not count. */
export function findSpan(source: string, phrase: string | null): [number, number] | null {
  const trimmed = phrase?.trim();
  if (!trimmed) return null;
  const pattern = trimmed
    .split(/\s+/)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+");
  const match = new RegExp(pattern, "i").exec(source);
  return match ? [match.index, match.index + match[0].length] : null;
}

/**
 * Turns model output into a proposal using code, not model judgement:
 * prices come only from the rate card, and a source phrase counts only if it is really in the input.
 */
export function buildProposal(args: {
  extraction: Extraction;
  inputText: string;
  rateCard: RateCardItem[];
  today: string;
}): Proposal {
  const { extraction: x, inputText, rateCard, today } = args;
  const sourceText = [inputText.trim(), x.transcription?.trim()].filter(Boolean).join("\n\n");
  const fallbackCurrency = rateCard[0]?.currency ?? "USD";
  const statedCurrency = x.currency && /^[A-Za-z]{3}$/.test(x.currency) ? x.currency.toUpperCase() : null;
  const currency = statedCurrency ?? fallbackCurrency;

  if (x.cannot_parse) {
    return {
      status: "cannot_parse",
      reason: x.cannot_parse_reason || "The input does not describe billable work.",
      sourceText,
      clientName: null,
      clientEmail: null,
      currency,
      invoiceDate: today,
      lines: [],
      questions: [],
    };
  }

  const lines: ProposalLine[] = x.line_items.map((item) => {
    const flags: string[] = [];
    if (item.ambiguity) flags.push(item.ambiguity);

    const card = item.rate_card_id ? rateCard.find((r) => r.id === item.rate_card_id) : undefined;
    let unitPrice: string | null = null;
    if (!card) {
      flags.push("Not on the rate card. Enter a price or remove this line.");
    } else if (card.currency.toUpperCase() !== currency) {
      flags.push(`The rate card price is in ${card.currency}, but this invoice is in ${currency}. Enter a price.`);
    } else {
      unitPrice = card.unitPrice;
    }

    const quantity = typeof item.quantity === "number" && item.quantity > 0 ? item.quantity : null;
    if (quantity === null && !item.ambiguity) flags.push("Quantity is missing. Enter one.");

    const sourceSpan = sourceText ? findSpan(sourceText, item.source_phrase) : null;
    if (!sourceSpan) flags.push("The agent gave no phrase from the input that supports this line. Check it.");

    return {
      description: item.description,
      quantity,
      unit: card?.unit ?? null,
      unitPrice,
      rateCardId: card?.id ?? null,
      match: card ? "matched" : "unmatched",
      sourcePhrase: sourceSpan ? item.source_phrase : null,
      sourceSpan,
      flags,
    };
  });

  const questions = [...x.questions];
  const email = x.client_email?.trim() ?? "";
  const validEmail = EMAIL.test(email) ? email : null;
  if (!validEmail) questions.push("What email address should receive this invoice?");
  if (!statedCurrency) questions.push(`The input states no currency. ${currency} is assumed from the rate card. Is that right?`);
  if (lines.length === 0) questions.push("No billable lines were found. What should this invoice charge for?");

  return {
    status: "proposed",
    reason: null,
    sourceText,
    clientName: x.client_name?.trim() || null,
    clientEmail: validEmail,
    currency,
    invoiceDate: x.invoice_date && DATE.test(x.invoice_date) ? x.invoice_date : today,
    lines,
    questions,
  };
}
