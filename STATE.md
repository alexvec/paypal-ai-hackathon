# State

- slug: paypal-ai-hackathon
- stage: verify
- track: invoice-agent (single product, no event tracks; see docs/win-plan.md and docs/prds/01-invoice-agent.md)
- repo: https://github.com/alexvec/paypal-ai-hackathon
- url: https://paypal-ai-hackathon-phi.vercel.app

## Stages

- [x] research
- [x] strategy
- [x] needs-cleared (PayPal sandbox keys missing, build continues with PayPal in labelled mock mode; model live since Alex added the card, see NEEDS.md)
- [x] build (live URL runs on the live model deepseek/deepseek-v4.1-flash and labelled mock PayPal; the real sandbox path has not run, see README.md)
- [x] presentation (docs/submission.md, docs/slides.md, docs/demo-script.md written; statements marked CONFIRM AFTER REAL RUN need a real sandbox and model run, and the video cannot be filmed until then)
- [x] verify (REVIEW.md written; verdict: not ready to submit, the real PayPal sandbox run is outstanding; PayPal sign-in screen blocked the agent, see NEEDS.md)
