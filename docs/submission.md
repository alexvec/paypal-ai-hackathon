# Submission text: Billing Desk Agent

Draft form text for Alex to paste. Not submitted. Written 2026-11-03.

## Read this first

**Field names and limits are unverified.** The Devpost entry page and rules returned HTTP 403 to the research tool (docs/competition.md), so the real form fields, character limits, and required items are unknown. This file is organised by likely content: title, short description, long description, links. Open the form in a browser, map each block below onto the real fields, and trim to the real limits. The long description is ordered so that cutting from the bottom loses the least.

**Deadline.** The PayPal blog says submissions close Nov 12, 2026. A third-party listing suggests about 20:00 UTC that day. Both are unverified for the time. Submit early.

### Before you paste: statements that become true only after real keys and a real run

As of 2026-11-03 the live app runs on a live model (`deepseek/deepseek-v4.1-flash` through Vercel AI Gateway), and PayPal is still in labelled mock mode with fake `MOCK-` ids. No real PayPal sandbox call has ever completed. R10 is confirmed, and R7 and R11 are partly confirmed (see the table). Each statement below is marked inline in the text as `[CONFIRM AFTER REAL RUN]` followed by its number. Do not paste a marked sentence until you have seen it happen on the live URL with the banners reading `PayPal SANDBOX` and `Live AI`. If it did not happen, delete the sentence or rewrite it to what did happen.

| # | Statement | What to see first |
|---|---|---|
| R1 | A PayPal sandbox invoice is created through the toolkit's `create_invoice` and the sandbox returns an id. | Id appears in the app and the invoice exists in the sandbox business account. |
| R2 | The status shown is the one `get_invoice` read back from PayPal. | Status in the app matches the sandbox dashboard. |
| R3 | `send_invoice` works, and a sandbox payer can reach and pay the invoice. | Pay it as the sandbox personal account. Unconfirmed in the docs. |
| R4 | After payment, a refresh shows the changed status. | Status changes in the app after the sandbox payment. |
| R5 | `send_invoice_reminder` works from an approved reminder. | Reminder call returns without error on a sent invoice. |
| R6 | `record_payment_for_invoice` works and changes the status. | Status changes after approving a cash payment. |
| R7 | The model reads a real messy note and proposes lines, with ambiguities flagged. | A note that was not written for the extractor produces a sensible proposal. Partly seen: one fictional test note on 2026-11-03 gave a sensible proposal with ambiguities flagged. Still try a genuine note. |
| R8 | The model reads a photo (handwritten tally). | An image upload produces a transcription and lines. Image input has run only against stubs, and whether the current model reads images is unconfirmed. |
| R9 | The chase agent is a live model choosing among read and propose tools, with its tool calls shown. | Banner says `Live AI` (seen), and the tool-call list is populated by a real run (not yet tried). |
| R10 | The live URL accepts text a judge pastes, not only the sample. | Confirmed 2026-11-03: a fictional non-sample note sent to `POST /api/propose` on the live URL returned a real proposal. |
| R11 | The model named in the text is the one that answered. | Seen 2026-11-03: `/api/model-check` shows `LIVE_MODEL` and the banner names `gateway/deepseek/deepseek-v4.1-flash`. Recheck on the day. The code default is a different model, and production sets `LLM_MODEL`. |

Statements that are true of the code today and need no real run: the approval click is required by the server, the amount and currency limits are enforced in server code, prices come only from the rate card, the chase agent holds no write tool, and the README lists exactly which toolkit tools are called. These are covered by unit and route tests per the README. Run `npm test` yourself before relying on that sentence.

Do not claim: the Agentic Commerce Protocol, customers, usage, revenue, time saved, or any market figure. None exists in the repo.

## Title

Billing Desk Agent

## Short description (tagline)

The limit is unverified. Pick the version that fits.

Short (about 55 characters):

> Messy note in, approved PayPal invoice out, then chased.

Longer (about 190 characters):

> An AI agent turns a chat, email or job note into a PayPal invoice, holds it behind your approval click, and then watches the invoice and proposes reminders or a recorded cash payment. `[CONFIRM AFTER REAL RUN: R1, R7]`

## Long description

### The problem

A tradesperson, freelancer, tutor or small studio finishes a job and the proof is a chat message, an email thread, a voice-memo transcript or a photo of a handwritten tally. Turning that into a correct invoice means retyping, pricing, and then remembering to chase it. A form cannot read a messy note, and a chatbot that only lists invoices creates nothing.

### What it does

You paste the note, or add a photo `[CONFIRM AFTER REAL RUN: R8]`. The model extracts the client, line items, quantities, dates and ambiguities, and matches each line to your rate card. Code assigns the prices from the rate card. The model never sets a price. A line that is not on the rate card is flagged, not priced.

