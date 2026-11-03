# REVIEW: Billing Desk Agent, PayPal AI Hackathon

Reviewed 2026-11-03. The verifier's check was read-only.

**Updated later on 2026-11-03 by the director** after Alex added a card to the Vercel team. Model-related lines below were rechecked against the live URL: `GET /api/model-check`, one `POST /api/propose` with a fictional non-sample note, and the page banners. Tests, typecheck, build and the secret scan were not re-run for this update, and the verifier did not re-review it.

## Verdict

**Alex cannot submit today.** The repo is clean, public, MIT licensed and honest, and the live URL responds. But the deployed app does not yet meet the one stated rule, "meaningfully use both PayPal and AI". The model is now live (`gateway/deepseek/deepseek-v4.1-flash`), but PayPal is still a mock, so the PayPal half of the rule is unmet. No real PayPal call has ever run. The video cannot be filmed, and most of the 11 statements in the submission text are still unconfirmed (R10 is confirmed, R7 and R11 partly).

What must happen first, in order:

1. Alex signs in at developer.paypal.com and creates a sandbox app; its client ID and secret go into the Vercel project (names are in `.env.example`). The agent tried once on 2026-11-03 and was stopped by the PayPal sign-in screen.
2. Done: the card is on the Vercel team and the model answers. Leave the model and gateway key as they are.
3. Re-run the live checks below until the banners read `PayPal SANDBOX` and `Live AI`. `Live AI` and a real proposal for non-sample text are already seen.
4. Run the sandbox flow once and settle the unconfirmed items R1 to R11 in docs/submission.md.
5. Alex joins Devpost, reads the rules tab, and maps the draft text onto the real form fields.
6. Film the demo, upload it himself, and submit.

Time left: the blog says submissions close Nov 12, 2026 (date only, time zone unverified). That is 9 days from today.

## Links and where the text is

- Repo: https://github.com/alexvec/paypal-ai-hackathon
- Live URL: https://paypal-ai-hackathon-phi.vercel.app (the shorter `paypal-ai-hackathon.vercel.app` is a different project, titled "PayPal AI Live Commerce - Agentic Shopping". Do not paste it.)
- Form text: `docs/submission.md` (title, tagline, long description, links). Sentences tagged `[CONFIRM AFTER REAL RUN]` must not be pasted until seen.
- Slides outline: `docs/slides.md`. Demo script: `docs/demo-script.md`. Demo video: does not exist.

## What I ran

| Check | Result |
|---|---|
| `npm test` | 5 files, 51 tests passed. These include the toolkit code against stubbed HTTP, so they do not prove real PayPal behaviour. |
| `npm run typecheck` | Clean. |
| `npm run build` | Succeeded. Routes: `/`, `/api/agent`, `/api/health`, `/api/invoices`, `/api/invoices/[id]/actions`, `/api/model-check`, `/api/propose`. |
| `GET /` | HTTP 200. In a browser, the page shows the red banner "MOCK PayPal. No request was sent to PayPal. Invoice ids are fake." and the green banner "Live AI: gateway/deepseek/deepseek-v4.1-flash". |
| `GET /api/health` | HTTP 200: `paypal: "mock"`, `source: "MOCK"`, `llmSource: "MODEL_CONFIGURED"`, `llm: "configured"`, `warnings: []`. |
| `GET /api/model-check` | HTTP 200: `llmSource: "LIVE_MODEL"`, `llmModel: "gateway/deepseek/deepseek-v4.1-flash"`, `modelError: null`, checked at 2026-11-03T12:06:28Z. (The first check returned `CANNED` with the gateway card error, before Alex added the card.) |
| `POST /api/propose` with a non-sample text (a made-up plumbing note) | HTTP 200: `llmSource: "LIVE_MODEL"`, `modelError: null`. It proposed three lines from a fictional note, kept source phrases, left labour quantity null for "about two hours", left the unmatched washer kit unpriced, and asked four questions. `source` is still `MOCK`. One note only, so this says nothing about quality in general. |
| Repo reachable | HTTP 200 on the repo page and on raw `LICENSE`. GitHub reports visibility PUBLIC, license MIT, default branch `main`. LICENSE text begins "MIT License / Copyright (c) 2026 Alex Veciana Belmonte". |
| Run instructions in repo | README has "Run it locally" (`npm install`, `npm run dev`, works with no configuration in labelled mock modes) and a "Checks" section. |
| Local vs remote `main` | Both at `d4ded0e` after `git fetch`. |
| Commit identity | All 6 commits have author and committer `Alex Veciana Belmonte <38962279+alexvec@users.noreply.github.com>`. No agent name in either field. |
| `.env` ignored | `.gitignore` ignores `.env` and `.env.*` (so `.env.local`, which exists locally, is ignored), keeps `.env.example`. `.env.local` and `.claude-session.json` are not tracked and never appeared in history. I did not open `.env.local`. |
| Secret scan, tracked files and full history | Pattern scan for common key formats, private keys, JWT-like strings and `secret/token/password = long value`: no real secret. Only hits are test stubs (`stub-gateway-key`, `stub-client-secret`) and variable names. `.env.example` has empty values. This is a pattern scan, not a guarantee. |

