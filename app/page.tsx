import Link from "next/link";
import { getEarningsSummary, getInvoices } from "@/lib/data";
import { formatDate, formatMoney } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";

export default async function HomePage() {
  const [summary, invoices] = await Promise.all([getEarningsSummary(), getInvoices()]);
  const recentInvoices = invoices.slice(0, 5);

  return (
    <main className="space-y-8">
      <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-lg shadow-slate-950/10">
          <p className="text-sm font-medium text-violet-200">Hackathon-ready control center</p>
          <h2 className="mt-2 max-w-2xl text-4xl font-semibold tracking-tight">Create invoices, simulate payment states, and keep freelance cash flow visible.</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
            This MVP keeps real integrations mocked behind simple interfaces so you can demo the workflow today and swap in wallets, escrow, or email automation later.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/invoices/new" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">
              Create invoice
            </Link>
            <a href="#invoices" className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
              Browse invoices
            </a>
          </div>
        </div>
        <div className="rounded-[2rem] border border-black/5 bg-white p-8 shadow-sm shadow-black/5">
          <p className="text-sm font-medium text-slate-500">Current signal</p>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-3xl font-semibold tracking-tight">{formatMoney(summary.totalPaid)}</p>
              <p className="text-sm text-slate-500">Collected</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-semibold text-slate-950">{formatMoney(summary.outstanding)}</p>
                <p className="mt-1 text-slate-500">Outstanding</p>
              </div>
              <div className="rounded-2xl bg-rose-50 p-4">
                <p className="font-semibold text-rose-700">{formatMoney(summary.overdue)}</p>
                <p className="mt-1 text-rose-500">Overdue</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total invoiced" value={formatMoney(summary.totalInvoiced)} tone="slate" />
        <MetricCard label="Paid invoices" value={String(summary.paidCount)} tone="emerald" />
        <MetricCard label="Draft invoices" value={String(summary.draftCount)} tone="violet" />
        <MetricCard label="Invoices in system" value={String(invoices.length)} tone="blue" />
      </section>

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
          {recentInvoices.map((invoice) => (
            <Link
              key={invoice.id}
              href={`/invoices/${invoice.id}`}
              className="grid gap-3 rounded-[1.5rem] border border-slate-100 p-5 transition hover:border-violet-200 hover:bg-violet-50/40 md:grid-cols-[1.2fr_0.8fr_0.6fr_0.7fr] md:items-center"
            >
              <div>
                <p className="font-semibold text-slate-950">{invoice.projectName}</p>
                <p className="mt-1 text-sm text-slate-500">{invoice.clientName} · {invoice.clientEmail}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Due</p>
                <p className="font-medium">{formatDate(invoice.dueDate)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Amount</p>
                <p className="font-medium">{formatMoney(invoice.amount)}</p>
              </div>
              <div className="md:justify-self-end">
                <StatusBadge status={invoice.status} />
              </div>
            </Link>
          ))}
        </div>
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
