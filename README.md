# Freelancer Payment Agent

![ClawThulhu](docs/ClawThulhu.png)

*Made with 🐙 🦞 by ClawThulhu*

Hackathon-friendly MVP for freelancers who want to create invoices fast, track payment states, and demo an agentic payment workflow with real Celo Sepolia verification and no private keys stored in the app.

## Pitch

**Freelancer Payment Agent** turns a plain-English request like _"Invoice Acme €500 for landing page design due next Friday"_ into a structured invoice, generates a Celo Sepolia payment request, and helps track the invoice from creation to verified settlement.

The point is simple: freelancers should not lose time to admin, payment chasing, and fragmented cross-border workflows. The app keeps the AI workflow lightweight and the payment architecture clean enough to deepen later.

This iteration also makes the payment domain explicit: each invoice now stores (1) an invoice display currency, (2) a settlement asset/token, and (3) a payment mode/network route separately. That removes a bunch of subtle formatting/state bugs and makes future stablecoin expansion less brittle.

## What changed in this iteration

- Replaced the purely mock checkout with a **Sepolia-aware payment request architecture**
- Added **dual-mode Celo Sepolia checkout support**:
  - **stable-token mode** when `CELO_SEPOLIA_STABLE_TOKEN_ADDRESS` is configured
  - **native-CELO mode** for end-to-end testing when the payer only has CELO
- Added **automatic fallback to native CELO** when stable-token mode is selected but no stable token contract is configured
- Added **manual tx-hash submission + onchain verification**
- Invoices are now marked `paid` **only after successful verification**
- Added stored payment request / payment verification metadata to the invoice model
- Refactored the invoice domain model so display currency, settlement asset, and payment route/mode are explicit instead of overloaded into one field
- Timeline/history now logs request generation, wallet handoff, verification success, and verification failures

## What it includes

- Next.js App Router frontend
- Dashboard with earnings summary, recent invoices, follow-up-now signals, and a weekly finance assistant panel
- Natural-language invoice drafting with a local fallback parser
- Structured invoice creation form with editable parser output
- Invoice detail page with agent-generated reminder copy, next-action guidance, and a persistent local event timeline/history
- Client-facing hosted checkout flow for Celo Sepolia
- Payment provider abstraction in `lib/payment-provider.ts`
- Celo Sepolia request + verification logic in `lib/celo.ts`
- Manual tx-hash verification flow backed by Celo Sepolia RPC
- Native CELO verification that checks both **recipient** and **value** onchain
- Seeded demo reset flow so the dashboard and invoice states can be restored before each judge run
- Local SQLite persistence in `data/invoices.db`
- One-time JSON bootstrap from `data/invoices.json` when the database is empty

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Built-in SQLite persistence (`node:sqlite`) for zero extra service setup

## Getting started

```bash
cd freelancer-payment-agent
export PATH="/Users/alvaro/.nvm/versions/node/v22.16.0/bin:$PATH"
npm install
npm run dev
```

Open `http://localhost:3000`.

## Data storage

Primary store:
- `data/invoices.db`

Compatibility/backup flows:
- `npm run db:import-json` — import `data/invoices.json` into SQLite
- `npm run db:export-json` — export SQLite back to `data/invoices.json`
- `npm run smoke` — run a lightweight API smoke test against a running local app (`SMOKE_BASE_URL` optional)

Behavior notes:
- On first run, if the SQLite DB is empty, the app bootstraps from `data/invoices.json` when present.
- Runtime storage now uses normalized SQLite tables for invoices, events, payment requests, and payment verifications.
- SQLite schema migrations are versioned with `PRAGMA user_version`.
- SQLite runtime sidecar files (`*.db-wal`, `*.db-shm`) are generated locally and ignored in git.

## Auth

Simple operator auth is supported for demo/public deployments.

Required env vars:
- `DEMO_ADMIN_PASSWORD`
- `SESSION_SECRET`

Behavior:
- operator/admin pages are protected behind `/login`
- public client checkout at `/pay/[id]` stays open
- sensitive operator API routes require an authenticated session cookie

