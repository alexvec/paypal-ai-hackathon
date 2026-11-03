# Win plan: PayPal AI Hackathon

Written 2026-11-03 (rebuild). Cut-off: Nov 12, 2026 12:00 pm PT (VERIFIED-BROWSER, docs/competition.md). Rule facts come only from docs/competition.md. Anything not stated there is labelled ASSUMPTION. Nothing here edits the competition notes. No customer, market figure, metric or testimonial is invented; none is used.

## Decision

Product: **Refund Referee** (working title). Single product; the event has no tracks (VERIFIED, PayPal blog). Spec: docs/prds/01-refund-referee.md.

- Buyer: the owner of a small online shop who takes PayPal checkout and answers customer refund emails personally.
- Job: "A customer writes in asking for money back. Decide what, if anything, I owe them under my policy, check their story against what PayPal actually recorded, and refund exactly that, with my sign-off."
- PayPal capability (one, used deeply): Orders v2 and Payments v2 on the sandbox. The app creates an itemised order, the judge approves it as the sandbox buyer, the app captures it, reads the capture, and later issues a computed partial or full refund and reads it back.
- What the model does that code cannot: read a free-text customer message in any wording or language, extract which items and what outcome the customer is claiming, match it to the merchant's written policy clauses, and draft the reply. Code does everything numeric and everything that moves money.

Why it is not the invoice desk: Ledgerbird (operator statement, not seen by us) makes invoices to get paid. This product starts after the payment has been captured and works the other direction: money back out, decided against evidence. Different PayPal objects (capture and refund, not invoice), different direction of money, different user moment.

## Candidates considered and why each lost

Scored against the five published Stage Two criteria and the hard tests (no unverified sandbox dependency without a real-PayPal fallback; input a judge can supply; no real money).

| Candidate | Result | Why it lost, or won |
|---|---|---|
| Invoice agent (messy input to invoice) | Lost | Same job as Ledgerbird, which Alex says is in the gallery. Innovation (one fifth of the score) is capped. |
| Mandate-bound buyer agent | Lost | Merchant and catalogue would be ours, so input is invented. The documented agentic checkout (ChatGPT Apps SDK, Braintree) is not the REST sandbox. |
| Dispute triage | Lost | Fails the feasibility test. How to create a dispute in sandbox is UNVERIFIED and no real-PayPal fallback exists: the only alternative is seeded fiction. |
| Payouts desk (pay a list from a CSV, bounty or contributor payouts) | Lost | Payouts enablement on a new sandbox business account is UNVERIFIED and the business account must be funded. Fallback that still calls real PayPal would be a different product. Also not in the toolkit. |
| Transaction Search reconciliation | Lost | Up to three hours before a fresh transaction appears (VERIFIED), enablement UNVERIFIED, and the bank-statement side would be invented. |
| Pay-per-crawl or paywall for bots | Lost | Close to CrawlerPal, 2025 first place (different event). Low Innovation. |
| Chat with my PayPal data | Lost | A chat box over read tools. Wrapper. |
| Toolkit catalog tour (invoices plus subscriptions plus tracking) | Lost | Shallow on each. Violates "deep use of one". |
| Subscriptions plan translator (pricing page URL to Catalog product and Billing Plans) | Runner-up | Real judge input (any public pricing page) and a checkable plan id, but Subscriptions enablement is UNVERIFIED, innovation is moderate, and it reads as form filling. It is the pivot if refunds fail on day 1 (see kill rule). |
| **Refund Referee** | **Chosen** | Uses only Orders and Payments, the core documented path. Input is a message the judge writes plus a PayPal order the app genuinely creates and the judge genuinely approves. Output is a PayPal refund id checkable in the sandbox. |

## Past winners (a DIFFERENT event: PayPal Dev Days 2025, about 24 hours, May 29, 2025)

From docs/competition.md, which cites https://developer.paypal.com/community/blog/winners-dev-days-hackathon/ (opened). The page gives no demo or technical detail beyond the lines below. I do not guess at their internals.

| Winner | Page says | How Refund Referee differs |
|---|---|---|
| 1st, $5,000: CrawlerPal (Jordi Montes, Neeraj Jhawar) | "a paywall AI agent assistant built with PayPal APIs" | Nearest in kind: an agent on PayPal APIs. CrawlerPal, going by that one line, is about charging for access. Ours is merchant-side post-sale: it reads a captured payment, tests a customer's claim against it and pays money out under a code-enforced policy. We do not build a paywall or pay-per-access. |
| 2nd, $3,000: Shopware 6 PayPal integration upgrade (Team Codebusters) | Moved the integration from JS SDK v5 to beta JS SDK v6 | A legacy SDK migration, no AI decision. Ours is a new product where AI interprets customer language. |
| 3rd, $2,000: Rosen (Sida Zhang, Xiaobin Gu) | "a global social trading app powered by PYUSD" | A consumer trading app on a stablecoin. Ours is a back-office tool for one merchant on sandbox REST payments. |

