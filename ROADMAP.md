# Freelancer Payment Agent Roadmap

## Phase 1 — MVP foundation

**Goal:** prove the core flow from invoice creation to payment collection.

Delivered scope:
- Plain-English invoice parsing with editable structured fields
- Local invoice persistence in `data/invoices.json`
- Dashboard summary and invoice list
- Invoice detail view with agent guidance
- Reminder draft generation and stored invoice timeline/history
- Shareable client checkout flow

## Phase 2 — Judge-ready Sepolia flow

**Goal:** keep the UX demo-friendly while making payment confirmation real.

Delivered scope:
- Celo Sepolia configuration (`chainId 11142220`, Forno RPC)
- Real payment request payloads produced behind the payment provider interface
- Client checkout shows chain, RPC, token, explorer, deep-link, and recipient details
- Manual tx-hash submission and onchain verification via Celo Sepolia RPC
- Invoice only flips to `paid` after verification succeeds
- Verification failures are logged into invoice history
- Seeded demo reset flow for repeated judge walkthroughs

## Phase 3 — Production-facing expansion

**Goal:** keep the current architecture, then deepen wallet/payment integrations.

Next candidates:
- Full MiniPay native handoff and wallet-return flows
- Real token registry/config management per network
- Webhook-driven payment events in addition to manual tx-hash verification
- Authentication for freelancer and client portals
- PDF invoices and downloadable receipts
- Multi-user workspaces and team/client management