The page shows the proposal with the phrases from your note highlighted against each numbered line, and it asks questions for anything it could not resolve, for example "two or three hours" with no single quantity. The approve button stays off until a person fills those in.

Nothing reaches PayPal without a click. The amount limit and the allowed currencies are enforced in server code, with tests, not in a prompt. On approval the app creates the invoice with the PayPal agent toolkit's `create_invoice` and reads it back with `get_invoice`, then shows the id and the status PayPal returned `[CONFIRM AFTER REAL RUN: R1, R2]`. Sending is a second approval `[CONFIRM AFTER REAL RUN: R3]`.

Then a chase agent takes over. It is a model in a tool loop that holds read tools and propose tools only. No tool it holds can write to PayPal. It reads the invoice, then chooses whether to propose a reminder, propose recording a payment ("they paid cash"), ask you a question, or do nothing. Its tool calls are shown on the page. Code decides whether an invoice is overdue and blocks a reminder that is not due, or a payment larger than what is owed. Whatever it proposes goes out only on your approval `[CONFIRM AFTER REAL RUN: R5, R6, R9]`.

### How PayPal and AI are each load-bearing

Without PayPal there is no invoice to create, send or watch, and no status to read back. Without the model you retype everything, and nothing handles a vague thread or a photo.

In sandbox mode every PayPal call goes through the PayPal agent toolkit (`@paypal/agent-toolkit` 1.11.0, in `src/lib/paypal/toolkit.ts`). The tools called are `create_invoice`, `get_invoice`, `list_invoices`, `send_invoice`, `send_invoice_reminder` and `record_payment_for_invoice` `[CONFIRM AFTER REAL RUN: R1 to R6]`. The README lists these and says which have run against the real sandbox.

### What I learned about the toolkit

Read from the installed package, not guessed:

- It caches its access token and never refreshes it, so the app builds a toolkit for each request.
- `create_invoice` has no due-date field, so "overdue" means a number of days after the invoice date, set by the owner. A due date from PayPal wins if one is present.
- `create_invoice` returns a link rather than the invoice, so the app reads the id from the link and then calls `get_invoice`.
- It calls `api.sandbox.paypal.com`. The app has no path to live PayPal.

### Honest scope

This is merchant-side. The agent bills on the owner's behalf under an approval gate and a policy. It does not implement PayPal's Agentic Commerce Protocol. `get_merchant_insights`, `create_product`, `list_products` and `generate_invoice_qr_code` are not used. The sample note and rate card in the app are fictional and labelled. This entry claims no customers, usage numbers or benchmark results.

### Who pays

The target user is the solo operator or very small service business who bills by hand. The working hypothesis is a small recurring subscription or a flat fee for a billing assistant. That is a hypothesis, untested. No market size, conversion or time-saved figure is claimed. The invoices themselves are paid through PayPal by the owner's clients.

### What is next

Confirm the sandbox payer path end to end, add a due date to the invoice flow if the toolkit allows it, and add `generate_invoice_qr_code`. Anything beyond this is not built.

### Built with

Next.js, the PayPal agent toolkit (`@paypal/agent-toolkit` 1.11.0), the Vercel AI SDK, Vercel AI Gateway for the model (`deepseek/deepseek-v4.1-flash`) `[CONFIRM AFTER REAL RUN: R11]`, Playwright for the demo walk. MIT licensed.

### Builder

Alex Veciana Belmonte.

## Links

- Live app: https://paypal-ai-hackathon-phi.vercel.app (not the shorter `paypal-ai-hackathon.vercel.app`, which is someone else's app)
- Source: https://github.com/alexvec/paypal-ai-hackathon
- Demo video: not uploaded. Add the YouTube URL after Alex records and uploads it. See docs/demo-script.md.
- Try it: open the live URL, click "Load sample" or paste your own note, and click "Propose invoice". PayPal stays a labelled mock, with fake invoice ids, until sandbox keys are on.
- Judge access: the app has no login. UNVERIFIED whether the form asks for test credentials.

## Notes for Alex, not form text

- Prize framing. The plan's stated fit is Best Overall, Best Use of PayPal + AI, and Best Demo Delivery. Best Use of Agentic Commerce is only a partial fit (docs/win-plan.md): merchant-side, no Agentic Commerce Protocol. Do not tick it or write the long description to claim it unless the rules say it is open to that. Whether sponsor or honorable-mention prizes need opt-in is unverified.
- Rules still unread (NEEDS.md list): video length and host, repo and license requirements, required fields, age and country limits, new-project rule. The repo is MIT licensed, which satisfies a possible open-source requirement, unverified.
- The submit step is yours. Nothing here has been sent.
