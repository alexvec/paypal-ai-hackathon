# Win plan: PayPal AI Hackathon

Written 2026-11-03. Rule status comes from docs/competition.md. Anything not VERIFIED there is an ASSUMPTION here and is labelled so. Nothing in this file changes the competition notes.

## Decision

Track: single product, "invoice agent" (working title: Billing Desk Agent). Full spec in docs/prds/01-invoice-agent.md.

One sentence: a small-business owner pastes or forwards the messy real-world thing that means "I'm owed money" (an email thread, a chat message, a job note, a photo of a handwritten tally). An AI agent turns it into a PayPal invoice through the PayPal agent toolkit, holds it behind a human approval gate, sends it, then watches the PayPal invoice status and chases or reconciles it.

## What the rules actually give us

| Fact from docs/competition.md | Status | What we do with it |
|---|---|---|
| Project must "meaningfully use both PayPal and AI" | VERIFIED (blog) | Both are load-bearing. See the removal test below. |
| No stack required; agent, app, automation, business tool all allowed | VERIFIED | A business tool built as an agent fits. |
| No prescribed tracks | VERIFIED | One product, aimed at several prizes. |
| Best Overall 12k/8k/5k; five honorable mentions at 5k including Best Demo Delivery, Best Use of PayPal + AI, Best Use of Agentic Commerce, Most Impactful, Most Creative | VERIFIED | See prize map. |
| Judging criteria | UNVERIFIED | Plan against the third-party lead (technical implementation, design, potential impact, innovation, presentation) as an ASSUMPTION only. No weights. |
| Demo video, repo, text description, live URL | UNVERIFIED | Plan to supply all four. Third-party lead says public video under 3 minutes and an open-source repo. Build to that cheaply. |
| Cut-off time | UNVERIFIED | Blog says Nov 12. Third-party conversion suggests about 20:00 UTC Nov 12. Treat that as binding. |
| Original-work / new-project rule | UNVERIFIED | Start fresh in this repo, commit history shows the work inside the build window. |

## Scoring the ideas

Scored against the assumed criteria (ASSUMPTION: technical implementation, design, impact, innovation, presentation, equal footing) and against the hard constraint that the work must be working, live and sandbox-backed within 9 days with one person. Scores 1 to 5, my judgement, not data.

| Idea | PayPal is the engine | AI is the engine | Buildable and demoable by Nov 9 | Demo clarity | Risk from unconfirmed APIs | Verdict |
|---|---|---|---|---|---|---|
| A. Invoice agent: messy input to PayPal invoice, approval gate, status watching and reminders | 5: invoices, products, reminders, payments, reporting all via toolkit | 5: multimodal extraction, pricing and catalog reasoning, tool-calling loop, drafting | 4 | 5: before/after on real input | Medium: sandbox invoice payment path unconfirmed, has an Orders fallback | CHOSEN |
| B. Buyer-side shopping agent with spending mandate (PRD 02) | 4: create_order, pay_order | 4 | 2: needs a merchant catalogue, and the real agentic checkout (ACP) is documented only for ChatGPT Apps + Braintree | 4 | High | Runner-up, rejected |
| C. Dispute triage agent (list_disputes, get_dispute, accept_dispute_claim) | 3 | 4 | 1: sandbox disputes are hard to create on demand, so the demo would rest on seeded fiction | 2 | High | Rejected |
| D. Generic "chat with your PayPal data" over reporting tools | 2 | 3 | 4 | 2 | Low | Rejected: reads as a wrapper |
| E. Wide combo of invoices + subscriptions + disputes + tracking | 3 | 3 | 1 | 2 | High | Rejected: shallow on each |

### Why the others lose