## Does the deployed app meet "meaningfully use both PayPal and AI"?

**Not as deployed: AI yes, PayPal no. The design would, once PayPal sandbox keys are set.**

- PayPal: the code uses `@paypal/agent-toolkit` for six tools, and mode is picked from env at runtime. Deployed, it is the mock gateway. The toolkit path has never touched the sandbox (README says so).
- AI: extraction runs on the live model (`gateway/deepseek/deepseek-v4.1-flash`) on the deployed app. The chase agent has not been exercised live, and image input has not been tried on this model. If a model call fails, the chase agent still falls back to `runCanned` in `src/lib/agent.ts` (plain regex and date rules, `decidedBy: "CANNED_RULES"`).
- So today a judge would get a real model proposal, then a mock invoice with a fake id. That is honestly labelled, but it does not satisfy the rule.
- Whether the design counts as "meaningful" is unverified. The rules define neither word (docs/competition.md says so).

## Honesty of claims

README: accurate and conservative. Its mode table, "Not run yet" column and "Not used" list match the code and the live responses.

docs/submission.md: honest at the top (states mock/canned, lists R1 to R11, "Do not claim" list). Problems:
- The short tagline ("Messy note in, approved PayPal invoice out, then chased.") has no `[CONFIRM]` tag, though nothing real has run. The longer tagline is tagged.
- "Built with ... Vercel AI Gateway ... " is tagged R11, fine.
- The paste-ready sentences about the gate, policy, rate-card pricing and tools-held are true of the code and tests. Those are fine.

docs/slides.md: slide 1 tagline, slide 3 steps 1 to 5, and slide 5 ("Reads unstructured and image input a form cannot") are stated as fact without a CONFIRM tag. Slide 3 notes only the photo input. Image input has run only against stubs.

docs/demo-script.md: clearly says it cannot be filmed yet. No overstatement found.

No invented metrics, customers or testimonials found in README, submission or slides. The test count above (51) is from my run, not from the repo docs, and I did not put it in any form text.

## Rule-by-rule table

Status is the status in docs/competition.md. "Evidence" is what I checked. The blog page was re-read at https://developer.paypal.com/community/blog/PayPal_AI_Hackathon.

| Rule | Status in rule book | Evidence | Result |
|---|---|---|---|
| Submissions open Oct 1, 2026 | VERIFIED | On the blog page | pass |
| Submissions close Nov 12, 2026 | VERIFIED (date only) | On the blog page. Page states no time or time zone | pass (date); cut-off time unknown |
| Winners Dec 21, 2026 | VERIFIED | On the blog page | pass |
| Cut-off time and zone | UNVERIFIED | Not on blog. Third-party 20:00 UTC reading is the file's own conversion | unknown |
| Open to builders worldwide | VERIFIED (blog) | Blog says "from around the world". The file puts "No formal eligibility rules" in quotation marks, but that phrase is not on the page. The page only lists no other criteria. Wording nit, the substance holds | pass, with a misquote to fix |
| Age, countries, employee exclusions | UNVERIFIED | Devpost rules were never read | unknown |
| Solo or team | UNVERIFIED | Not read. Entry is a solo builder | unknown |
| Must meaningfully use both PayPal and AI | VERIFIED | On blog ("The only fundamental requirement"). App as deployed: mock PayPal, live AI | **fail** until PayPal sandbox keys are set |
| No stack required, any form allowed | VERIFIED | On blog. Entry is a web app | pass |
| No tracks | VERIFIED | On blog | pass |
| Prize list and amounts | VERIFIED | Matches blog | pass (not a submission item) |
| Partner credits | UNVERIFIED terms | Names listed on blog; amounts and steps not on page. Not redeemed | unknown |
| Demo video (length, host) | UNVERIFIED | No video exists. Third-party lead says public YouTube under 3 minutes | **fail** (missing), rule unknown |
| Code repository | UNVERIFIED | Public GitHub repo, reachable | pass on the lead, rule unknown |
| Open-source license | UNVERIFIED | MIT LICENSE on GitHub | pass on the lead, rule unknown |
| Text description | UNVERIFIED | docs/submission.md drafted, not mapped to real fields, 11 statements unconfirmed | partial |
| Working prototype or live URL | UNVERIFIED | URL responds (200) and takes non-sample text on the live model, but PayPal is mock | partial |
| Judge test access | UNVERIFIED | App has no login | unknown |
| Language | UNVERIFIED | All text is English | unknown |
| Devpost form fields | UNVERIFIED | Devpost returned 403 to research. I did not try the page | unknown |
| Judging criteria | UNVERIFIED | Not on blog | unknown |
| Original work and new-project rule | UNVERIFIED | First commit is dated 2026-11-03, inside the Oct 1 to Nov 12 window; the new-project rule is unread | unknown |
| Disqualification, IP, payout and tax | UNVERIFIED | Not read | unknown |
| Devpost registration | needed | Not done (Alex) | **fail** |