Supported lesson (the page, not the 2026 judges): the 2025 winners were an agent, a legacy upgrade and a stablecoin app, not invoicing tools. Whether this carries to 2026 is inference.

## Judging plan, criterion by criterion

Stage One (pass/fail): reasonably fits the theme and reasonably applies the required APIs. Pass: every decision ends in a real Orders/Payments call whose ids are shown. No mock path in the product.

Stage Two, five equal criteria:

1. Technological Implementation. Real flow: OAuth, create itemised order, buyer approval, capture, GET capture (refundable amount and prior refunds), refund with `PayPal-Request-Id` idempotency, GET refund. The model output is schema-validated; code recomputes the refund from PayPal's numbers and refuses anything the policy or the capture does not allow, so the model cannot move money by itself. Tests cover the gate and the maths. The README lists exactly which endpoints are called.
2. Design. One complete flow in one screen: Orders list, case view (customer message on the left, PayPal record on the right, contradictions highlighted), proposed refund with its arithmetic, approve button, receipt with PayPal ids and a raw-response drawer. Honest empty and error states.
3. Potential Impact. A specific, credible case with no statistics: a small shop owner handling refund emails alone, and the money decision hinges on facts held by PayPal. No market figure appears anywhere unless sourced.
4. Innovation/Idea. The angle is claim verification: the customer's story is tested against PayPal's record (items, amount, date, prior refunds) before money moves, and the refund amount is derived by code, not by the model. Honest limit: refund handling is a plausible gallery topic; the gallery is unpublished so we cannot check.
5. Presentation. Under 3 minutes, one real order end to end, showing the sandbox ids in PayPal's own dashboard. Problem, who for, why it matters in the first 20 seconds.

Tie-break follows that same order, so Technological Implementation evidence gets most care.

## Prize angles (published list, VERIFIED-BROWSER)

| Prize | Fit | Note |
|---|---|---|
| Grand ($12k / $8k / $5k) | Primary | Depends on the five criteria above. |
| Best Use of PayPal + AI ($5k) | Strong | Removal test: without PayPal there is no payment record or refund; without the model, free-text claims cannot be read. |
| Best Demo Delivery ($5k) | Strong | Single end-to-end scripted real case; the video is a deliverable. |
| Best Use of Agentic Commerce ($5k) | Moderate, stated honestly | An agent holding delegated authority to move money inside a code-enforced mandate and approval gate. It does not implement PayPal's Agentic Commerce Protocol and we will not claim so. |
| Most Impactful, Most Creative | Secondary | Do not chase. |
| Sponsor prizes (AG Grid, APIMatic, Bryntum, Channel3, Render) | Not pursued | A sponsor prize needs real use of that sponsor's tool; bolting one on is the shallow-use trap. Deploy stays on Vercel. |

## Feasibility: dependencies and day-1 fallbacks

The chosen product depends on none of the capabilities docs/competition.md marks unverified (Payouts, Disputes, Subscriptions, Transaction Search, Invoicing, Webhooks). It does depend on Orders and Payments behaviour that has not been run. The REST paths for capture read and refund (`GET /v2/payments/captures/{id}`, `POST /v2/payments/captures/{id}/refund`, `GET /v2/payments/refunds/{id}`) were checked on 2026-11-03 against PayPal's published schema (https://developer.paypal.com/api/payments/v2/schema.json) and match.

Three corrections from that check, all built into the app (detail in docs/prds/01-refund-referee.md):

- The capture resource has a status but no refund list. Refunds so far come from `purchase_units[].payments.refunds[]` on GET order.
- An order created with `payment_source.paypal` returns a `payer-action` link and status `PAYER_ACTION_REQUIRED`, per the Orders v2 sample, not an `approve` link.
- `Prefer` defaults to `return=minimal`, so calls that need the full resource send `Prefer: return=representation`.

