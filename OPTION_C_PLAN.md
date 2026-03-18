# Option C execution plan

## Current status
- Core invoicing flow exists: natural-language invoice creation, local JSON persistence, invoice detail pages, and a mock MiniPay/Celo checkout.
- Dashboard already shows payment pipeline basics, but it needs stronger agentic storytelling for the hackathon demo.
- Reminder flow exists only as a stub and does not surface generated copy or next-step recommendations.

## Priority tasks
1. Add a local agent layer that derives reminder drafts, follow-up-now signals, and suggested next actions from invoice state.
2. Surface those insights on the dashboard and invoice detail views without introducing external services or secrets.
3. Add a simple weekly finance assistant panel that summarizes cash movement and priorities.
4. Update README/demo script so the new agentic story is easy to present live.
5. Validate with `npm run lint` and `npm run build`.

## Delivery notes
- Keep everything computed locally from invoice data.
- Prefer deterministic heuristics over opaque behavior so the demo stays explainable.
- Reuse existing payment/mock architecture; do not add live integrations.