Verified-vs-unverified marking: every VERIFIED row I could test is on the blog page. No unverified rule was upgraded. The third-party Internshala material is correctly labelled as leads only. Not checked by me: the Internshala page and the PayPal platform-facts pages.

## Blockers in order

1. Alex: PayPal sandbox app and keys. Create a REST app at developer.paypal.com, then add client ID and secret to the Vercel project. The agent tried once on 2026-11-03: the dashboard redirected to the PayPal sign-in screen, and it does not create accounts or type passwords. See NEEDS.md steps 1 and 2.
2. Cleared: Alex added the card, and live `/api/model-check` returns `LIVE_MODEL`.
3. Agent or Alex, after 1: one real run on the live URL with a genuine note; confirm the open R items in docs/submission.md, in particular the unconfirmed sandbox payer path. The model also needs one image upload and one chase-agent run, since neither has been tried on this model.
4. Alex: join Devpost at https://paypalaihackathon.devpost.com/ and read the rules tab. This also settles every UNVERIFIED row above.
5. Alex: film the demo once banners read `PayPal SANDBOX` and `Live AI`, upload it, and add the URL to docs/submission.md.
6. Alex: map the text onto the real form fields and submit with his own submission script. Not run by me.
7. Agent, small and before submitting: fix the doc nits listed below.

Also unfinished: the deployed model does not run on partner credit, and partner credits were never read or redeemed. NEEDS.md says they must be read on the partner pages before they are skipped.

## Known issues to decide on

1. **Commit message mentions CLAUDE.md.** It is not the first commit. It is the second, `56e3ac8` "Build the invoice agent first slice", whose body ends "Includes operator edits to CLAUDE.md, AGENTS.md, NEEDS.md and .gitignore." The first commit (`3648211`) has no such text. It is a file name, not an author field. The commit is on the public remote. Left alone as instructed. No force-push.
2. **Uncommitted edits.** `CLAUDE.md` and `AGENTS.md` each gain one sentence: "Redeem every promo code and platform credit in docs/competition.md before any payment card." Not committed, so the public repo has the older text. Decide whether to commit or discard. Note competition.md records no promo code, and NEEDS.md says no credit was redeemed.
3. **Ops README vs director prompt.** `/Users/alex/Documents/GitHub/hackathon-ops/README.md` line 41 says the director "stops before the build" when NEEDS.md lists keys. `prompts/director.md` step 3 says create what is listed, continue the build, and stop only for card, ID, tax form or code. The build did continue in mock mode, so the prompt was followed. The README is out of date.
4. **Doc vs code mismatches** (presenter's list, each confirmed by me):
   - PRD (docs/prds/01-invoice-agent.md line 34) says create then send are one approval. README and code use two approvals (`createFromApproval`, then a separate approved `send`).
   - PRD and win plan list `create_product`, `list_products`, `generate_invoice_qr_code`, `get_merchant_insights`. The code calls none. README and submission say so, so they are consistent with the code. The PRD and win plan are stale.
   - The Orders v2 fallback is described in the PRD, win plan and demo-path. It is not built. The demo script says so. docs/demo-path.md step 4 does not.
   - On policy violations the create button stays enabled (`desk.tsx` disables it only for non-policy problems) and the server answers 422 "Blocked by policy". This is deliberate, and the demo script uses it. A user may find it odd.
5. **`/api/health` is more optimistic than the truth.** It reports `llm: "configured"`, `llmSource: "MODEL_CONFIGURED"` and `warnings: []` whether or not the model call works; it said the same while every call was failing. Only `/api/model-check` and the page banner show the real state. Liveness-only by design, but easy to misread.
6. **competition.md** puts "No formal eligibility rules" in quotes. The blog does not contain that phrase.

## STATE.md

The verifier left the verify box unchecked. The director ticked it afterwards to mean the review was done, with a note that the entry is not ready to submit.

## Could not check

- Whether the deployed build equals commit `d4ded0e`. I did not query Vercel. The live responses match the code.
- Devpost pages, rules, form fields, video host rules. Not opened (403 earlier, and Alex holds this step).
- Any real PayPal sandbox behaviour, which cannot run yet. Real model output was seen for one text note only: image input and the chase agent are untested on the live model.
- The contents of `.env.local` and the `.vercel` folder (left unopened).
- The Internshala page and the PayPal platform-facts pages in competition.md.
- The browser UI beyond the server-rendered HTML. I did not run the Playwright walk.
- Forks on GitHub. Locally and on the remote there is only `main`.
