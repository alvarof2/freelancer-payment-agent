# Freelancer Payment Agent

Hackathon-friendly MVP for freelancers who want to create invoices fast, track payment states, and demo an "agentic" payment workflow without relying on external secrets or live money movement.

## What it includes

- Next.js App Router frontend
- Dashboard with earnings summary and recent invoices
- Invoice creation form
- Invoice detail page
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

## Demo flow

1. Land on the dashboard and show total paid / outstanding / overdue.
2. Open a seeded invoice to show the detail view.
3. Click **Simulate client view**, **Force overdue**, or **Mark as paid**.
4. Click **Send reminder stub** to demonstrate the follow-up workflow.
5. Create a new invoice from the form and show that it persists locally.
6. Optionally inspect `data/invoices.json` to prove the state is stored locally.

## API routes

- `GET /api/invoices` — list invoices
- `POST /api/invoices` — create invoice
- `POST /api/invoices/:id/status` — update mock payment status
- `POST /api/invoices/:id/reminder` — trigger reminder stub

## Notes

- No wallet, escrow, or email provider is wired in yet. Those are intentionally mocked behind route handlers so they can be replaced later.
- Seed data is created automatically on first run.
- JSON persistence was chosen over SQLite to keep the MVP frictionless for a hackathon demo.

## Suggested next steps

- Swap JSON storage for SQLite or Postgres
- Add authentication for freelancer/client portals
- Attach PDFs and hosted payment links
- Connect real reminder channels (email, Telegram, on-chain attestations, etc.)
- Add webhook/event history for payment milestones