| Dependency | Status | If the sandbox refuses on day 1 | The single proving check |
|---|---|---|---|
| OAuth client_credentials on sandbox | VERIFIED pattern | Re-create the REST app; confirm sandbox host `api-m.sandbox.paypal.com` and that Alex copied sandbox, not live, keys | token request returns 200 |
| Create itemised order (`items`, `breakdown`) | Orders create VERIFIED; breakdown rules ASSUMPTION | Drop tax/shipping lines first, then keep only `item_total`; the case logic still works on items | POST returns an order id and an approval link |
| Buyer approval in browser with the default sandbox personal account | ASSUMPTION (standard flow) | If redirect return fails, poll GET order until `APPROVED` and have the judge paste nothing; if the personal account login fails, create a new sandbox personal account in the dashboard | GET order shows `APPROVED` |
| Capture | Path VERIFIED against the schema; not yet run | If the capture comes back PENDING, retry with USD and a fresh default business account; the app escalates a pending capture rather than refunding it | capture status `COMPLETED` |
| Refund (full and partial) | REST path VERIFIED against the schema; not yet run | Read PayPal's error issue and debug id, which the app shows. The toolkit `create_refund` tool was removed from the app, so it is not a one-line fallback | refund status `COMPLETED` and GET refund matches |
| Model returns schema-valid JSON | Text VERIFIED working; JSON mode and tool calling NOT confirmed | See "Model" below | one call returns JSON that passes the schema |

Kill rule: if capture or refund cannot be made to work by the end of Nov 4 (day 1), stop and test the runner-up (Subscriptions plan translator) the same day. Both depend on the same sandbox account, so if both fail the problem is the account, which is Alex's dashboard check. No labelled mock replaces a failed capability.

## Model

Fixed: `gateway/deepseek/deepseek-v4.1-flash` through Vercel AI Gateway; `LLM_MODEL` is not changed. Text confirmed working; tool calling and image input unconfirmed.

- The core uses neither. Orchestration is server-side: code fetches the order and capture from PayPal, then makes one structured-output call with the message, the policy clauses and the PayPal record, and validates the JSON against a zod schema.
- If the model's JSON mode is unsupported, the prompt demands a bare JSON object, code parses it, and retries once with the validation error. If it is still invalid, the case goes to the human as "needs review" with no refund proposed. Never a guess.
- Image input (a photo of a damaged item) is not in the core. Customers' messages are text.
- The existing repo's agent loop uses tool calling; it is not reused in the main path.

## Reuse from the current repo

Fine to reuse: Next.js on Vercel scaffold, rate limiter, approval-gate and server policy pattern, money-in-cents helpers, error helpers, test setup. `@paypal/agent-toolkit` was removed at build time: a thin REST client keeps the sandbox host fixed in code. Must change: delete the mock and canned modes from `src/lib/config.ts` and the PayPal gateway so the product has no mock in its main path; mocks, if any, live under `tests/` only. Invoice code is removed from the product, not left dormant, because the repo must read as a different product. The README states what was built during the submission window (rule: new or significantly updated, with an explanation).

## Demo that a judge can verify

Judge or Alex writes their own refund message. The order exists because the app created it and the judge approved it as the sandbox buyer, so it is not an invented customer. A judge verifies by: (1) the order id, capture id and refund id shown in the app; (2) the same refund visible in the sandbox buyer's and business's PayPal activity; (3) the raw API response and `PayPal-Debug-Id` in the drawer; (4) the arithmetic matching the captured amount. Test credentials for the sandbox buyer go in the submission text (rules require test access, VERIFIED-BROWSER).

## Schedule

| Date | Goal |
|---|---|
| Nov 3 | This plan. Alex signs in to the PayPal developer account (NEEDS.md). |
| Nov 4 | First-day slice, `npm run proof` green, kill-rule decision. |
| Nov 5 to 6 | Case view, claim extraction, refund computation, gate, receipt. |
| Nov 7 | Contradiction checks, policy clauses, error states, tests. |
| Nov 8 | Rehearse on the live URL with unseen messages. |
| Nov 9 | Video, README, form text. Submission-ready. |
| Nov 10 to 11 | Buffer. Alex submits; the agent does not. |

## Assumptions and weaknesses

1. Capture and refund paths match PayPal's published schema, but their sandbox behaviour stays an ASSUMPTION until `npm run proof` passes.
2. Gallery contents are unknown; a refund-focused entry may exist.
3. Innovation is the weakest criterion; the claim-verification angle must be visible in the first minute of the video.
4. Judges must do a PayPal sandbox login to create a fresh order; mitigated by a pre-captured order list and a video that shows the whole thing.
5. Shared sandbox business account: a daily refund cap and the rate limiter stop abuse.
6. Judging may include automated AI analysis (VERIFIED-BROWSER); the README therefore names real endpoints and files plainly.
