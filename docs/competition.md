# Competition rule book: PayPal AI Hackathon

Rewritten 2026-11-03 for the rebuild. The earlier invoice-desk product is dropped; nothing here assumes it.

Status key:
- VERIFIED-BROWSER: "read in browser by the director 2026-11-03". The Devpost pages return HTTP 403 to the research tool, so the director read them in Alex's browser and relayed the content. I did not open them myself.
- VERIFIED: a page I opened and read, with the URL.
- THIRD-PARTY: a page I opened that is not official. A lead only, never a rule.
- SNIPPET: search-result text only, page not opened. A lead only.
- UNVERIFIED: not on any page opened.

## Sources

| Source | URL | Result |
|---|---|---|
| Devpost rules | https://paypalaihackathon.devpost.com/rules | 403 to the tool. Read in browser by the director 2026-11-03 (VERIFIED-BROWSER) |
| Devpost overview | https://paypalaihackathon.devpost.com/ | 403 to the tool. VERIFIED-BROWSER |
| Devpost project gallery | https://paypalaihackathon.devpost.com/project-gallery | VERIFIED-BROWSER: "The hackathon managers haven't published this gallery yet" |
| PayPal announcement blog | https://developer.paypal.com/community/blog/PayPal_AI_Hackathon | Opened. VERIFIED. No credit terms on it |
| PayPal Dev Days 2025 winners | https://developer.paypal.com/community/blog/winners-dev-days-hackathon/ | Opened. VERIFIED. A different event |
| PayPal docs pages | listed under "PayPal capabilities" | Opened. VERIFIED |
| Internshala, Parsec AI Labs, a GitHub planning repo | see below | THIRD-PARTY, used only to cross-check |

## Dates (rules page, VERIFIED-BROWSER: https://paypalaihackathon.devpost.com/rules)

