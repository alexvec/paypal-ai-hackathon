# PRD 02: Mandate-bound buyer agent (runner-up, not chosen)

Status: NOT CHOSEN. Kept because Best Use of Agentic Commerce is a verified prize and this is the most literal reading of it. Reasons for rejection are in docs/win-plan.md.

## User

A small team lead or household manager who buys recurring supplies or services and wants an agent to do the shopping within a budget they set. No named person or company is invented.

## Job to be done

"Buy what I asked for, within the limit I set, from a merchant I allow, and show me the cart before any money moves."

## Partner capability that does the work

PayPal agent toolkit payment tools: `create_order`, `get_order`, `pay_order`, `get_refund`, `create_refund` (names from https://github.com/paypal/agent-toolkit). The Orders v2 flow is documented (`POST /v2/checkout/orders`, `approve` or `payer-action` link, capture). Payer approval happens in the PayPal sandbox UI. The agent selects items, enforces the mandate, creates the order and hands the buyer an approval link.

Not confirmed: whether `pay_order` can complete a payment in sandbox without the payer approving in a browser. The Agentic Commerce Protocol page (https://developer.paypal.com/agent-ready/agentic-commerce-protocol, read) covers a ChatGPT Apps SDK app with Braintree as provider and a `payment_mode` test flag. It names no PayPal REST sandbox flow. The toolkit's remote MCP `search_product`, `create_cart`, `checkout_cart` tools are documented for gift cards only and need `x-feature-flags: commerce:true`. We do not design around either.

## What the demo must show on real input

A judge types a purchase request. The agent proposes a cart with prices, checks it against the mandate, creates a sandbox order, and the judge approves as the sandbox buyer. Problem: the "merchant" and its catalogue would be ours. The demo input is real but the other side of the market is invented, which a judge can discount.

## First-day slice

Live URL with a seeded demo catalogue labelled "DEMO CATALOGUE, authored for this entry", a request box, a cart proposal, and one `create_order` against sandbox returning an approval link. Mock path, if keys are missing: labelled MOCK as in PRD 01.

## Who pays

The buyer's organisation, via a subscription for mandate controls and audit trail. Unvalidated hypothesis. No figures.

## What would make a judge call it a wrapper

- The LLM picks from ten items in a list we wrote and PayPal is a single order call.
- The mandate lives in prompt text.
- No real merchant on the other side, so "commerce" is a simulation.
- Claiming ACP or Instant Checkout compatibility without implementing it.

## Why not chosen, in one line

Highest thematic fit with agentic commerce, lowest feasibility and the weakest "real input" story within nine days.
