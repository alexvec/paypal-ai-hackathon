# Slides: Billing Desk Agent

Outline for a short deck. Export to PDF from any Markdown-to-slides tool, one `---` per slide. Not exported or uploaded.

Rules for this deck: no screenshot goes in until it is taken from the live URL with the banners reading `PayPal SANDBOX` and `Live AI`. A slide marked `[CONFIRM AFTER REAL RUN]` states something that has not happened yet. Delete or reword it if the run differs. No customers, metrics or market figures appear, because none exist in the repo.

---

## 1. Billing Desk Agent

- Messy note in, approved PayPal invoice out, then chased.
- Alex Veciana Belmonte
- Live: https://paypal-ai-hackathon-phi.vercel.app
- Source: https://github.com/alexvec/paypal-ai-hackathon (MIT)

---

## 2. The problem

- The proof of work is a chat, an email thread, a voice-memo transcript, a photo of a tally.
- Turning it into an invoice means retyping and pricing, then remembering to chase.
- A form cannot read a messy note. A chatbot over `list_invoices` creates nothing.
- Who feels it: solo operators and very small service businesses who bill by hand.

---

## 3. What it does

1. Paste a note, or add a photo.
2. The model extracts client, lines, quantities, dates, ambiguities. Code prices from your rate card.
3. You see the proposal with source phrases highlighted, and questions for what is unclear.
4. You click approve. Only then does anything reach PayPal.
5. A chase agent watches the invoice and proposes a reminder or a recorded payment. You approve.

Speaker note: the photo input is `[CONFIRM AFTER REAL RUN]`. It has run only against stubs.

---

## 4. Product on real input

- Screenshot: the proposal with highlighted phrases and a flagged ambiguity. `[SCREENSHOT AFTER REAL RUN]`
- Screenshot: the sandbox invoice id and the status read back. `[SCREENSHOT AFTER REAL RUN]`
- Use a genuine note Alex supplies, not text written to fit the extractor.
- Do not use a screenshot of a mock or canned banner.

---

## 5. Where the AI earns its place

- Reads unstructured and image input a form cannot.
- Matches work to the rate card and refuses to guess: unmatched lines are flagged, not priced.
- Chase agent: a model in a tool loop. It chooses between remind, record payment, ask, or do nothing. Its tool calls are shown.
- It never sets a price and holds no tool that writes to PayPal.

---

## 6. Where PayPal earns its place

- Every PayPal call in sandbox mode goes through `@paypal/agent-toolkit` 1.11.0.
- Tools called: `create_invoice`, `get_invoice`, `list_invoices`, `send_invoice`, `send_invoice_reminder`, `record_payment_for_invoice`.
- The status on screen is what `get_invoice` returned. `[CONFIRM AFTER REAL RUN]`
- Removal test: without PayPal there is nothing to create, send or watch. Without the model the user retypes everything.

---

## 7. Safety is code, not a prompt

- Approval click required by the server for create, send, remind and record.
- Per-invoice amount limit and allowed currencies enforced in server code, with tests.
- Reminder blocked if not due. Payment blocked if above what is owed.
- Send is blocked if the invoice has no recipient email or is not a draft.
- Banners say which mode is running: mock PayPal and canned model output are labelled in red.

---

## 8. Honest scope

- Merchant-side. Does not implement PayPal's Agentic Commerce Protocol.
- Not used: `get_merchant_insights`, `create_product`, `list_products`, `generate_invoice_qr_code`.
- Toolkit limits found: token is cached and never refreshed, `create_invoice` has no due date, it returns a link not the invoice.
- Sandbox only. No path to live PayPal.
- Sample data is fictional and labelled.

---

## 9. Who pays, and what is next

- Who pays: the small service business, by a small subscription or flat fee. This is a hypothesis. No market figure is claimed.
- Next: confirm the sandbox payer path end to end, add a due date if the toolkit allows it, add `generate_invoice_qr_code`.

---

## 10. Try it

- https://paypal-ai-hackathon-phi.vercel.app
- https://github.com/alexvec/paypal-ai-hackathon
- Demo video link: added after Alex uploads it.
