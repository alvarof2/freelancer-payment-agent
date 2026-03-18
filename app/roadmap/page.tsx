import Link from "next/link";

const phases = [
  {
    title: "Phase 1 — MVP foundation",
    items: [
      "Plain-English invoice parsing with editable structured fields",
      "Local invoice persistence in data/invoices.json",
      "Dashboard summary and invoice list",
      "Invoice detail view with agent guidance",
      "Reminder draft generation and stored invoice timeline/history",
      "Shareable client checkout flow",
    ],
  },
  {
    title: "Phase 2 — Judge-ready Sepolia flow",
    items: [
      "Celo Sepolia configuration with chainId 11142220 and Forno RPC",
      "Real payment request payloads produced behind the provider interface",
      "Client checkout shows chain, RPC, explorer, token, and recipient details",
      "Manual tx-hash submission plus onchain verification",
      "Invoice only flips to paid after verification succeeds",
      "Verification failures are logged in invoice history",
    ],
  },
  {
    title: "Phase 3 — Production-facing expansion",
    items: [
      "Full MiniPay native handoff and wallet-return flows",
      "Real token registry/config management per network",
      "Webhook-driven payment events in addition to manual verification",
      "Authentication for freelancer and client portals",
      "PDF invoices and downloadable receipts",
      "Multi-user workspaces and team/client management",
    ],
  },
];

export default function RoadmapPage() {
  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-violet-600">Project roadmap</p>
          <h1 className="text-3xl font-semibold tracking-tight">Phase 1 → Phase 3 plan</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">A concise roadmap for the hackathon story now, and the production path later.</p>
        </div>
        <Link href="/" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          Back to dashboard
        </Link>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        {phases.map((phase) => (
          <div key={phase.title} className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-sm shadow-black/5">
            <h2 className="text-2xl font-semibold tracking-tight">{phase.title}</h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
              {phase.items.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </main>
  );
}
