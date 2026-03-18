import Link from "next/link";
import { AgentAssistantPanel } from "@/components/agent-assistant-panel";
import { DemoResetButton } from "@/components/demo-reset-button";
import { InvoiceAgentCard } from "@/components/invoice-agent-card";
import { StatusBadge } from "@/components/status-badge";
import { getInvoiceAgentInsight, getWeeklyFinanceSummary } from "@/lib/agent";
import { getEarningsSummary, getInvoices } from "@/lib/data";
import { formatAssetBreakdown, formatDate, getInvoiceDisplayAmount } from "@/lib/format";

export default async function HomePage() {
  const [summary, invoices] = await Promise.all([getEarningsSummary(), getInvoices()]);
  const recentInvoices = invoices.slice(0, 5);
  const featuredInvoice = invoices[0];
  const celoReadyCount = invoices.filter((invoice) => invoice.status !== "paid" && invoice.paymentRoute.networkLabel.toLowerCase().includes("celo")).length;
  const invoiceInsights = invoices.map((invoice) => ({ invoice, insight: getInvoiceAgentInsight(invoice) }));
  const followUpNow = invoiceInsights.filter(({ insight }) => insight.followUpNow).slice(0, 2);
  const weeklyFinanceSummary = getWeeklyFinanceSummary(invoices, summary);

  return (
    <main className="space-y-8">
      <section className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
        <div className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-lg shadow-slate-950/10">
          <p className="text-sm font-medium text-emerald-200">Hackathon-ready payment ops demo</p>
          <h2 className="mt-2 max-w-3xl text-4xl font-semibold tracking-tight">Create invoices from plain English, launch a Celo checkout, and show an agent suggesting the next best follow-up.</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
            The app stays fully local, keeps blockchain interactions mocked behind API routes and interfaces, and now adds a visible event history, a polished shareable client flow, and one-click demo reset for judge runs.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/invoices/new" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">
              Start with plain-English invoice
            </Link>
            {featuredInvoice ? (
              <Link href={`/pay/${featuredInvoice.id}`} className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                Open MiniPay sample checkout
              </Link>
            ) : null}
            <Link href="/roadmap" className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
              View Phase roadmap
            </Link>
          </div>
          <div className="mt-8 grid gap-3 md:grid-cols-4">
            <StoryPill step="1" text="Paste a prompt like ‘Invoice Acme €500 for landing page design due next Friday’." />
            <StoryPill step="2" text="Review the parsed fields and create the invoice with a MiniPay/Celo checkout link." />
            <StoryPill step="3" text="Open the invoice detail page and show the agent’s reminder draft plus event timeline." />
            <StoryPill step="4" text="Finish in the hosted checkout flow, then reset the demo for the next judge." />
          </div>
        </div>

        <div className="space-y-4 rounded-[2rem] border border-black/5 bg-white p-8 shadow-sm shadow-black/5">
          <div>
            <p className="text-sm font-medium text-slate-500">Live signal</p>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-3xl font-semibold tracking-tight">{formatAssetBreakdown(summary.totalPaidByAsset)}</p>
                <p className="text-sm text-slate-500">Collected</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-semibold text-slate-950">{formatAssetBreakdown(summary.outstandingByAsset)}</p>
                  <p className="mt-1 text-slate-500">Outstanding</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-4">
                  <p className="font-semibold text-emerald-700">{celoReadyCount}</p>
                  <p className="mt-1 text-emerald-600">Celo-ready links</p>
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-rose-100 bg-rose-50/70 p-4 text-sm leading-7 text-slate-700">
                <p className="font-semibold text-slate-950">Follow-up now</p>
                <p className="mt-1">{weeklyFinanceSummary.followUpNowCount} invoice{weeklyFinanceSummary.followUpNowCount === 1 ? "" : "s"} need attention right now. Use the agent card below to show why.</p>
              </div>
            </div>
          </div>

          <DemoResetButton />
        </div>
      </section>

      <AgentAssistantPanel summary={weeklyFinanceSummary} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total invoiced" value={formatAssetBreakdown(summary.totalInvoicedByAsset)} tone="slate" />
        <MetricCard label="Paid invoices" value={String(summary.paidCount)} tone="emerald" />
        <MetricCard label="Outstanding pipeline" value={formatAssetBreakdown(summary.outstandingByAsset)} tone="blue" />
        <MetricCard label="Follow-up now" value={String(weeklyFinanceSummary.followUpNowCount)} tone="violet" />
      </section>

      {followUpNow.length > 0 ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {followUpNow.map(({ invoice, insight }) => (
            <div key={invoice.id} className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-sm shadow-black/5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">Follow-up intelligence</p>
                  <h3 className="text-2xl font-semibold tracking-tight">{invoice.projectName}</h3>
                  <p className="mt-1 text-sm text-slate-500">{invoice.clientName} · due {formatDate(invoice.dueDate)}</p>
                </div>
                <StatusBadge status={invoice.status} />
              </div>
              <InvoiceAgentCard insight={insight} compact />
            </div>
          ))}
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-sm shadow-black/5">
          <p className="text-sm font-medium text-slate-500">Presentation flow</p>
          <h3 className="mt-1 text-2xl font-semibold tracking-tight">What to click during the demo</h3>
          <ol className="mt-5 space-y-4 text-sm leading-7 text-slate-700">
            <li><span className="font-semibold text-slate-950">Open the invoice composer.</span> Paste a natural-language prompt and hit <span className="font-medium">Parse into fields</span>.</li>
            <li><span className="font-semibold text-slate-950">Create the invoice.</span> The app stores it locally and opens the invoice detail screen.</li>
            <li><span className="font-semibold text-slate-950">Show the agent layer.</span> Use the invoice detail page to demo the reminder draft, suggested next action, and full event timeline.</li>
            <li><span className="font-semibold text-slate-950">Jump to the MiniPay checkout.</span> Generate the payment request and show the Celo transaction preview plus recent invoice history.</li>
            <li><span className="font-semibold text-slate-950">Close the loop.</span> Verify the submitted tx hash on Celo Sepolia, show the paid state reflected in the dashboard metrics, then hit reset for the next walkthrough.</li>
          </ol>
        </div>

        <section id="invoices" className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-sm shadow-black/5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Recent invoices</p>
              <h3 className="text-2xl font-semibold tracking-tight">Pipeline at a glance</h3>
            </div>
            <Link href="/invoices/new" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              Add another invoice
            </Link>
          </div>

          <div className="mt-6 grid gap-4">
            {recentInvoices.map((invoice) => {
              const insight = getInvoiceAgentInsight(invoice);
              return (
                <div
                  key={invoice.id}
                  className="grid gap-4 rounded-[1.5rem] border border-slate-100 p-5 transition hover:border-violet-200 hover:bg-violet-50/40"
                >
                  <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr_0.6fr_0.7fr] md:items-center">
                    <Link href={`/invoices/${invoice.id}`} className="block">
                      <p className="font-semibold text-slate-950">{invoice.projectName}</p>
                      <p className="mt-1 text-sm text-slate-500">{invoice.clientName} · {invoice.clientEmail || "No email provided"}</p>
                    </Link>
                    <div>
                      <p className="text-sm text-slate-500">Due</p>
                      <p className="font-medium">{formatDate(invoice.dueDate)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Amount</p>
                      <p className="font-medium">{getInvoiceDisplayAmount(invoice)}</p>
                    </div>
                    <div className="md:justify-self-end">
                      <StatusBadge status={invoice.status} />
                    </div>
                  </div>
                  <div className="rounded-[1.25rem] bg-slate-50 p-4 text-sm text-slate-700">
                    <p className="font-semibold text-slate-950">Suggested next action</p>
                    <p className="mt-1">{insight.suggestedNextAction}</p>
                    <p className="mt-1 text-slate-500">{insight.followUpReason}</p>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                    <span>{invoice.events.length} logged events</span>
                    <span>•</span>
                    <span>{invoice.reminderCount} reminder{invoice.reminderCount === 1 ? "" : "s"}</span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link href={`/invoices/${invoice.id}`} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                      Open invoice
                    </Link>
                    <Link href={`/pay/${invoice.id}`} className="rounded-full border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50">
                      Open Celo checkout
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: "slate" | "emerald" | "violet" | "blue" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    emerald: "bg-emerald-100 text-emerald-700",
    violet: "bg-violet-100 text-violet-700",
    blue: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="rounded-[1.75rem] border border-black/5 bg-white p-5 shadow-sm shadow-black/5">
      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tones[tone]}`}>{label}</span>
      <p className="mt-4 text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function StoryPill({ step, text }: { step: string; text: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-200">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">Step {step}</p>
      <p className="mt-2">{text}</p>
    </div>
  );
}
