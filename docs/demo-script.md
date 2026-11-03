# Demo script: Billing Desk Agent

Timed for under 3 minutes. Target running time 2:45.

## Cannot be filmed yet

**Do not film until real modes are on.** The submission checklist fails if a mock or canned banner shows (docs/prds/01-invoice-agent.md, docs/demo-path.md). As of 2026-11-03 the live app shows the red "MOCK PayPal. No request was sent to PayPal. Invoice ids are fake." banner and the green "Live AI: gateway/deepseek/deepseek-v4.1-flash" banner. It accepts non-sample text. No real PayPal sandbox call has ever completed.

What unlocks it, held by Alex (NEEDS.md): PayPal sandbox client id and secret set in the deployment, so the banner reads `PayPal SANDBOX`. The model side is done: the banner already reads `Live AI`.

Try a photo before filming the photo beat. Image input has not been run on the current model.

Check before filming: `GET /api/model-check` on the live URL reports a live model, and `DEMO_REQUIRE_REAL=1 npm run demo:walk` passes.

**The under-3-minutes, public YouTube rule is an unverified third-party lead** (docs/competition.md). Aim under 3 minutes anyway. Confirm the real limit and host on the Devpost rules tab. This script does not upload anything. Alex uploads.

Every line marked `[CONFIRM]` describes something that has not happened yet. If it does not happen on the take, do not narrate it as if it did. Use the fallback in the last section.

## Before the take

- Two browser profiles: one on the live app, one signed in to the PayPal sandbox business account, plus the sandbox personal account login ready to pay.
- A genuine messy note from Alex's own work, with details he is willing to show. A fictional sample is the fallback, and must be said to be fictional on screen.
- In the proposal, the Email field is editable. For the pay beat, set it to the sandbox personal account's email so the sandbox payer can receive the invoice. Whether a sandbox payer reaches a payable invoice is UNCONFIRMED.
- Rate card on screen shows prices that Alex is willing to show. They are editable.
- Rehearse once. Screen record at a size where the banners and the status badge are readable.

Optional recorded run of the in-app parts (not the PayPal tabs):

```
DEMO_URL=https://paypal-ai-hackathon-phi.vercel.app DEMO_SLOWMO=600 DEMO_VIDEO=1 npm run demo:walk -- --headed
```

## Timed script

| Time | On screen | Say |
|---|---|---|
| 0:00 to 0:15 | Slide 2, or a real messy chat on screen. | "A small service business finishes a job and the proof is a chat message, an email thread or a photo of a tally. Turning that into a correct invoice, and chasing it, is retyping. A form can't read it." |
| 0:15 to 0:35 | Live URL. Point at the banners: `PayPal SANDBOX` and `Live AI`. Paste the genuine note. Click "Propose invoice". | "This is Billing Desk Agent. The banners show what is real: PayPal sandbox and a live model. I paste a real note and ask for a proposal." `[CONFIRM R7, R11]` |
| 0:35 to 1:05 | The proposal. Hover the highlighted phrases against the numbered lines. Point at a flagged ambiguity and the question. Show the approve button disabled. Fill in the quantity and, for an unmatched line, a price. | "Each line points back to the words in my note. Prices come from my rate card, never from the model. Anything it can't match is flagged, not priced. 'Two or three hours' isn't a quantity, so it asks me, and approve stays off until I answer." |
| 1:05 to 1:25 | Click "Approve: create draft in PayPal sandbox". The invoice id and status appear. Switch to the second profile and open the invoice in the sandbox business account. | "Nothing reaches PayPal until I click. The app calls the PayPal agent toolkit's create_invoice, then reads the invoice back with get_invoice. This id and status are what PayPal returned, and here is the same invoice in the sandbox account." `[CONFIRM R1, R2]` |
| 1:25 to 1:45 | Click "Approve and send". In the personal sandbox profile, open and pay the invoice. Back in the app, click "Refresh status". | "Sending is a second approval. Now I pay it as the sandbox buyer, refresh, and the status changes as PayPal reports it." `[CONFIRM R3, R4. UNCONFIRMED path. See fallback.]` |
| 1:45 to 2:15 | Second invoice, date set 30 days back, already sent. Click "Ask the agent what to do next". Open "Tool calls". Show the reminder waiting for approval, then click "Approve and send reminder". Then a third invoice: type "They paid cash in full yesterday." in the note, ask the agent, approve the recorded payment. | "Now the chase agent. It is a model in a tool loop, and it can only read and propose. It reads the invoice, sees it is overdue by my rule, and proposes a reminder. Here are its tool calls. I approve and it goes out. On another invoice I tell it the client paid cash. It proposes recording that, and the status updates." `[CONFIRM R5, R6, R9]` |
| 2:15 to 2:30 | Over-limit quantity, click approve, show "Blocked by policy". Then slide 6. | "The limit and currencies are enforced in server code, so a prompt can't talk its way past them. Without PayPal there is nothing to create, send or watch. Without the model I retype everything. Both are doing the work." |
| 2:30 to 2:42 | Slide 9. | "Who pays: a small service business, by a small subscription or flat fee. That's a hypothesis, I'm not claiming numbers. It is merchant-side and doesn't use PayPal's Agentic Commerce Protocol." |
| 2:42 to 2:50 | Slide 10, URLs. | "Next: confirm the sandbox payer path end to end and add due dates and QR codes. The app and source are linked below." |

Narration is about 330 words. Cut the policy block first if the take runs long.

## Manual sandbox steps (not in the Playwright walk)

1. Open the sandbox business account at developer.paypal.com (Testing Tools, Sandbox Accounts, open the business account) in the second profile. Find the invoice created by the app and show it exists. Where invoices appear in the sandbox dashboard has not been checked. The app also shows "Business view" and "Payer view" links if PayPal returns them, which is UNCONFIRMED.
2. Pay it as the sandbox personal account. UNCONFIRMED how a sandbox payer reaches a payable invoice. Candidates to try, in order: the "Payer view" link if the app shows one; the invoice email in the sandbox personal account's inbox; the sandbox personal account's PayPal activity.
3. Back in the app, click "Refresh status". The badge changes only if PayPal changed it.

## Sandbox behaviour is unconfirmed: what to do if it differs

Test all of this off camera first. Never narrate a result that did not happen.

- **No payer link, or the sandbox payer cannot pay.** Cut the 1:25 to 1:45 pay beat. Show status moving to SENT after "Approve and send", say "paying it in the sandbox is untested", and spend the time on the chase and cash-payment beats. The PRD's fallback (a payment request via Orders v2) is not built in this repo. Do not claim it.
- **`send_invoice` errors.** The app shows the error text. Show it, and do not film send, remind or record on that invoice.
- **No `recipient_view_url`.** Skip the links. Open the invoice from the sandbox dashboard instead.
- **Reminder not offered.** The agent proposes one only if the invoice is SENT, UNPAID, PARTIALLY_PAID or SHARED and overdue by the owner's rule (default 14 days after the invoice date; a PayPal due date wins if present). Set the invoice date earlier.
- **`record_payment_for_invoice` does not change the status.** Say what the badge shows, nothing more. Cut the cash beat if it errors.
- **A mock or canned banner shows.** Stop. Do not film.
- **Image input.** Not in this timed cut. Add a photo beat only after R8 passes, and only if time allows.

## After the take

Alex uploads the video himself. Nothing here uploads, posts or submits. Add the URL to docs/submission.md under Links.