- B loses on feasibility and honesty. The one agentic checkout flow PayPal documents (https://developer.paypal.com/agent-ready/agentic-commerce-protocol, opened and read) is a ChatGPT Apps SDK app with Braintree as provider and a `payment_mode` test flag. It does not use the PayPal REST sandbox and needs a ChatGPT developer-mode setup judges cannot run. Building B on toolkit `create_order`/`pay_order` alone needs an invented merchant, which makes the demo a closed world we wrote ourselves.
- C loses because the demo input would be fabricated disputes. We cannot show it on real input.
- D and E lose the rule "deep use of one partner technology beats shallow use of several." D is read-only; E spreads thin.

## Why A wins

1. Deep use of one partner technology. The PayPal agent toolkit (`@paypal/agent-toolkit`, confirmed on https://github.com/paypal/agent-toolkit, npm install, Node 18+, Vercel AI SDK / OpenAI / LangChain / MCP, sandbox supported) carries the whole lifecycle: `create_product`, `create_invoice`, `send_invoice`, `send_invoice_reminder`, `get_invoice`, `list_invoices`, `generate_invoice_qr_code`, `record_payment_for_invoice`, `get_merchant_insights`. These tool names were seen on the toolkit README and the agent-tools page. One partner, many tools, one coherent job.
2. Removal test. Without PayPal, there is no invoice, no payment link, no status to watch, so the agent has nothing to act on. Without AI, the user must hand-key line items, which is exactly the chore the product removes, and the messy-input step cannot be done by a form. Neither is decoration.
3. The demo is checkable. A judge pastes their own text, sees the structured invoice, approves, and opens the real sandbox invoice in PayPal. No fabricated customers needed: the judge supplies the input.
4. It has a business owner who pays (see PRD).

### Prize map

| Prize (all VERIFIED to exist) | Fit | Honest note |
|---|---|---|
| Best Overall | Primary target | Depends on assumed criteria. |
| Best Use of PayPal + AI | Strong. The toolkit does the work. | Judging definition of "meaningful" UNVERIFIED. |
| Best Demo Delivery | Strong, by design. The demo script, the three-minute cut and a one-click sample are in scope. | Judged on the video most likely. Budget real time for it. |
| Best Use of Agentic Commerce | Moderate. The agent holds delegated authority to bill on a person's behalf, under a policy and approval gate, and follows up autonomously. | This is merchant-side agentic commerce. It does not implement PayPal's Agentic Commerce Protocol, and we will not claim it does. |
| Most Impactful / Most Creative | Possible, secondary. | Do not chase. No market statistics will be quoted unless sourced. |
| Render sponsor prize | Cheap add-on: deploy on Render if the free tier suffices. | Sponsor terms UNVERIFIED. Use only if it costs no time. |
| AG Grid, APIMatic, Bryntum, Channel3 | Ignored. | Bolting them on is the shallow-use trap. |

## Plan to the deadline

Today is Nov 3. Binding deadline: assume Nov 12 about 20:00 UTC (noon Pacific). Target "submission-ready" Nov 9, leaving three days of buffer.

| Date | Goal |
|---|---|
| Nov 3 | Strategy done (this file). Alex clears NEEDS items 2, 3, 4, 5. |
| Nov 4 (first build day) | Live URL responding with the first-day slice from the PRD. Pushed repo. |
| Nov 5 to 6 | Approval gate, send, status watch, reminders, record payment. |
| Nov 7 | Photo/handwriting input, policy limits, error handling, honest empty states. |
| Nov 8 | Demo script, sample inputs, seeded sandbox data, rehearse on the live URL. |
| Nov 9 | Video, README, form text, REVIEW.md. Submission-ready. |
| Nov 10 to 11 | Buffer, fixes, Alex reads the Devpost rules and reconciles. |

Alex submits personally via submit.sh. Nothing in this plan registers, uploads or posts.

## Assumptions that would change the choice

1. If the Devpost rules require a specific partner technology for eligibility (UNVERIFIED), recheck. Today no such rule is known.
2. If judging weights heavily favour agentic commerce specifically, PRD 02 becomes more attractive, but its feasibility problems stand. Reconsider only if a way to run it on REST sandbox appears.
3. If the sandbox cannot let a payer pay an invoice (UNCONFIRMED: the invoicing pages opened did not mention sandbox behaviour or `recipient_view_url`), the pay leg switches to an Orders v2 checkout link, which is documented (create order with `intent: CAPTURE`, `approve`/`payer-action` link, capture endpoint). The product narrows from "invoice" to "payment request." The idea survives.
4. If a live URL is not required, effort shifts from hosting polish to the video. If a public open-source repo is required, add a licence (UNVERIFIED rule, cheap to satisfy).
5. If the rules bar pre-existing code or limit team size, nothing changes: this is a fresh solo build.
6. If the toolkit cannot run server-side with client ID and secret as the README implies, fall back to direct REST calls from our own tool definitions given to the LLM. This weakens the "partner technology" claim and the PRD would be revised first.

## Unconfirmed technical items (flagged, not designed around)

- Whether `send_invoice` in sandbox emails a sandbox payer inbox and how a judge reaches the payable page. The `recipient_view_url` field was not seen in any page opened. Check the invoicing schema at https://developer.paypal.com/api/invoicing/v2/schema.json before building the pay step.
- Whether `record_payment_for_invoice` marks an invoice as paid in sandbox. Same schema check.
- The toolkit README example uses clientId and clientSecret in the TypeScript constructor; `PAYPAL_ACCESS_TOKEN` is used for MCP. Sandbox tokens last about 3 to 8 hours per the README, so the app must refresh tokens.
- Sandbox access tokens, scope for Invoicing on a default app: not confirmed. Check on day 1 with a single `create_invoice` call.
- The remote MCP `commerce:true` feature flag is documented for gift cards only. Not used.
- The quickstart pages that 404ed earlier were not needed. The GitHub README was readable.
