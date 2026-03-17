# Freelancer Payment Agent

Hackathon-friendly MVP for freelancers who want to create invoices fast, track payment states, and demo an agentic payment workflow without relying on external secrets or live money movement.

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
