# PRD 01: Refund Referee

Status: CHOSEN. Working title. Rationale and rejected candidates: docs/win-plan.md.

## User

The owner of a small online shop that takes PayPal checkout and answers refund emails personally. No named person or company is invented.

## Job to be done

"A customer wrote asking for money back. Tell me what I owe under my policy, check their story against what PayPal recorded, and refund exactly that after I approve."

## Partner capability that does the work

PayPal Orders v2 and Payments v2 on the sandbox (host `api-m.sandbox.paypal.com`). Calls:

1. `POST /v1/oauth2/token` (client_credentials).
2. `POST /v2/checkout/orders` with `intent: CAPTURE`, itemised `purchase_units` and a `payment_source.paypal.experience_context` return URL. Returns order id and approval link. (Orders v2 create: VERIFIED. Item/breakdown details: ASSUMPTION.)
3. `GET /v2/checkout/orders/{id}` to see `APPROVED`.
4. `POST /v2/checkout/orders/{id}/capture`.
5. `GET /v2/payments/captures/{capture_id}` for amount, status, refunds so far (path: ASSUMPTION).
6. `POST /v2/payments/captures/{capture_id}/refund` with computed `amount`, `note_to_payer`, and a `PayPal-Request-Id` header (path: ASSUMPTION; toolkit `create_refund` VERIFIED as fallback).
7. `GET /v2/payments/refunds/{refund_id}` to confirm (toolkit `get_refund` VERIFIED).

Toolkit `@paypal/agent-toolkit` 1.11.0 is used where its `get_order`, `pay_order`, `create_refund`, `get_refund` fit; thin REST client elsewhere. No Invoicing, Subscriptions, Payouts, Disputes or Webhooks dependency (a webhook receipt for `PAYMENT.CAPTURE.REFUNDED` is a stretch goal only, with GET refund as the working path).

## What the model does that code cannot

Reads a free-text customer message in any wording or language and returns validated JSON: which order lines are claimed, the outcome wanted (full, partial, replacement, unclear), the stated reason, any amount or date the customer asserts, which policy clause ids apply and why, and a draft reply. Model: `gateway/deepseek/deepseek-v4.1-flash`; one structured-output call, no tool calling, no image input.

## What code does that the model must not

Fetches the order and capture, recomputes the refund from line items and PayPal's captured amount (item price times quantity, plus proportional tax, shipping only if a clause allows), caps at remaining refundable amount, checks the refund window, per-case and per-day caps, rejects clause ids that do not exist, flags contradictions between the message and the PayPal record (item not in order, claimed amount above captured, outside window, already refunded), and requires an approval click. The model can propose; only code can call the refund endpoint.

## Flow

1. "New test purchase": the app creates a sandbox order for a small shop catalogue item list (labelled as the shop's items for this entry; they are the sandbox merchant's, not customers). The buyer approves in PayPal sandbox; the app captures. Order, capture ids shown.
2. Paste a customer message (judge's own words) against that order.
3. Case view: message, PayPal record, flagged contradictions, extracted claim, policy clauses cited.
4. Proposed outcome: refund full, partial (with arithmetic), deny, ask customer, or escalate.
5. Approve: refund call. Receipt shows refund id, status, raw response, debug id.
6. Reload the capture from PayPal: refundable amount reduced. A second claim for the same item is blocked by PayPal data, not by memory.

## What the demo must show on real input

A fresh sandbox order created and approved on camera; a refund message written by the viewer or Alex (not tuned to the extractor); one partial refund with arithmetic; one contradictory message caught by the PayPal record; the refund visible in PayPal's own sandbox dashboard. No mock banner anywhere.

## First-day slice (Nov 4) and proof

Live URL with: health route; a form that creates a real sandbox order and shows the approval link; a return handler that captures; a paste box that makes the real model call and shows the validated JSON; a refund button behind the gate. Plus the command:

`npm run proof` does, in order: (a) one structured-output model call checked against the schema; (b) OAuth token; (c) create order and print the approval link; (d) poll GET order until `APPROVED` (10 minute timeout; this is the one human step, log in as the sandbox buyer); (e) capture; (f) refund 1.00 with a request id; (g) GET refund. Exit code non-zero on any failure with the failing status and debug id; success prints the ids and writes a redacted log. Before keys exist it fails with "PAYPAL_CLIENT_ID missing". It never falls back to a mock. Unit tests may use a fake fetch under `tests/` only.

## Who pays

The shop owner, by a flat subscription. Hypothesis, unvalidated; no price or market figure claimed. PayPal's interest is correct, documented use of its refund API.

## What would make a judge call it a wrapper

- The model writes the refund amount. Counter: code derives it from PayPal data and tests prove the model cannot raise it.
- One refund call under a chat box. Counter: the claim-vs-record verification, window and cap rules, idempotent refund, read-back, and the case view.
- A labelled mock or canned order. Counter: the order is created in PayPal by the app and approved by the viewer.
- Only our sample message works. Counter: arbitrary input, with "needs review" when parsing fails.
- Claiming Agentic Commerce Protocol support. Counter: README says it is not implemented.
- Looks like the invoice desk. Counter: no invoice code remains.

## Success checks (for REVIEW.md)

- `npm run proof` passes against the sandbox.
- Live URL 200; a fresh order, capture and refund complete end to end.
- Over-policy and over-refundable cases are blocked in code, with tests.
- The refund id appears in the sandbox dashboard.
- No mock path in `src/`.