Protected routes:
- `/`
- `/roadmap`
- `/invoices/*`
- `POST /api/invoices`
- `POST /api/invoices/reset`
- `POST /api/invoices/:id/status`
- `POST /api/invoices/:id/reminder`
- `POST /api/reconciliation/poll`
- `POST /api/webhooks/payments/test`

Public routes:
- `/login`
- `/pay/[id]`
- auth login/logout endpoints

## Optional environment configuration

The app works without secrets.

If you set a stable token contract, the checkout defaults to **stable-token mode** and verifies ERC-20 transfers.
If you do not set one, the app still works in **native CELO mode** so you can test the full payment flow with only CELO on Celo Sepolia.

```bash
export CELO_SEPOLIA_RPC_URL=https://forno.celo-sepolia.celo-testnet.org
export CELO_SEPOLIA_CHAIN_ID=11142220

# Optional: enable stable-token mode with a specific Sepolia token contract
export CELO_SEPOLIA_STABLE_TOKEN_ADDRESS=0x0000000000000000000000000000000000000001
export NEXT_PUBLIC_CELO_SEPOLIA_STABLE_TOKEN_ADDRESS=0x0000000000000000000000000000000000000001
export NEXT_PUBLIC_CELO_STABLE_SYMBOL=USDC
export NEXT_PUBLIC_CELO_STABLE_DECIMALS=6
```

Or copy `.env.example` to `.env.local`.

### Verification rules

- If `CELO_SEPOLIA_STABLE_TOKEN_ADDRESS` is set, the verifier looks for an ERC-20 `Transfer` log to the invoice recipient for at least the invoice amount.
- If the checkout runs in **native CELO mode**, the verifier checks:
  - the transaction succeeded on Celo Sepolia
  - the recipient address matches the invoice payment address
  - the native value sent is at least the invoice amount in CELO units

## Celo Sepolia checkout flow

The payment experience now supports both:

- **Stable-token mode** — best when you have Sepolia USDC or another configured stable token
- **Native CELO mode** — best for hackathon testing when you only have CELO in the wallet

### Architecture

- `lib/payment-provider.ts` exposes the payment provider interface
- `lib/celo.ts` builds Sepolia payment requests and verifies tx hashes against Forno
- `POST /api/invoices/:id/checkout` drives request generation, wallet handoff, mode selection, and verification
- `data/invoices.db` stores invoice data in SQLite tables for invoices, timeline events, payment requests, and payment verification metadata
- `data/invoices.json` is still supported as a bootstrap/import source and optional export backup
- Legacy invoice JSON with `currency`, `paymentRail`, and `paymentAddress` is normalized on read so older demo data still works

### Payment page behavior

1. Open the hosted checkout
2. Choose **stable token** or **native CELO**
3. Generate the payment request
4. Optionally try the wallet handoff / deep link (best on compatible wallets or mobile; desktop may do nothing)
5. Submit a transaction in a wallet
6. Paste the tx hash into the hosted checkout
7. The app verifies it on Celo Sepolia
8. Only then does the invoice move to `paid`

If stable-token mode is selected without a configured token address, the server automatically falls back to native CELO so the flow remains demoable.

### What the payment page shows now

- explicit pending / verifying / confirmed / needs-attention states
- a clearer manual-send flow with step-by-step instructions
- Celo Sepolia network info
- chainId and RPC URL
- selected payment mode
- recipient wallet address with copy actions
- asset symbol and optional token contract
- invoice display amount plus settlement amount/base units
- reference + memo with copy actions
- visible deep-link style wallet handoff URL with copy fallback
- clearer explorer links for both recipient address and submitted tx hash
- smoother success/failure messaging around verification
- invoice history alongside the checkout

## Fast test plan: native CELO only

If you only have CELO on Celo Sepolia:

1. Leave `CELO_SEPOLIA_STABLE_TOKEN_ADDRESS` unset
2. Run the app
3. Create an invoice with a real Celo Sepolia recipient address you control
4. Open the hosted checkout
5. Keep **Native CELO** selected
6. Generate the payment request and send the payment from your wallet
7. Paste the tx hash
8. Verify the payment and confirm the invoice moves to `paid`

## Demo script

### 1. Start on the dashboard

