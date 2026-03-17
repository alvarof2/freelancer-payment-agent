import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceActions } from "@/components/invoice-actions";
import { StatusBadge } from "@/components/status-badge";
import { getInvoiceById } from "@/lib/data";
import { formatDate, formatMoney } from "@/lib/format";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await getInvoiceById(id);

  if (!invoice) notFound();

  return (
    <main className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
      <section className="space-y-6 rounded-[2rem] border border-black/5 bg-white p-6 shadow-sm shadow-black/5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-violet-600">Invoice detail</p>
            <h2 className="text-3xl font-semibold tracking-tight">{invoice.projectName}</h2>
            <p className="mt-2 text-sm text-slate-500">{invoice.id} · Issued {formatDate(invoice.issuedAt)}</p>
          </div>
          <StatusBadge status={invoice.status} />
        </div>

        <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50/70 p-5 text-sm leading-7 text-slate-700">
          <p className="font-semibold text-slate-950">Demo story</p>
          <p className="mt-2">This invoice is now tuned for a MiniPay-on-Celo demo: open the client checkout, generate a payment request, walk through the mock wallet handoff, then confirm settlement back into the dashboard.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <InfoCard label="Client" value={invoice.clientName} subvalue={invoice.clientEmail || "Email not added"} />
          <InfoCard label="Amount" value={formatMoney(invoice.amount, invoice.currency)} subvalue={invoice.currency} />
          <InfoCard label="Due date" value={formatDate(invoice.dueDate)} subvalue={`Reminders sent: ${invoice.reminderCount}`} />
          <InfoCard label="Payment rail" value={invoice.paymentRail} subvalue={invoice.paymentAddress} />
        </div>

        <div>
          <p className="text-sm font-medium text-slate-500">Scope</p>
          <p className="mt-2 rounded-[1.5rem] bg-slate-50 p-5 text-sm leading-7 text-slate-700">{invoice.description}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href={`/pay/${invoice.id}`} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
            Open MiniPay checkout
          </Link>
          <Link href="/" className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            Back to dashboard
          </Link>
        </div>
      </section>

      <aside className="space-y-6">
        <InvoiceActions id={invoice.id} status={invoice.status} />
        <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-sm shadow-black/5">
          <p className="text-sm font-medium text-slate-500">Fast paths</p>
          <div className="mt-4 flex flex-col gap-3">
            <Link href={`/pay/${invoice.id}`} className="rounded-full border border-emerald-200 px-4 py-2 text-center text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50">
              Share MiniPay checkout
            </Link>
            <Link href="/invoices/new" className="rounded-full bg-slate-950 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-slate-800">
              Create another invoice
            </Link>
          </div>
          <div className="mt-6 rounded-[1.5rem] bg-slate-50 p-4 text-sm text-slate-600">
            <p>Last updated: {formatDate(invoice.updatedAt)}</p>
            <p className="mt-1">Last reminder: {invoice.lastReminderAt ? formatDate(invoice.lastReminderAt) : "No reminders yet"}</p>
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
      {subvalue ? <p className="mt-1 text-sm text-slate-500">{subvalue}</p> : null}
    </div>
  );
}
