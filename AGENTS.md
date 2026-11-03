# paypal-ai-hackathon

Operating rules for this entry. Address the operator as Alex.

## Identity

Every commit is authored as Alex Veciana Belmonte <38962279+alexvec@users.noreply.github.com>. Pass that identity on the git command. Do not change git config. No agent name appears as author or committer.

## Authorization

Create every account, key, team, and deployment this entry needs. Use the operator profile at `/Users/alex/Documents/GitHub/hackathon-ops/operator.json`. Store new secrets in `.env`, which stays gitignored. Do not commit them.

Stop and write the exact remaining step in NEEDS.md only when it needs a payment card, government ID, a tax form, or a code or captcha that only the operator can complete after you have tried.

Do not run submit.sh. Do not send the entry form. Do not upload the demo video. Do not post to Discord, Slack, or YouTube. The operator reviews the packet and submits.

Pushing this repository and deploying the app are part of the build.

## Integrity

The entry is original work. Do not invent names, metrics, testimonials, or outcomes. docs/competition.md is the rule book. A rule that is not sourced stays marked unverified.

## Avatar

The operator avatar is `/Users/alex/Documents/GitHub/hackathon-ops/operator-assets/avatar.jpg`. Use that file for any profile photo, team photo, or cover image. Do not generate a different picture of the operator, and do not upload the file.

## Done when

REVIEW.md exists, the live URL responds, and the operator has the repo URL and the form text. The operator submits.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