- Submission period: Oct 1, 2026 9:15 am PT to Nov 12, 2026 12:00 pm PT.
- Judging: Dec 1 to Dec 15, 2026.
- Winners: around Dec 21, 2026.
- Cross-check, THIRD-PARTY: Internshala gives Nov 13, 2026 1:30 AM IST (https://internshala.com/competitions/?p=13021), which is Nov 12 12:00 pm PST by my conversion. Parsec AI Labs says Nov 12 12:00 PM PST (https://parsecailabs.com/en/blog/paypal-ai-hackathon/). A planning repo says "Thursday, Nov 12 at 1:00 p.m. Phoenix time" (https://github.com/aaravbodla/PAYPAL-AI-HACKATHON), the same instant. All agree with the rules page.
- The blog gives Oct 1, Nov 12 and Dec 21 without a time (VERIFIED, https://developer.paypal.com/community/blog/PayPal_AI_Hackathon).
- Today is 2026-11-03: about 9 days remain. Alex submits well before the cut-off.

## Eligibility (VERIFIED-BROWSER, rules page)

Correction: the previous version of this file said the blog lists "No formal eligibility rules". That was a misquote and is withdrawn. The rules page has formal eligibility terms, below.

- Open to individuals at least the age of majority where they reside, teams, and organizations.
- Excluded: residents where law prohibits, including Brazil, Quebec, Russia, Crimea, Cuba, Iran, North Korea and OFAC comprehensively sanctioned countries; sponsor and administrator staff and agents and their immediate family and household; judges and their employers; affiliates; anyone with a conflict of interest.
- Register with "Join Hackathon" on a Devpost account. Devpost is logged out in Alex's Chrome (see NEEDS.md).
- PayPal sandbox: use an existing PayPal account or a free account at developer.paypal.com.
- Overview page: individual or team; new or existing project with meaningful progress.

## Project requirements (VERIFIED-BROWSER, rules page and overview)

- Build or update an app integrating the PayPal developer platform (free sandbox) with an AI tool, model or platform of choice. PayPal services include Venmo, Braintree, Xoom, Honey, Zettle, Paidy, Hyperwallet, Simility, Swift Financial.
- "Any AI tool works, as long as PayPal integration is central to the project."
- Partner tools are optional: AG Grid, APIMatic, Astropods, Bryntum, Channel3, Elastic, KERNEL, Postman, Render, Zapier.
- Functionality: must run consistently and function as depicted in the video and text.
- New, or significantly updated during the submission period, with an explanation of what changed.
- Overview: identify which tools (model or AI service) were used and explain how.
- The blog confirms "meaningfully use both PayPal and AI", no tracks, any form (VERIFIED, https://developer.paypal.com/community/blog/PayPal_AI_Hackathon).

## Required submission (VERIFIED-BROWSER, rules page)

1. Text description of features.
2. Functional demo: setup instructions in the repo OR a hosted URL. "A design mockup, static prototype, or non-functional demo does not meet this requirement."
3. Public repo on GitHub, Bitbucket or GitLab with all source, assets and instructions, and an open source license detectable in the repo About section.
4. Video under 3 minutes (judges need not watch beyond), showing the project working on its device, public on YouTube, with no third-party trademarks or copyrighted music or material without permission.

Devpost form field names beyond these: UNVERIFIED.

## Testing access, IP, and language (VERIFIED-BROWSER, rules page)

- Free access for judges until judging ends. Include test credentials, API keys or sandbox logins needed. Judges may judge from text, images and video alone.
- Materials in English, or with translation.
- Original work solely owned by the entrant. Third-party technical help is allowed if the components are the entrant's own work and idea. Open source is allowed when built upon.
- No project with financial or preferential support from the sponsor or administrator.
- Multiple submissions must be substantially different.

## Judging (VERIFIED-BROWSER, rules page)

- May include expert panels, peer review, and automated AI-driven analysis.
- Stage One, pass/fail: reasonably fits the theme and reasonably applies the required APIs/SDKs.
- Stage Two, equally weighted:
  1. Technological Implementation: how thoroughly and skillfully it uses the PayPal Developer Platform and AI; genuine, working, non-trivial.
  2. Design: a complete, coherent product experience, not just a proof of concept.
  3. Potential Impact: a credible, specific case for a real problem and real audience, addressed by what is demonstrated.
  4. Innovation/Idea: creative, novel, differs from existing concepts.
  5. Presentation: the video shows it working end to end; what problem, who for, why it matters.
- Ties break in that criteria order.
- Implication, my inference: Innovation is one fifth of the score, and a product that copies a gallery entry loses there.

## Prizes (VERIFIED-BROWSER, rules page; the blog agrees on the amounts)

- Grand: $12,000, $8,000, $5,000.
- Honorable mentions, $5,000 each: Most Creative, Most Impactful, Best Demo Delivery, Best Use of PayPal + AI, Best Use of Agentic Commerce.
- Sponsor prizes: AG Grid $5,000 / $2,000 / $1,000 x3; APIMatic $1,000 + 6 months business subscription x3; Bryntum $1,000 x3; Channel3 $1,500; Render credits $1,000 / $750 / $500.
- Maximum one Grand and one Sponsor, or one Honorable Mention and one Sponsor. Sponsor prizes need use of that sponsor's tools.
- Winners must complete an affidavit and tax forms (W-9 or W-8BEN). That is Alex's act if the entry wins.

## Disqualification

The rules page text relayed to me lists no separate disqualification section. Grounds implied by the verified rules: non-functional demo, a non-public repo or one without a detectable license, a video over the limit or with unlicensed material, an ineligible entrant, sponsor or administrator support. A full disqualification clause: UNVERIFIED.

## Credits and conditions

Summary: no promo code is published on any page I could open. The PayPal blog says partners are "offering free credits to help you build" but gives no amounts, links, codes, eligibility or expiry (VERIFIED, https://developer.paypal.com/community/blog/PayPal_AI_Hackathon). The Devpost pages may carry the claim steps; the director's relay did not include them. Every amount below is THIRD-PARTY or SNIPPET and must be treated as unverified until read on the partner's own page. No code is recorded because none was found; where a code is issued later, that is unverified.

| Partner | What the official blog says | Amount and terms found | Source and status |
|---|---|---|---|
| Channel3 | "One API for clean product data across 100M+ items, no scraping." | Standard free tier: 1,000 free API credits per month, key generated at account creation, no card stated. A third-party note claims 20,000 credits for hackathon keys: UNVERIFIED. Official FAQ page opened (https://channel3.ai/docs/faq) says nothing on credits | Free tier is a search SNIPPET of docs.trychannel3.com. Hackathon amount UNVERIFIED |
| APIMatic | "Give your AI agent instant PayPal context with APIMatic's Context Plugin." | PayPal plugin installs with `npx context-plugins install paypal` for Claude Code, Cursor, VS Code, Codex (VERIFIED, https://www.apimatic.io/product/context-plugins). "Start Free Trial" with no stated length; no hackathon offer or card terms on the page. The PayPal blog says the plugin is in beta (VERIFIED, https://developer.paypal.com/community/blog/A New Context Plugin for AI-Assisted Coding with PayPal SDKs). A snippet of a participant note claims 1 month Basic free: UNVERIFIED | Plugin VERIFIED. Credit UNVERIFIED |
| Render | "Deploy and orchestrate AI agents at scale with Render Workflows." | A note claims $50 in participant credits via a claim portal: UNVERIFIED. Render credits as a prize ($1,000 / $750 / $500) are not a partner credit | UNVERIFIED |
| Kernel | "Cloud infrastructure so your AI agents can browse and act on the internet." | A note claims $50 via a claim code: UNVERIFIED | UNVERIFIED |
| Elastic | "Fast hybrid and vector search, built for AI." | A note claims a 14-day trial extendable by 30 days: UNVERIFIED | UNVERIFIED |
| Postman | "Design, test, and document your APIs on the platform developers already know." | Standard free access only, per a snippet | UNVERIFIED |
| Astropods | "Agent-native infrastructure to build, deploy, and run AI agents." | No amount found | UNVERIFIED |
| AG Grid | "Build self-serve dashboards... AI assistant... with AG Studio" | No credit found. Prize only | UNVERIFIED |
| Bryntum | "High-performance Gantt, Scheduler, Calendar, and Grid web components..." | No credit found. Prize only | UNVERIFIED |
| Zapier | Not on the blog; named only on the rules page (VERIFIED-BROWSER) | Nothing found | UNVERIFIED |

For each of the above, the fields I could not fill from an opened official page are: page where it is entered, who can claim it, products it pays for, exclusions, expiry, and whether a payment method is required afterwards. All are UNVERIFIED. A GitHub issue titled "Redeem hackathon sponsor credits and track every no-card offer" (tareq7/sellerpilot-ai) was a search snippet; its page is private and showed nothing.

Credits for the model: none found. No partner offers model-call credit. Model access is already live (see NEEDS.md).

Next step for the build agent: the sandbox needs no credit. Read the partner's own page (not the blog) before claiming any partner credit, and only claim one if the chosen product uses that partner. A sponsor prize needs real use of the sponsor's tool.

## PayPal capabilities that matter for choosing a product

Confirmed means stated on an opened PayPal docs page. "Sandbox confirmed" is only claimed where the page says it. I have not called any API.

- Sandbox generally: "the sandbox has the same PayPal API feature set as the live environment", with exceptions "closing an account, issuing monthly statements, storing shipping preferences, and PayPal Shops support" (VERIFIED, https://developer.paypal.com/api/rest/sandbox/). That page does not mention Payouts, Disputes, Transaction Search, Subscriptions, Invoicing or Webhooks, so it states no special permission for them.
- Sandbox accounts: a default personal and a default business account are created at first Developer Dashboard login; the business one has sandbox API credentials; you can create more with chosen balances and cards (VERIFIED, https://developer.paypal.com/api/rest/sandbox/accounts/). Card testing is a separate guide: not opened.
- Orders v2: POST create, GET, PATCH, confirm-payment-source, authorize, capture, track, plus tracker update (VERIFIED, https://developer.paypal.com/docs/api/orders/v2/). Intents and auth were not on that page. Sandbox host api-m.sandbox.paypal.com, OAuth client_credentials (VERIFIED, https://developer.paypal.com/api/rest/ per the earlier pass).
- Payments (refund, get refund, capture): in the agent toolkit as create_refund, get_refund, pay_order (VERIFIED, https://github.com/paypal/agent-toolkit). REST paths `GET /v2/payments/captures/{capture_id}`, `POST /v2/payments/captures/{capture_id}/refund`, `GET /v2/payments/refunds/{refund_id}` (VERIFIED 2026-11-03, https://developer.paypal.com/api/payments/v2/schema.json). None has been run.
- Payouts: sandbox use is documented with sandbox host and test error value `ERRPYO002` in an item note returning `SENDER_EMAIL_UNCONFIRMED`. Prerequisites: sandbox account set up, "Ensure your PayPal business account is set up", and the business account must be funded. The page does not say whether approval or enablement is needed (VERIFIED, https://developer.paypal.com/docs/payouts/standard/integrate-api/). Whether Payouts must be enabled for a new sandbox business account: UNVERIFIED. Payouts is not in the agent toolkit tool list.
- Disputes: list, get, patch, provide-evidence, appeal, accept-claim, escalate, send-message, make-offer, accept-offer, deny-offer, acknowledge-return-item, provide-supporting-info. Two sandbox-only calls: adjudicate (settle) and require-evidence (update status) (VERIFIED, https://developer.paypal.com/docs/api/customer-disputes/v1/). The page names no permission requirement and no sandbox tool to create a dispute: how to produce a dispute in sandbox is UNVERIFIED. Toolkit exposes only list, get, accept claim.
- Subscriptions: product, then plan, then subscription, via API or dashboard; the page links the sandbox and approval detail but does not state it (VERIFIED, https://developer.paypal.com/docs/subscriptions/). Sandbox approval: UNVERIFIED. Toolkit has 7 subscription tools.
- Transaction Search: GET /v1/reporting/transactions; scope "Transactions Search"; max range 31 days; "It takes a maximum of three hours for executed transactions to appear"; sandbox token URL shown (VERIFIED, https://developer.paypal.com/docs/api/transaction-search/v1/search-get). The page does not say whether account feature enablement is required: UNVERIFIED. A freshly made sandbox transaction may take up to three hours to appear.
- Webhooks: up to 10 URLs per app, events only for the app they are tied to, 2xx required else retries up to 3 days, two verification options (CRC32 signature, or the verify-signature endpoint) (VERIFIED, https://developer.paypal.com/api/rest/webhooks/). Simulator and localhost handling live on the integration guide, not opened: UNVERIFIED. A public deployed URL is needed for real delivery (my inference).
- Invoicing: needs a "Business account: with Invoicing enabled". Flow: POST draft, then send, then check status UNPAID; recipient should be a sandbox personal account; sent invoices cannot be deleted, only canceled (VERIFIED, https://developer.paypal.com/api/invoicing.md). The page does not say how Invoicing is enabled on a sandbox business account: UNVERIFIED.
- Agent toolkit: `npm install @paypal/agent-toolkit`, Node 18+, Apache-2.0, works with OpenAI Agent SDK, LangChain, Vercel AI SDK and MCP. `PAYPAL_ENVIRONMENT` defaults to SANDBOX. Sandbox tokens valid 3 to 8 hours. The README lists 43 tools in 7 groups: Invoices (20), Payments (5), Dispute Management (3), Shipment Tracking (3), Catalog (3), Subscriptions (7), Reporting (2) (VERIFIED, https://github.com/paypal/agent-toolkit). The PayPal agent-tools page lists 33 tools across eight groups, including a remote MCP group for gift cards only (`search_product`, `create_cart`, `checkout_cart`), which needs the header `x-feature-flags: commerce:true` (VERIFIED, https://developer.paypal.com/ai-tools/agent-tools). The two counts differ; the page's tool names for payments are create_order, create_refund, get_order, get_refund, pay_order. Remote MCP server and Agentic Commerce Protocol auth and sandbox support: UNVERIFIED. Best Use of Agentic Commerce is a $5,000 honorable mention.
- Not in the toolkit and not confirmed in sandbox: Payouts, Webhooks, Transaction Search raw API. Tool lists are not proof that each tool works in sandbox; none was run.

## Known entries in this event

- The gallery is empty to the public: "The hackathon managers haven't published this gallery yet" (VERIFIED-BROWSER, https://paypalaihackathon.devpost.com/project-gallery). Competing submissions cannot be read there.
- Ledgerbird: Alex states Ledgerbird is in this event's gallery and creates real PayPal invoices from an email. This is an OPERATOR STATEMENT. I did not see it on any page. Two web searches ("Ledgerbird PayPal invoices from email devpost" and "Ledgerbird hackathon PayPal invoice email agent") found no Ledgerbird page, repo or Devpost entry. Treat Ledgerbird as a reason to avoid email-to-invoice, not as a verified fact.
- Other public work, opened or labelled:
  - https://github.com/aaravbodla/PAYPAL-AI-HACKATHON (OPENED): a planning repo "Sai and Aarav" with an ideas folder and a hackathon brief. No application code and no PayPal calls visible. Not a built entry.
  - LedgerOath (SNIPPET, https://lablab.ai/ai-hackathons/milan-ai-week-hackathon/ledgeroath-lab): a different hackathon (Milan AI Week), not this event.
  - No public Devpost "software" pages, GitHub apps or X posts for this event turned up in four searches. The X post https://x.com/paypaldev/status/2105749692650754285 returned HTTP 402 and was not read.
- Absence of results is not evidence that no one built a given idea. Expect other entries on invoicing, checkout and agent commerce, since the toolkit leads with those tools.

## Past winners

This event is a first edition as far as I can tell. The nearest earlier event is a DIFFERENT EVENT: the PayPal Dev Days 2025 Hackathon, held at PayPal's San Jose campus, about 24 hours, winners post dated May 29, 2025. Everything below is from https://developer.paypal.com/community/blog/winners-dev-days-hackathon/ (opened). Categories on that page: Agentic Integrations, Vibe Coding with Replit, Upgrade Your Legacy Integration. The page does not label which winner was in which category; any such mapping is an inference. Judging there: PayPal engineering and product leaders chose finalists, who gave lightning-round demos, and three PayPal executives chose winners.

| Place | Project | Team | What the page says | Project page |
|---|---|---|---|---|
| 1st, $5,000 | CrawlerPal | Jordi Montes, Neeraj Jhawar | "a paywall AI agent assistant built with PayPal APIs" | None linked |
| 2nd, $3,000 | Shopware 6 PayPal integration upgrade (no project name given) | Team Codebusters | Moved the integration from the JS SDK v5 to the beta JS SDK v6 | None linked |
| 3rd, $2,000 | Rosen | Sida Zhang, Xiaobin Gu | "a global social trading app powered by PYUSD" | None linked |

Correction to the director's note: the page confirms all three. Prizes also included AWS credits and a Replit Core subscription.

What a judge could do in the demo, and which PayPal capability did the work: NOT AVAILABLE. The page gives no demo detail and no technical detail beyond the lines above. I will not guess. The page links three items only: a lightning-round demo video (https://youtu.be/cb-AnEcld_M, which loaded as "Hackathon Awards | Opening" and showed no description or project list), a LinkedIn post, and the awards ceremony video. I did not open the LinkedIn post or the ceremony video. No winner page for the 2026 event exists yet (winners expected around Dec 21, 2026).

Lesson that is supported by the page: the 2025 winners were an agent product, a legacy SDK upgrade, and a stablecoin app, not invoicing tools. Whether that carries over to the 2026 judging is my inference only.

## Original-work rules

Per CLAUDE.md the entry is original work. The rules page says the project must be new or significantly updated in the period, with an explanation (VERIFIED-BROWSER). The repo should state what was built during the period.
