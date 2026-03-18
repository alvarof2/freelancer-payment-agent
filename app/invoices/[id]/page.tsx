import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceActions } from "@/components/invoice-actions";
import { InvoiceAgentCard } from "@/components/invoice-agent-card";
import { InvoiceTimeline } from "@/components/invoice-timeline";
import { StatusBadge } from "@/components/status-badge";
import { getInvoiceAgentInsight } from "@/lib/agent";
import { getInvoiceById } from "@/lib/data";
import { formatDate, formatDisplayAmount } from "@/lib/format";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await getInvoiceById(id);

  if (!invoice) notFound();

  const insight = getInvoiceAgentInsight(invoice);

  return (
    <main className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
      <section className="space-y-6">
        <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-sm shadow-black/5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-violet-600">Invoice detail</p>
              <h2 className="text-3xl font-semibold tracking-tight">{invoice.projectName}</h2>
              <p className="mt-2 text-sm text-slate-500">{invoice.id} · Issued {formatDate(invoice.issuedAt)}</p>
            </div>
            <StatusBadge status={invoice.status} />
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-emerald-100 bg-emerald-50/70 p-5 text-sm leading-7 text-slate-700">
            <p className="font-semibold text-slate-950">Demo story</p>
            <p className="mt-2">This invoice now carries a real local event log plus explicit invoice currency, settlement asset, and payment route metadata. Show the follow-up recommendation, generate reminder copy, then use the timeline to prove the client journey from shareable link to verified onchain settlement.</p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <InfoCard label="Client" value={invoice.clientName} subvalue={invoice.clientEmail || "Email not added"} />
            <InfoCard label="Invoice amount" value={formatDisplayAmount(invoice.display)} subvalue={`Display currency · ${invoice.display.currency}`} />
            <InfoCard label="Due date" value={formatDate(invoice.dueDate)} subvalue={`Reminders sent: ${invoice.reminderCount}`} />
            <InfoCard label="Payment route" value={`${invoice.paymentRoute.providerLabel} · ${invoice.paymentRoute.networkLabel}`} subvalue={`${invoice.paymentRoute.settlementAsset.code} settlement · ${invoice.recipientAddress}`} />
          </div>

          <div className="mt-6">
            <InvoiceAgentCard insight={insight} />
          </div>

          <div className="mt-6">
            <p className="text-sm font-medium text-slate-500">Scope</p>
            <p className="mt-2 rounded-[1.5rem] bg-slate-50 p-5 text-sm leading-7 text-slate-700">{invoice.description}</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/pay/${invoice.id}`} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
              Open Celo Sepolia checkout
            </Link>
            <Link href="/" className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              Back to dashboard
            </Link>
          </div>
        </div>

        <InvoiceTimeline events={invoice.events} />
      </section>

      <aside className="space-y-6">
        <InvoiceActions id={invoice.id} status={invoice.status} payHref={`/pay/${invoice.id}`} />
        <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-sm shadow-black/5">
          <p className="text-sm font-medium text-slate-500">Shareable client experience</p>
          <div className="mt-4 flex flex-col gap-3">
            <Link href={`/pay/${invoice.id}`} className="rounded-full border border-emerald-200 px-4 py-2 text-center text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50">
              Open hosted payment page
            </Link>
            <Link href="/invoices/new" className="rounded-full bg-slate-950 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-slate-800">
              Create another invoice
            </Link>
          </div>
          <div className="mt-6 rounded-[1.5rem] bg-slate-50 p-4 text-sm text-slate-600">
            <p>Last updated: {formatDate(invoice.updatedAt)}</p>
            <p className="mt-1">Last reminder: {invoice.lastReminderAt ? formatDate(invoice.lastReminderAt) : "No reminders yet"}</p>
            <p className="mt-1">Follow-up signal: {insight.followUpNow ? "Act now" : "Monitor"}</p>
            <p className="mt-1">Timeline events: {invoice.events.length}</p>
          </div>
        </div>
      </aside>
    </main>
  );
}

function InfoCard({ label, value, subvalue }: { label: string; value: string; subvalue?: string }) {
  return (
    <div className="rounded-[1.5rem] bg-slate-50 p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 font-semibold text-slate-950">{value}</p>
      {subvalue ? <p className="mt-1 text-sm text-slate-500 break-all">{subvalue}</p> : null}
    </div>
  );
}
