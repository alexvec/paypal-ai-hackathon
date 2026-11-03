# NEEDS

Status as of 2026-11-03. The invoice-desk product is dropped; this is a rebuild.

## Current facts

- GitHub push works (`gh` logged in as alexvec, `repo` scope). Vercel deploys work (CLI logged in). Live URL: https://paypal-ai-hackathon-phi.vercel.app
- Model: live in production as `gateway/deepseek/deepseek-v4.1-flash`. Alex said not to change `LLM_MODEL`, not to add a card, and not to top up. None of those is needed.
- PayPal: no sandbox app and no keys exist. In Chrome, https://developer.paypal.com/dashboard/applications/sandbox redirects to the PayPal sign-in screen (paypal.com/signin). Chrome is not signed in to PayPal.
- Devpost: logged out in Chrome. The hackathon is not joined.
- Partner credits: no code is published anywhere I could open. Terms are unverified and listed in docs/competition.md under "Credits and conditions". None is needed for the sandbox, which is free. Nothing for the agent to redeem yet.
- Rules: the Devpost rules were read in Alex's browser by the director and are recorded in docs/competition.md. The earlier list of rules for Alex to check is closed.

## Exact remaining step for Alex

Sign in to, or create, the PayPal developer account at https://developer.paypal.com in Chrome (an existing PayPal login works, per the rules page). Complete any verification email or captcha. After that, the agent creates the sandbox REST app, writes the client ID and secret to `.env`, and sets them on Vercel.

## After that, the agent does

- Create the sandbox REST app and read the default sandbox business and personal accounts.
- Check whether Invoicing, Payouts, Disputes, Subscriptions and Transaction Search work on the sandbox business account, and record the result in docs/competition.md, but only for the capabilities the chosen product uses.
- Read a partner's own page before claiming any partner credit, and only if the chosen product uses that partner.

## Alex's acts, not the agent's

- Join the hackathon with "Join Hackathon" on a Devpost account (Devpost is logged out; the agent was told not to sign up for anything).
- Submit the entry, upload the video to YouTube, and send the form. The agent does not do these.
- If the entry wins: the affidavit and tax form (W-9 or W-8BEN). Source: https://paypalaihackathon.devpost.com/rules (read in browser by the director 2026-11-03).

## Still missing for the build

Nothing else. No payment card, government ID or tax form is needed to build. Stop and add a line here only if a captcha, card, ID or tax form appears.
