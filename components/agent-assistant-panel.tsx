import Link from "next/link";
import { WeeklyFinanceSummary } from "@/lib/agent";
import { formatAssetBreakdown } from "@/lib/format";

export function AgentAssistantPanel({ summary }: { summary: WeeklyFinanceSummary }) {
  return (
    <section className="rounded-[2rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-violet-50 p-6 shadow-sm shadow-black/5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-emerald-700">Weekly finance assistant</p>
          <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{summary.assistantHeadline}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">{summary.assistantSummary}</p>
        </div>
        <div className="rounded-[1.5rem] bg-white/80 px-4 py-3 text-sm shadow-sm shadow-black/5">
          <p className="text-slate-500">Window</p>
          <p className="font-semibold text-slate-950">{summary.periodLabel}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <SummaryCard label="Expected this week" value={formatAssetBreakdown(summary.expectedThisWeekByAsset)} />
        <SummaryCard label="Overdue amount" value={formatAssetBreakdown(summary.overdueByAsset)} />
        <SummaryCard label="Collected so far" value={formatAssetBreakdown(summary.paidByAsset)} />
        <SummaryCard label="Follow up now" value={String(summary.followUpNowCount)} />
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white p-5 text-sm text-slate-700">
        <p className="font-semibold text-slate-950">Suggested operating plan</p>
        <ol className="mt-3 space-y-2 leading-6">
          <li>1. Clear overdue invoices first so the story starts with recovery of at-risk cash.</li>
          <li>2. Nudge viewed invoices close to the due date while the client already has context.</li>
          <li>3. Use the hosted MiniPay checkout link as the single CTA in each reminder.</li>
        </ol>
        {summary.topPriorityIds.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-3">
            {summary.topPriorityIds.map((invoiceId) => (
              <Link key={invoiceId} href={`/invoices/${invoiceId}`} className="rounded-full border border-violet-200 px-4 py-2 font-semibold text-violet-700 transition hover:bg-violet-50">
                Review {invoiceId}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] bg-white p-4 shadow-sm shadow-black/5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
    </div>
  );
}