- Show total collected, outstanding, and the count of Celo-ready invoice links
- Point out the weekly finance assistant panel and follow-up-now cards
- Mention the **Reset demo data** control so judges know the flow is repeatable

### 2. Create an invoice from plain English

Go to `/invoices/new` and paste something like:

```text
Invoice Acme €500 for landing page design due next Friday
```

Then:
- Click **Parse into fields**
- Review the structured fields
- Paste a real Celo Sepolia recipient address
- Create the invoice

### 3. Show the invoice detail page

- Review the generated amount, due date, payment rail, and recipient address
- Demo the agent recommendation card and reminder draft
- Show the timeline/history
- Click **Open Celo Sepolia checkout**

### 4. Show the hosted checkout

- Pick **Native CELO** for the simplest live demo, or **Stable token** if configured
- Generate the payment request
- Point out the explicit pending state and the manual-send instructions
- Optionally click the wallet handoff step or copy the deep link into a compatible wallet
- If the handoff does nothing, copy the recipient/amount/reference manually and send from a test wallet
- Paste the tx hash into the checkout
- Click **Verify ... tx hash**
- Show the verifying state, the explorer links, and then the confirmed result with updated history

### 5. Close the loop on the dashboard

- Return to `/`
- Show that invoice status and totals updated only after verification
- Optionally open the invoice again to show the final payment event in the timeline
- Hit **Reset demo data** for the next walkthrough

## API routes

- `GET /api/invoices` — list invoices
- `POST /api/invoices` — create invoice
- `POST /api/invoices/:id/status` — update invoice status manually
- `POST /api/invoices/:id/reminder` — trigger reminder stub
- `POST /api/invoices/:id/checkout` — generate request, open wallet handoff, choose payment mode, and verify tx hash
- `POST /api/invoices/reset` — restore the seeded demo dataset
- `POST /api/webhooks/payments/test` — internal/test webhook reconciliation endpoint
- `POST /api/reconciliation/poll` — manually trigger recent-block polling on Celo Sepolia for unpaid invoices

### Test webhook reconciliation

This first pass adds an internal webhook path that:
- stores the raw event
- matches an invoice by payment `reference`
- reuses the existing onchain verification logic
- only marks the invoice paid if verification succeeds

Example payload:

```json
{
  "eventId": "evt-demo-1",
  "reference": "sep-530436-lvaro",
  "txHash": "0x...",
  "mode": "stable"
}
```

If you want to test the matching path without a real tx hash yet, sending an invalid hash should still create a webhook event and reconciliation attempt, then fail verification safely.

### Celo Sepolia polling

This pass also adds a manual polling endpoint and dashboard button.

What it does:
- scans recent unpaid invoices that already have a generated payment request
- for stable-token invoices: checks recent ERC-20 `Transfer` logs to the invoice recipient
- for native CELO invoices: scans recent blocks for direct transfers to the recipient
- reuses the same onchain verifier before marking anything paid

Manual API trigger:

```bash
curl -X POST http://localhost:3000/api/reconciliation/poll \
  -H 'Content-Type: application/json' \
  -d '{"lookbackBlocks":120}'
```

UI trigger:
- on the dashboard, click **Poll Celo Sepolia**

## Notes

- No wallet keys are stored in the app
- Wallet handoff is optional UX; tx-hash verification is the required settlement path
- Native CELO mode is intentionally first-class so the project stays easy to demo under hackathon conditions
- Seed data is created automatically on first run and can be restored from the dashboard
- Persistence now uses SQLite with zero extra service setup; the old JSON file remains useful for import/export and backup
- The parser is heuristic-based on purpose: good enough for common prompts, transparent when confidence drops, and easy to replace later
- `formatMoney()` now renders settlement assets explicitly (for example `USDC`, `cUSD`, and `CELO`) so the UI never falls back to fiat-style labels

## Suggested next steps

- Add first-class MiniPay-native handoff and return flows
- Add a real token registry for Celo Sepolia and mainnet assets
- Add webhook/event-driven reconciliation on top of manual tx-hash verification
- Add authentication for freelancer/client portals
- Attach PDFs and hosted payment links
