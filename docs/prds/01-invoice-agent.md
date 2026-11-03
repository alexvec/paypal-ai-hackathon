# PRD 01: Invoice agent (chosen)

Working title: Billing Desk Agent. Status: CHOSEN. Prize angles: Best Overall, Best Use of PayPal + AI, Best Demo Delivery, and with caveats Best Use of Agentic Commerce.

## User

A solo operator or a very small service business (a freelancer, a tradesperson, a small studio, a tutor) who gets paid by invoice and does the billing themselves. They get work requests and completed-job notes in messy form: email threads, chat messages, voice-memo transcripts, photos of handwritten tallies. They do not have an accountant or billing clerk. No named person or company is invented for this PRD.

## Job to be done

"When a job is done or a quote is agreed, turn what I have into a correct PayPal invoice, get it out, and chase it until it is paid, without me retyping anything."

## Partner capability that does the work

PayPal agent toolkit, `@paypal/agent-toolkit` (README read at https://github.com/paypal/agent-toolkit: TypeScript, Node 18+, works with Vercel AI SDK, OpenAI, LangChain and MCP, sandbox supported). Tools used, by name as listed on the README and https://developer.paypal.com/ai-tools/agent-tools:

- `create_product` and `list_products` (note: the agent-tools page spells it `list_product`; check the exact name in the installed package) for the user's rate card
- `create_invoice`, `send_invoice`, `generate_invoice_qr_code`
- `get_invoice`, `list_invoices` for status watching
- `send_invoice_reminder`
- `record_payment_for_invoice` for "they paid cash"
- `get_merchant_insights` for a one-line "what's outstanding" answer (optional, cut first)

The AI does the part a form cannot: reading unstructured and multimodal input, matching it to the rate card, spotting what is missing (no email address, ambiguous quantity), proposing the invoice, drafting the reminder wording, and choosing which tool to call next in a loop. The LLM provider is not chosen (NEEDS.md item 4). It must support tool calling and image input.

Removal test: without PayPal there is nothing to create, send or watch. Without the model the user retypes everything, and nothing handles a photo or a vague thread.

## Flow

1. Input: paste text or upload an image.
2. Agent extracts client, line items, quantities, dates, currency and ambiguities. It matches line items to the rate card. Unmatched items are flagged, not silently priced.
3. The UI shows a proposed invoice as structured data with the source phrases highlighted that justify each line. Questions the agent could not resolve are shown as questions.
4. Approval gate. Nothing is sent to PayPal as "sent" without a click. A policy (default maximum amount per invoice, allowed currencies) is enforced in code, not in the prompt.
5. On approval: `create_invoice`, then `send_invoice`. The UI shows the PayPal invoice id and the real status returned by PayPal.
6. Watch: the agent checks `get_invoice` and, if overdue by the user's chosen rule, drafts a reminder, shows it, and on approval calls `send_invoice_reminder`.
7. Reconcile: "Dana paid cash" leads to `record_payment_for_invoice` after confirmation.

## First-day slice (Nov 4): live URL

Goal: a public URL that a judge can open and complete steps 1 to 3 plus a real PayPal call.

In scope on day 1:
- Deployed app with a single page: text box, "Load sample" button, "Propose invoice" button.
- LLM extraction into a schema, shown as a proposed invoice with highlighted source phrases.
- A "Create draft in PayPal sandbox" button that calls `create_invoice` once and shows the returned invoice id and status.
- A visible environment banner: "PayPal SANDBOX" when keys are present.
- Health route returning 200 for the liveness check in CLAUDE.md.

Out of scope on day 1: image input, send, reminders, record payment, policy editor, auth, database. State may be in memory or a file.

If keys are not yet available on day 1:
- The PayPal layer runs in a MOCK mode. Every mock response includes `"source": "MOCK"`, the UI shows a persistent red banner "MOCK PayPal. No request was sent to PayPal. Invoice ids are fake.", and mock invoice ids use the prefix `MOCK-`. The mock is a single module behind the same interface as the real one, so switching is an environment variable.
- If the LLM key is missing, extraction runs on canned output for the sample only, with the banner "CANNED MODEL OUTPUT, not live AI." This mode must not be used in the submitted demo and the submission checklist must fail if either banner is visible.
- The mock never goes in the demo video, the README never describes mock output as PayPal behaviour.

## What the demo must show on real input

Real input means text or an image the judge or Alex supplies, not text we wrote to fit the extractor. Demo steps, in a three-minute cut (ASSUMPTION: the under-three-minutes lead is real, UNVERIFIED):

1. Alex pastes a genuine messy note from his own work history, or a judge-supplied paragraph (the live URL accepts any).
2. The proposed invoice appears with the justification highlights and one flagged ambiguity.
3. Approve. The sandbox invoice id appears. Open the invoice in the sandbox business account dashboard in a second tab to show it exists.
4. Pay it as the sandbox personal buyer (see risk below), then refresh and show the status change as returned by `get_invoice`.
5. Second invoice: overdue reminder drafted and sent; record a cash payment on a third.

Pay path risk (UNCONFIRMED): the invoicing pages opened did not describe how a sandbox payer reaches and pays an invoice. Verify on day 1 in the invoicing schema. Fallback: a payment request built with Orders v2 (`POST /v2/checkout/orders`, `intent: CAPTURE`, `approve` or `payer-action` link, then capture), which is documented. The first-day check decides which.

## Who pays

The user pays a small recurring subscription, or a small percentage-free flat fee, for a billing assistant that saves retyping and shortens time to payment. Pricing is a hypothesis: no market size, conversion or time-saved figure is claimed in this entry. Any such claim in the README or video needs a cited source or is removed. The invoices themselves are paid through PayPal by the user's clients, so PayPal transaction volume is the by-product.

## What would make a judge call it a wrapper

- The LLM only fills a form that a plain regex could fill, and the PayPal call is a single `create_invoice`. Counter: lifecycle depth (send, watch, remind, reconcile), image input, flagged ambiguities, rate card matching.
- The agent has no real loop: a fixed pipeline dressed up as an agent. Counter: the model chooses between watch, remind, record and ask-user based on invoice state, and the transcript of tool calls is visible.
- The approval gate and policy are prompt text only. Counter: enforced in code, with a test.
- A mock or canned path presented as real. Counter: banners above and the submission checklist.
- The demo works only on our sample. Counter: the live URL accepts arbitrary judge input and says plainly when it cannot parse it.
- Claiming the Agentic Commerce Protocol or other unused PayPal products. Counter: README lists exactly which toolkit tools are called.
- Chat UI over `list_invoices` with no creation. Counter: creation from messy input is the centre.

## Success checks (for REVIEW.md)

- Live URL returns 200, sample runs end to end against sandbox.
- A fresh paste of unseen text yields a sensible proposal.
- Policy over-limit invoice is blocked in code.
- No mock or canned banner visible in the final demo.
- README states every toolkit tool called and which are unverified.

## Open items

See "Unconfirmed technical items" in docs/win-plan.md. Credentials needed: PayPal sandbox client ID and secret (NEEDS item 3), an LLM key with tool calling and vision (item 4), a deploy host token (item 5), repo push access (item 6). Two sandbox accounts (business and personal) come with the developer account.
