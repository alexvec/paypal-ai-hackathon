# NEEDS

Status as of 2026-11-03. The invoice-desk product is dropped and removed. Refund Referee is built and deployed, and has not been run against PayPal.

## Current facts

- GitHub push works (`gh` logged in as alexvec, `repo` scope). Vercel deploys work (CLI logged in). Live URL: https://paypal-ai-hackathon-phi.vercel.app
- Model: live in production as `gateway/deepseek/deepseek-v4.1-flash`. Alex said not to change `LLM_MODEL`, not to add a card, and not to top up. None of those is needed.
- PayPal: no sandbox app and no keys exist. In Chrome, https://developer.paypal.com/dashboard/applications/sandbox redirects to the PayPal sign-in screen (paypal.com/signin). Chrome is not signed in to PayPal.
- Devpost: logged out in Chrome. The hackathon is not joined.
- Partner credits: no code is published anywhere I could open. Terms are unverified and listed in docs/competition.md under "Credits and conditions". None is needed for the sandbox, which is free. Nothing for the agent to redeem yet.
- Rules: the Devpost rules were read in Alex's browser by the director and are recorded in docs/competition.md. The earlier list of rules for Alex to check is closed.

## Exact remaining step for Alex

Sign in to, or create, the PayPal developer account at https://developer.paypal.com in Chrome (an existing PayPal login works, per the rules page). Complete any verification email or captcha. After that, the agent creates the sandbox REST app, writes the client ID and secret to `.env`, and sets them on Vercel.

Until then, no real PayPal call can run. The build is code-complete but unproven against PayPal. `npm run proof` stops with `not connected: PAYPAL_CLIENT_ID missing`.

## After that, the agent does

- Create the sandbox REST app and read the default sandbox business and personal accounts.
- Set `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` in `.env` and on the Vercel project (Production), and redeploy. No code change is needed.
- Run `npm run proof`. Its one human step is signing in as the sandbox buyer to approve the order, within 10 minutes. Fix whatever it shows, and apply the kill rule in docs/win-plan.md if capture or refund cannot be made to work.
- Walk docs/demo-path.md on the live URL, and tick the build box in STATE.md once a real sandbox refund has run.
- Read a partner's own page before claiming any partner credit, and only if the chosen product uses that partner.

## Alex's acts, not the agent's

- Join the hackathon with "Join Hackathon" on a Devpost account (Devpost is logged out; the agent was told not to sign up for anything).
- Submit the entry, upload the video to YouTube, and send the form. The agent does not do these.
- If the entry wins: the affidavit and tax form (W-9 or W-8BEN). Source: https://paypalaihackathon.devpost.com/rules (read in browser by the director 2026-11-03).

## Still missing for the build

Nothing else. No payment card, government ID or tax form is needed to build. Stop and add a line here only if a captcha, card, ID or tax form appears.
