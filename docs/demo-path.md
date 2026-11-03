# Demo path

Written from the demo steps in docs/prds/01-invoice-agent.md. `e2e/demo-walk.spec.ts` walks the parts that happen on this app, with the fictional sample note.

Record only when no red banner is showing. A red banner means mock PayPal or canned model output, and neither goes in the demo. `DEMO_REQUIRE_REAL=1 npm run demo:walk` fails if one is showing.

Run it for recording:

```
DEMO_URL=<live url> DEMO_SLOWMO=600 DEMO_VIDEO=1 npm run demo:walk -- --headed
```

Without `DEMO_URL` the walk starts the app locally on port 3100.

## Before filming

- PayPal sandbox keys are set in the deployment, so the banner reads `PayPal SANDBOX`.
- The model banner reads `Live AI`.
- A sandbox business account login and a sandbox personal account login are ready in a second browser profile.

## Steps

1. Input. Paste a genuine messy note, or a paragraph a judge supplies. The walk uses the fictional sample from "Load sample". Click "Propose invoice".
2. Proposal. Show the source phrases highlighted against each numbered line, and the flagged ambiguity: the sample's "two or three hours" has no quantity, and the spool of cable is not on the rate card. Show that the approve button stays off until a person resolves them. Fill in the quantity and the price.
3. Approve. Click "Approve: create draft in PayPal sandbox". The invoice id and the status read back with `get_invoice` appear. Open the invoice in the sandbox business account in a second tab to show it exists. This second-tab step is manual.
4. Pay it. Click "Approve and send", then pay as the sandbox personal buyer, refresh, and show the status change returned by `get_invoice`. UNCONFIRMED: how a sandbox payer reaches a payable invoice has not been tested. If it does not work, the PRD's fallback is an Orders v2 payment link. This step is manual and not in the walk.
5. Second invoice. Set the invoice date 30 days back, approve, send, then click "Ask the agent what to do next". The tool calls are visible. The agent proposes a reminder, and nothing goes out until "Approve and send reminder".
6. Third invoice. Create and send it, type "They paid cash in full yesterday." as the note, ask the agent, and approve the recorded payment. The status changes to what `get_invoice` reports.
7. Policy. Set a quantity that takes the total over the limit and click approve. The server answers "Blocked by policy", and no invoice appears.

## Timing

The under-three-minutes limit is an UNVERIFIED lead (docs/competition.md). Plan for it anyway.
