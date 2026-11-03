# Billing Desk Agent

A small-business owner pastes the messy thing that means "I'm owed money": a chat message, an email thread, a job note, a photo of a handwritten tally. An AI agent turns it into a PayPal invoice through the PayPal agent toolkit, holds it behind a human approval gate, sends it, then watches the invoice status and chases or reconciles it.

Live: https://paypal-ai-hackathon-phi.vercel.app

Entry for the PayPal AI Hackathon. MIT licensed.

## What runs for real today

Read this first. Each integration chooses its mode from environment variables at runtime, and the page always says which mode it is in.

| Integration | Current state of the deployed app |
|---|---|
| PayPal | **Mock.** PayPal sandbox keys are not configured yet, so a red banner says "MOCK PayPal. No request was sent to PayPal. Invoice ids are fake." The toolkit path below is covered only by tests against stubbed HTTP. It has never run against the real sandbox. |
| AI model | **Live.** Production uses `deepseek/deepseek-v4.1-flash` through Vercel AI Gateway, set with `LLM_MODEL`, and the page banner reads "Live AI". `GET /api/model-check` reports the state from a real call. Text extraction has run on this model. The chase agent and image input have only run against a stubbed model so far. If a model call fails, the page falls back to "CANNED MODEL OUTPUT, not live AI." and only the fictional sample can run. |

## How it works

1. Input: paste text or add an image.
2. The model extracts client, line items, quantities, dates and ambiguities, and matches lines to your rate card. Code assigns prices from the rate card, never the model. An unmatched line is flagged, not priced.
3. The page shows the proposal with the source phrases highlighted, and questions for what could not be resolved.
4. Approval gate. Nothing reaches PayPal without a click. Limits on amount and currency are enforced in server code, with tests, and not in a prompt.
5. On approval the app calls `create_invoice`, then reads the invoice back with `get_invoice`, and shows the id and status PayPal returned. Sending is a second approval.
6. The chase agent is a model in a tool loop. It has read tools and propose tools only: no tool it holds can write to PayPal. It reads the invoice, then chooses whether to propose a reminder, propose recording a payment, ask a question or do nothing. The tool calls are shown. Code decides whether an invoice is overdue and blocks a reminder that is not due or a payment above what is owed.

## PayPal toolkit tools called

All through `@paypal/agent-toolkit` 1.11.0, in `src/lib/paypal/toolkit.ts`.

| Tool | Used for | Real sandbox status |
|---|---|---|
| `create_invoice` | Approved draft | Not run yet |
| `get_invoice` | Status read back, agent read tool | Not run yet |
| `list_invoices` | Agent context | Not run yet |
| `send_invoice` | Approved send | Not run yet |
| `send_invoice_reminder` | Approved reminder | Not run yet |
| `record_payment_for_invoice` | Approved "they paid cash" | Not run yet |

Not used: `get_merchant_insights` throws in sandbox in this toolkit version. `create_product` and `list_products` are not used because `create_product` has no price, so prices stay in the app's rate card. `generate_invoice_qr_code` is not wired in. The Agentic Commerce Protocol is not implemented.

Known toolkit limits, read from the installed package:

- It caches its access token and never refreshes it, so the app builds a toolkit per request.
- `create_invoice` has no due date, so "overdue" means N days after the invoice date, a number the owner sets. A due date from PayPal wins if one is present.
- `create_invoice` returns a link rather than the invoice, so the app reads the id from the link and then calls `get_invoice`.
- It calls `api.sandbox.paypal.com`, not `api-m.sandbox.paypal.com`.

Unconfirmed against the real sandbox: whether a default app has the invoicing scope, whether `recipient_view_url` is returned, how a sandbox payer reaches a payable invoice, and how `record_payment_for_invoice` changes the status.

## Run it locally

Needs Node 20.9 or newer.

```
npm install
npm run dev
```

Open http://localhost:3000. With no configuration it runs in labelled mock and canned modes, and "Load sample" works end to end. Nothing else is needed to try it.

To leave those modes, copy `.env.example` to `.env.local`.

- PayPal: set `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` from a PayPal sandbox app. The app has no path to live PayPal.
- Model: link a Vercel project and run `vercel env pull` to get an OIDC token for Vercel AI Gateway (valid about 12 hours), or set `AI_GATEWAY_API_KEY`. A direct `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` also works. `LLM_MODEL` overrides the code default, `anthropic/claude-haiku-5.5`. The deployed app sets it to `deepseek/deepseek-v4.1-flash`.
- Policy: `POLICY_MAX_INVOICE_AMOUNT` and `POLICY_ALLOWED_CURRENCIES`. Defaults are 5000 and USD, EUR, GBP.

## Checks

```
npm test            # unit and route tests, including the real toolkit code against stubbed HTTP
npm run typecheck
npm run demo:walk   # Playwright walk of docs/demo-path.md
```

`GET /api/health` is liveness and makes no outside call. `GET /api/model-check` makes one small real model call, cached per instance.

## Sample data

The sample note and the rate card are fictional and labelled as such. This entry claims no customers, usage numbers or benchmark results.
