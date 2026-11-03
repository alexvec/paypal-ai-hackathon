/** The fictional shop's written policy. The model may cite these ids. Code decides which one applies. */
export const POLICY_CLAUSES = [
  { id: "C-FAULT", title: "Shop fault", text: "Items that arrive damaged, wrong, or not as described are refunded within 30 days of payment, with their share of tax. Shipping is also refunded once every unit in the order has been refunded for this reason." },
  { id: "C-CHANGE", title: "Change of mind", text: "Unwanted items are refunded within 14 days of payment, with their share of tax. Shipping is not refunded." },
  { id: "C-FINAL", title: "Final sale", text: "Items marked final sale are not refunded for a change of mind. Clause C-FAULT still applies to them." },
  { id: "C-MISSING", title: "Not delivered", text: "A claim that an order never arrived goes to the owner, who checks the carrier before any refund." },
  { id: "C-CAP", title: "Owner review", text: "A refund above the per-case limit goes to the owner and is not proposed automatically." },
] as const;

export const CLAUSE_IDS: string[] = POLICY_CLAUSES.map((clause) => clause.id);

export const FAULT_WINDOW_DAYS = 30;
export const CHANGE_WINDOW_DAYS = 14;
export const MAX_REFUND_PER_CASE_CENTS = 5_000;
/** Counted per server instance, so it is a brake and not a ledger. See README, "Public URL safety". */
export const MAX_REFUND_PER_DAY_CENTS = 30_000;
export const APPROVAL_TTL_MS = 15 * 60 * 1000;
