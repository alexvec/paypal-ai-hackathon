# Refund Referee

A customer writes to a small online shop asking for money back. Refund Referee reads the message, checks the story against what PayPal recorded, works out what the shop owes under its policy, and refunds exactly that after the owner approves.

Live: https://paypal-ai-hackathon-phi.vercel.app

Entry for the PayPal AI Hackathon. MIT licensed. Working title. The shop, its catalogue and its policy are fictional, and there are no customers, usage figures or testimonials behind this.

## What has run for real

Read this first.

| Part | State |
|---|---|
| PayPal sandbox | **Not connected, and never run.** No sandbox keys exist yet. **No real PayPal call has been made.** Every PayPal path is covered only by tests against a stubbed HTTP layer in `tests/`. On the live URL, these routes answer `503 NOT_CONNECTED` and name the missing variables. |
| AI model | **Real, on the live URL.** `gateway/deepseek/deepseek-v4.1-flash` through Vercel AI Gateway, on `POST /api/extract`. On 2026-11-03 a fictional message in Spanish came back as schema-valid JSON in one call. That route proves the model part only: no PayPal record is read and no refund is decided. The full case path, which feeds a validated claim into the refund decision, needs PayPal, so it has only run against stubs. |

There is no mock mode and no canned output. When a credential is missing, the app and `npm run proof` say "not connected" and name the variable.

## How it works

1. **Test purchase.** The app creates an itemised order in the PayPal sandbox from a fixed catalogue. The buyer approves it on PayPal, and the app captures it.
2. **Message.** You write what the customer said, in any wording or language.
3. **Model.** One call returns JSON: which lines are claimed, the outcome wanted, the reason, any amount or date stated, the policy clauses that apply, and a draft reply. The schema has no refund amount field. If the JSON fails validation, there is one retry, and then the case goes to "needs review" with no refund proposed.
4. **Code.** `src/lib/decide.ts` is a pure function from PayPal's record and the validated claim to a decision: refund in full, partial refund, deny, ask the customer, or escalate. It computes the amount from PayPal's line prices and tax, caps it at what PayPal shows left, applies the time windows and per-case limit, ignores clause ids that do not exist, and flags where the story and the record disagree.
5. **Approval.** The server signs the proposal. The refund route takes only that signed proposal and an explicit approval, re-reads PayPal, re-checks the numbers, then refunds with a `PayPal-Request-Id`.
6. **Read-back.** The receipt shows the refund id, the status read back, the debug ids and the raw responses, with buyer and merchant identity removed. Which units a refund covered is stored in the refund's `custom_id` at PayPal, so a second claim is limited by PayPal's data and not by this app's memory.

## PayPal calls

All in `src/lib/paypal/client.ts`, against `https://api-m.sandbox.paypal.com`. Paths checked on 2026-11-03 against PayPal's published OpenAPI schemas. Not yet run against the sandbox.

| Call | Used for |
|---|---|
| `POST /v1/oauth2/token` | Client credentials token |
| `POST /v2/checkout/orders` | Create the itemised order |
| `GET /v2/checkout/orders/{id}` | Approval status, line items, and the refund list |
| `POST /v2/checkout/orders/{id}/capture` | Capture after buyer approval |
| `GET /v2/payments/captures/{capture_id}` | Capture amount and status |
| `POST /v2/payments/captures/{capture_id}/refund` | The refund |
| `GET /v2/payments/refunds/{refund_id}` | Read the refund back |

The app does not implement PayPal's Agentic Commerce Protocol, and it does not use `@paypal/agent-toolkit`: a thin REST client keeps the host fixed in code.

## Run it

Needs Node 20.12 or later.

```
npm install
cp .env.example .env
npm run dev
```

| Variable | Needed for |
|---|---|
| `PAYPAL_CLIENT_ID` | Everything that touches PayPal |
| `PAYPAL_CLIENT_SECRET` | Everything that touches PayPal. Also keys the app's signatures |
| `AI_GATEWAY_API_KEY` | The model. Locally, a `VERCEL_OIDC_TOKEN` from `vercel env pull` also works |
| `LLM_MODEL` | Optional. Defaults to `deepseek/deepseek-v4.1-flash` |

## Commands

| Command | What it does |
|---|---|
| `npm run proof` | The real end-to-end check. See below |
| `npm test` | Unit and route tests, with PayPal's HTTP layer and the model stubbed |
| `npm run typecheck` | TypeScript |
| `npm run test:ui` | Renders the case, proposal and receipt screens in a browser, with API responses stubbed |
| `npm run demo:walk` | Walks docs/demo-path.md against real services, for recording |

### npm run proof

In order: (a) one model call checked against the schema, (b) OAuth token, (c) create an order and print the approval link, (d) poll until `APPROVED`, for up to 10 minutes while you sign in as the sandbox buyer, (e) capture, (f) refund 1.00 with a request id, (g) read the refund back.

It exits non-zero on any failure, with the failing status and debug id. On a run past the credential check, it writes a redacted log to `proof-logs/`. It never falls back to anything. Today it prints:

```
Refund Referee proof. PayPal host: https://api-m.sandbox.paypal.com (fixed in code).
not connected: PAYPAL_CLIENT_ID missing
not connected: PAYPAL_CLIENT_SECRET missing
Stopped before any call. No model call, no PayPal call, no result. Put the variables in .env. See .env.example.
```

## Public URL safety

The live URL is public, and its model calls are paid for. With real sandbox keys on, an anonymous visitor can:

- create sandbox orders from the fixed catalogue, choosing quantities only, up to $100.00 an order
- approve an order, if they have a sandbox buyer login
- capture, read, and open cases on orders **their own browser created**
- send messages to the model, up to 2,000 characters each
- approve a refund on their own order, for the amount code computed, up to $50.00 a case

They cannot:

- reach live PayPal: the host is a constant, and no variable, header or field changes it
- pass a capture id or an amount: the refund route rejects any extra field
- touch an order this app did not create: each order carries a signature in its PayPal `custom_id`, checked on PayPal's copy
- touch another browser's order: each order is bound to an HttpOnly cookie
- edit or replay an approval into something else: it is signed, expires in 15 minutes, and is re-checked against PayPal
- write text that reaches a payer: `note_to_payer` is fixed text
- see the client secret or token: neither is returned or logged, and raw responses have buyer and merchant identity removed

### Known limits

- **Rate limits and the daily refund cap are in memory, per serverless instance.** They reset on a cold start, and several instances each keep their own count. Model calls are limited to 5 per address per 10 minutes and 40 per instance per hour, with at most 2 calls per message and 1,500 output tokens per call. This slows abuse. It is not a spending limit, which only the gateway account can set.
- **Any visitor can approve their own test refund.** That is the demo. The approval gate proves the model cannot move money. It does not model a shop's login, because there is none. A real shop would need one.
- **The owner cookie is the only proof of ownership.** Clearing it loses access to those orders.
- **A race between two approvals** on one order, read at the same moment, could both pass the item check. PayPal still refuses anything above the capture's balance.

## Built during the submission period

All code here was written in the submission period. The repository first held an invoice desk, which was replaced by this product before any entry was made: Git history shows both. Nothing from the invoice product remains except the scaffold, money helper and rate-limit pattern.

## AI tools

The model above is the AI in the product. This code was written with Claude Code, under Alex Veciana Belmonte's direction.
