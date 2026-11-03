# Demo path

`e2e/demo-walk.spec.ts` walks this path against real services. There is no stub in it.

**This path has not been run end to end.** No PayPal sandbox keys exist yet, so steps 2 to 7 have never run against PayPal. Today, only "Open the app" and "Model only" work on the live URL.

## Run it for recording

```
DEMO_URL=https://paypal-ai-hackathon-phi.vercel.app DEMO_RUN_MODEL=1 DEMO_SLOWMO=600 DEMO_VIDEO=1 npm run demo:walk -- --headed
```

- Without `DEMO_URL`, the walk starts the app locally on port 3100.
- `DEMO_RUN_MODEL=1` allows the model-only step, which spends one real model call.
- `DEMO_MESSAGE="..."` replaces the partial-claim message with your own words. Use your own for the recording. The default is labelled fictional.
- The PayPal test skips itself until the deployment reports sandbox credentials.

## Before filming

- `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` are set on the deployment, and `npm run proof` has passed.
- The page shows "PayPal sandbox: credentials set" and the model id.
- The sandbox buyer login is ready. The sandbox business login is ready in a second browser profile, to show the refund on PayPal's side.

## Open the app

The page shows the connection state. With no keys, it says `PayPal sandbox not connected: PAYPAL_CLIENT_ID missing, PAYPAL_CLIENT_SECRET missing.` and the create button is off. No ids appear.

## Model only (works today)

With no captured order selected, write a message, or click "Fill a fictional example", then click "Read with the model". This is a real model call. The page shows the validated JSON and says "No PayPal record was read and no refund decision was made."

## The demo (needs sandbox keys)

1. **Say the problem.** A shop owner answers refund emails alone, and the right answer depends on facts PayPal holds. First 20 seconds.
2. **New test purchase.** Leave 2 mugs and 1 tea tin selected, for $45.50. Click "Create sandbox order". The order id appears.
3. **Approve.** Click "Approve as the sandbox buyer", sign in on PayPal's page and pay. This step is manual. PayPal returns to the app, which captures. The record shows the capture id, status `COMPLETED`, and $45.50 left. If the redirect fails, use "capture now".
4. **A contradictory message.** Write that a teapot leaked. The teapot is not on the order. The case flags "item not in order", the outcome is Deny, and there is no approve button.
5. **A partial claim, in your own words.** Write that one mug arrived cracked and that you paid $60. The case flags the $60 against PayPal's $45.50. The proposal shows the arithmetic: 1 x $14.00, plus $1.12 tax, no shipping, for $15.12.
6. **Approve.** Click "Approve: refund $15.12 in the sandbox". The receipt shows the refund id, the status read back from PayPal, the request id, the debug ids and the raw responses. PayPal's record now shows `PARTIALLY_REFUNDED` and $30.38 left.
7. **Check it on PayPal's side.** Open the sandbox business account in the second profile and show the same refund id. This step is manual and not in the walk.
8. **Blocked by PayPal's data.** Reload the page and pick the order from "Your orders". Claim both mugs. The record shows one already refunded, so the proposal covers only the one left, and flags the other.
