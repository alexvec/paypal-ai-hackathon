import { z } from "zod";

const money = z.string().regex(/^\d+(\.\d{1,2})?$/, "Use a plain amount such as 85.00");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format yyyy-mm-dd");

export const rateCardItemSchema = z.object({
  id: z.string().min(1).max(60),
  name: z.string().min(1).max(120),
  unit: z.string().min(1).max(30),
  unitPrice: money,
  currency: z.string().length(3),
});
export type RateCardItem = z.infer<typeof rateCardItemSchema>;
export const rateCardSchema = z.array(rateCardItemSchema).max(100);

/** What the model returns. Prices are absent on purpose: code assigns them from the rate card. */
export const extractionSchema = z.object({
  cannot_parse: z.boolean().describe("True when the input does not describe billable work."),
  cannot_parse_reason: z.string().nullable(),
  transcription: z
    .string()
    .nullable()
    .describe("Verbatim text read from the image. Null when no image was supplied."),
  client_name: z.string().nullable(),
  client_email: z.string().nullable(),
  currency: z.string().nullable().describe("Three-letter ISO code only if the input states it."),
  invoice_date: z.string().nullable().describe("yyyy-mm-dd only if the input states it."),
  line_items: z.array(
    z.object({
      description: z.string(),
      quantity: z.number().nullable().describe("Null when the input is vague. Never guess."),
      rate_card_id: z.string().nullable().describe("Exact id from the rate card, or null if nothing fits."),
      source_phrase: z.string().nullable().describe("Exact words copied from the input that justify this line."),
      ambiguity: z.string().nullable().describe("What is unclear about this line, or null."),
    }),
  ),
  questions: z.array(z.string()).describe("Questions for the user about anything unresolved."),
});
export type Extraction = z.infer<typeof extractionSchema>;

export const proposalLineSchema = z.object({
  description: z.string(),
  quantity: z.number().nullable(),
  unit: z.string().nullable(),
  unitPrice: z.string().nullable(),
  rateCardId: z.string().nullable(),
  match: z.enum(["matched", "unmatched"]),
  sourcePhrase: z.string().nullable(),
  sourceSpan: z.tuple([z.number(), z.number()]).nullable(),
  flags: z.array(z.string()),
});
export type ProposalLine = z.infer<typeof proposalLineSchema>;

export type Proposal = {
  status: "proposed" | "cannot_parse";
  reason: string | null;
  sourceText: string;
  clientName: string | null;
  clientEmail: string | null;
  currency: string;
  invoiceDate: string;
  lines: ProposalLine[];
  questions: string[];
};

/** The exact thing a person approves. Every field is complete: unresolved lines cannot be approved. */
export const invoiceDraftSchema = z.object({
  clientName: z.string().trim().max(300).optional(),
  clientEmail: z.string().trim().email().optional().or(z.literal("").transform(() => undefined)),
  currency: z.string().length(3),
  invoiceDate: isoDate,
  note: z.string().max(2000).optional(),
  lines: z
    .array(
      z.object({
        description: z.string().trim().min(1).max(200),
        quantity: z.number().positive().max(1_000_000),
        unitPrice: money,
      }),
    )
    .min(1, "An invoice needs at least one line"),
});
export type InvoiceDraft = z.infer<typeof invoiceDraftSchema>;

export const paymentMethods = [
  "BANK_TRANSFER",
  "CASH",
  "CHECK",
  "CREDIT_CARD",
  "DEBIT_CARD",
  "PAYPAL",
  "WIRE_TRANSFER",
  "OTHER",
] as const;

export const invoiceViewSchema = z.object({
  id: z.string(),
  status: z.string().nullable(),
  number: z.string().nullable(),
  currency: z.string().nullable(),
  total: z.string().nullable(),
  due: z.string().nullable(),
  invoiceDate: z.string().nullable(),
  paymentDueDate: z.string().nullable(),
  recipientEmail: z.string().nullable(),
  recipientName: z.string().nullable(),
  recipientViewUrl: z.string().nullable(),
  invoicerViewUrl: z.string().nullable(),
  source: z.enum(["MOCK", "PAYPAL_SANDBOX"]),
});
export type InvoiceView = z.infer<typeof invoiceViewSchema>;

const approved = z.literal(true, {
  errorMap: () => ({ message: "This action needs an explicit approval click." }),
});


export const invoiceActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("get") }),
  z.object({ action: z.literal("send"), approved, note: z.string().max(2000).optional() }),
  z.object({
    action: z.literal("remind"),
    approved,
    subject: z.string().trim().min(1).max(200),
    note: z.string().trim().min(1).max(2000),
    overdueAfterDays: z.number().int().min(0).max(365),
  }),
  z.object({
    action: z.literal("record_payment"),
    approved,
    method: z.enum(paymentMethods),
    amount: money,
    paymentDate: isoDate,
    note: z.string().max(2000).optional(),
  }),
]);
export type InvoiceAction = z.infer<typeof invoiceActionSchema>;

export const proposeRequestSchema = z
  .object({
    text: z.string().max(8000, "Text is limited to 8000 characters").default(""),
    image: z
      .object({
        mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
        // About 3 MB of image data, which stays under the host's request body limit.
        base64: z.string().max(4_000_000, "Image is too large. The limit is about 3 MB."),
      })
      .optional(),
    rateCard: rateCardSchema.optional(),
  })
  .refine((v) => v.text.trim().length > 0 || v.image, { message: "Paste some text or add an image." });

export const agentRequestSchema = z.object({
  invoiceId: z.string().regex(/^[A-Za-z0-9_-]{1,127}$/),
  userNote: z.string().max(2000).default(""),
  overdueAfterDays: z.number().int().min(0).max(365).default(14),
  mockSnapshot: invoiceViewSchema.optional(),
});
