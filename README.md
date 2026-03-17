# Freelancer Payment Agent

Hackathon-friendly MVP for freelancers who want to create invoices fast, track payment states, and demo an agentic payment workflow without relying on external secrets or live money movement.

## Pitch

### Short pitch

**Freelancer Payment Agent** is an AI-powered invoicing and payment assistant for freelancers and small businesses. It turns a simple plain-English request like _"Invoice Acme €500 for landing page design due next Friday"_ into a structured invoice, generates a MiniPay/Celo-style payment flow, and helps track the invoice from creation to payment confirmation.

The core idea is simple: freelancers should not lose time to admin, payment chasing, and fragmented cross-border workflows. The agent handles the operational layer so they can focus on delivering work.

### 30-second pitch

Freelancers lose time and income because getting paid is still too manual.
**Freelancer Payment Agent** uses AI to create invoices from natural language, guides clients through a MiniPay-style stablecoin checkout flow, and tracks payment status from sent to confirmed. It combines AI usability with Celo's payments story to make cross-border freelance payments feel fast, clear, and programmable.

### 1-minute pitch

Freelancers today juggle too many repetitive payment tasks: creating invoices, sending reminders, checking whether a client paid, and dealing with slow or expensive cross-border payments.

**Freelancer Payment Agent** solves that with a lightweight AI + stablecoin workflow. A freelancer can simply type:

> Invoice Acme €500 for landing page design due next Friday

and the app turns that into a clean invoice automatically.

From there, the client gets a MiniPay/Celo-style payment experience with a simple checkout flow, stablecoin-oriented payment rails, and clear confirmation states. On the freelancer side, the app tracks invoice status, surfaces outstanding revenue, and creates the foundation for smart automated follow-up.

This project shows how AI agents and on-chain payments can work together in a practical, everyday use case — not abstract DeFi, but real people getting paid for real work.

### Problem

- Freelancers spend too much time on admin
- Invoicing and follow-up are fragmented
- Cross-border payments are often slow, opaque, and expensive
- Existing tools are not designed for agentic workflows

### Solution

- AI-native invoice creation from plain English
- MiniPay/Celo-style payment request flow
- Stablecoin-friendly checkout story
- Invoice tracking and follow-up readiness
- Foundation for autonomous payment operations

### Why this fits the hackathon

- **AI angle:** natural-language invoice creation and an agent-ready workflow
- **Celo/MiniPay angle:** stablecoin-first, mobile-friendly payment UX
- **Real-world utility:** a clear cross-border use case for freelancers and small businesses

### Tagline options

- From plain English to paid
- The AI agent that helps freelancers get paid
- Invoice, collect, confirm
- Freelance payments, powered by AI and stablecoins
- Turn work into payment, faster

## What it includes

- Next.js App Router frontend
- Dashboard with earnings summary, recent invoices, and a tighter presentation flow
- Natural-language invoice drafting with a local fallback parser
- Structured invoice creation form with editable parser output
- Invoice detail page with demo controls
- Client-facing MiniPay-style payment page for a shareable checkout handoff
- Mock MiniPay/Celo/cUSD checkout flow with payment request, wallet-open state, tx preview/hash, and confirmation states
- Provider-style payment architecture in `lib/payment-provider.ts` so the mock can be swapped for a real chain integration later
- Mock payment status tracking (`sent`, `viewed`, `paid`, `overdue`)
- Reminder action stub exposed through an API route
- Local JSON persistence in `data/invoices.json`
- Minimal UI tuned for demos

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- File-based JSON persistence for speed and zero setup

## Getting started

```bash
cd freelancer-payment-agent
export PATH="/Users/alvaro/.nvm/versions/node/v22.16.0/bin:$PATH"
npm install
npm run dev
```

Open `http://localhost:3000`.

## MiniPay/Celo demo flow

The default payment rail is now **MiniPay / Celo / cUSD**.

### Checkout architecture

- `lib/payment-provider.ts` contains the mock provider and the swappable `PaymentRailProvider` interface.
- `POST /api/invoices/:id/checkout` drives the checkout state machine.
- The client payment page consumes that route to move through these states:
  1. `quote_ready`
  2. `wallet_opened`
  3. `submitted`
  4. `confirmed`
- Only the final `confirm` step marks the invoice as paid in local storage.

### What the payment page shows

- MiniPay-oriented copy and hosted checkout framing
- Celo mainnet / cUSD transaction preview
- Mock fee estimate
- Deep-link style handoff (`minipay://pay?...`)
- Reference + memo
- Mock transaction hash after submit
- Confirmation copy that updates the freelancer dashboard

## Demo script

### 1. Start on the dashboard

- Show total collected, outstanding, and the count of Celo-ready invoice links.
- Explain that the app is fully local and secret-free.
- Point out the suggested presentation flow card.

### 2. Create an invoice from plain English

Go to `/invoices/new` and paste something like:

```text
Invoice Acme €500 for landing page design due next Friday
```

Then:

- Click **Parse into fields**.
- Show the parser preview and fallback notes.
- Mention that the parser is intentionally lightweight but always leaves the structured fields editable.
- Create the invoice.

### 3. Show the invoice detail page

- Review the generated amount, due date, payment rail, and scope.
- Point out that the invoice is already configured for MiniPay/Celo/cUSD.
- Click **Open MiniPay checkout**.

### 4. Show the client-facing MiniPay checkout

- Explain that this is the link you would send to the client.
- Click **Generate MiniPay payment request**.
- Click **Open MiniPay mock checkout**.
- Click **Submit mock Celo transaction**.
- Point out the generated mock transaction hash.
- Click **Confirm local settlement**.

### 5. Close the loop on the dashboard

- Return to `/`.
- Show that the invoice status and totals have updated.
- Optionally trigger **Send reminder stub** on another invoice to show the follow-up automation path.

## API routes

- `GET /api/invoices` — list invoices
- `POST /api/invoices` — create invoice
- `POST /api/invoices/:id/status` — update mock payment status
- `POST /api/invoices/:id/reminder` — trigger reminder stub
- `POST /api/invoices/:id/checkout` — drive the MiniPay/Celo mock checkout flow

## Notes

- No wallet, escrow, or email provider is wired in yet. Those are intentionally mocked behind route handlers so they can be replaced later.
- Seed data is created automatically on first run.
- JSON persistence was chosen over SQLite to keep the MVP frictionless for a hackathon demo.
- The parser is heuristic-based on purpose: good enough for common prompts, transparent when confidence drops, and easy to replace with an LLM/API later.
- `formatMoney()` maps `cUSD` and `USDC` to USD formatting so the UI still reads naturally.

## Suggested next steps

- Swap the mock payment provider for a real MiniPay/Celo integration
- Persist checkout event history instead of generating ephemeral mock session state
- Add authentication for freelancer/client portals
- Attach PDFs and hosted payment links
- Connect real reminder channels (email, Telegram, on-chain attestations, etc.)
- Add webhook/event history for payment milestones
