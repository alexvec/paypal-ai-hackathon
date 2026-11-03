# NEEDS

The agent creates the accounts and keys below, and redeems every partner credit or promo code in docs/competition.md before any payment card. The PayPal blog lists free credits from APIMatic, Render, Kernel, Channel3, Postman, Astropods, Elastic, AG Grid, and Bryntum; their amounts and steps were unverified and must be read on the partner pages before they are skipped. Alex steps in only for a payment card, government ID, a tax form, or a code he must type himself. Do not submit the entry.

What was checked on 2026-11-03, before this rule: GitHub and Vercel were already authenticated. PayPal sandbox keys and an LLM key were missing, and nothing had been created yet.

## Status at the needs check (2026-11-03)

- Available: GitHub push (`gh` logged in as alexvec, `repo` scope) and Vercel deploys (CLI logged in).
- Tried and not done: the PayPal sandbox app and joining the Devpost hackathon. Both need the browser, and the Chrome extension reported no connected browser, including on a fresh attempt in the follow-up run. The attempt never reached PayPal, so whether a sign-in screen would also block it is unknown. The packet continues in labelled mock mode.
- Partner credits: docs/competition.md records no promo code. It lists partners offering free credits, with terms and sign-up steps unverified, so nothing was redeemed. Signing up also needs the browser. Whether any credit could pay for model calls is unknown.
- Card: Alex decided the Vercel AI Gateway card stays with him. The agent adds no card.
- Model access: tried through Vercel AI Gateway on Alex's own Vercel team, with no pasted key. The gateway refuses calls until a card is on file: "AI Gateway requires a valid credit card on file to service requests." No card was added, so the model stays on labelled canned output.
- Limit on the agent: it does not create accounts or type passwords in the browser, even when asked. An account that does not exist yet, or a sign-in screen, is Alex's step.
- Decision: the build continues in labelled mock mode. Mock mode is not a submittable demo: the entry needs real keys in the deployed app before Alex films or submits.

## Exact remaining steps for Alex

1. Reconnect the Claude extension in Chrome (https://claude.ai/chrome, signed in to the same account as Claude Code) and resume the director. If developer.paypal.com and Devpost are already signed in, the agent can then create the sandbox app and join the hackathon.
2. Or do it by hand. At https://developer.paypal.com/dashboard/applications/sandbox, sign in or sign up, create a REST app, and put these in the entry's `.env`, using the variable names in `.env.example`: sandbox client ID and secret. Then resume the director, which adds them to Vercel and runs a real sandbox invoice.
3. Join the hackathon at https://paypalaihackathon.devpost.com/ if the agent could not, and work through the rules checklist below.
4. Add a card for the model: https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card (this unlocks the gateway's free credits, per its error message). Then check `/api/model-check` on the live URL. No redeploy is expected. Alternatively, supply another model key, which would need a code change in `src/lib/llm.ts`.

## Accounts and keys

1. Devpost account and hackathon registration. Needed to submit, and likely to see the rules. Alex does this in their own browser. The build can continue without it. No mock path, and submitting is Alex's act via submit.sh. Registration requirements are UNVERIFIED because Devpost returned 403.
2. PayPal Developer account (log in or sign up at developer.paypal.com, then respond to the verification email). The build can continue with mocks, but any real PayPal behavior needs it. Source: https://developer.paypal.com/api/rest/sandbox/
3. PayPal sandbox REST app credentials: client ID and secret (Developer Dashboard, Apps & Credentials). Needed for any real Orders API or agent toolkit calls. The build can continue without them. Fallback: a mock PayPal layer with clearly labeled fake responses. The sandbox itself is the free test path, and a new developer account includes a personal and a business sandbox account. Source: https://developer.paypal.com/api/rest/
4. LLM provider API key (provider not chosen; the product is not chosen here). The hackathon requires meaningful AI use, so a stubbed model would weaken the entry. The build can scaffold without a key. Fallback for development only: canned model responses, which should not be the submitted demo. A paid plan may be needed depending on provider and usage. Whether any provider is required or preferred by the hackathon is UNVERIFIED.
5. Deploy host account and token for the live URL (CLAUDE.md requires a responding live URL; the deployment is part of the build). Render is a hackathon sponsor with a Render credits prize, but any host works unless the rules say otherwise (UNVERIFIED). The build can continue locally without it. No mock path for the live URL itself.
6. A public repo location for pushing (GitHub account is already in use as alexvec). Confirm that push access is set up. Whether the repo must be public and open-source licensed is UNVERIFIED.

## Optional, only if the strategy stage targets them

- Sponsor and partner credits (APIMatic, Render, Kernel, Channel3, Postman, Astropods, Elastic, AG Grid, Bryntum): sign-up steps and terms are UNVERIFIED; the blog only lists them. Source: https://developer.paypal.com/community/blog/PayPal_AI_Hackathon. Not needed unless the strategy stage targets a sponsor prize.
- PayPal Business account: only needed to go live, not for the sandbox. Do not use real money. Source: https://developer.paypal.com/api/rest/
- Agent toolkit, MCP server, and Agentic Commerce Protocol access: exist per search snippets; the quickstart pages I tried returned 404. Auth requirements and sandbox availability are unconfirmed. Check https://developer.paypal.com/ai-tools/agent-tools. Best Use of Agentic Commerce is an award, so this may matter.

## Unverified rules Alex should check in a browser

Open https://paypalaihackathon.devpost.com/ and https://paypalaihackathon.devpost.com/rules (both returned 403 to the research tool) and confirm:

1. Exact submission cut-off time and time zone. The blog says Nov 12, 2026; a third-party listing says 13 Nov 2026, 1:30 AM IST.
2. Age of majority, restricted countries, employee and sponsor exclusions.
3. Solo entry allowed, and team size limits.
4. Demo video: maximum length, required host (a third-party listing says public YouTube, under 3 minutes), language or captions.
5. Repo requirements: public or private, required license (a third-party listing says open-source), and where hosted.
6. Required text fields and Devpost form fields.
7. Whether a live URL or working prototype is required, and how judges get testing access.
8. Judging criteria and weights (a third-party listing names five criteria, no weights).
9. Whether the project must be new or started inside the build window, and the rules on existing work and third-party code.
10. Rules for sponsor prizes (whether you must use the sponsor's product), and whether one project can win multiple prizes.
11. Disqualification rules, IP ownership terms, and prize payout and tax terms.
12. Which PayPal APIs or products count as meaningful PayPal use, and what counts as meaningful AI use.

After checking, update docs/competition.md so each rule shows VERIFIED with the URL.
