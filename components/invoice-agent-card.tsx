import Link from "next/link";
import { InvoiceAgentInsight } from "@/lib/agent";

const urgencyStyles = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-rose-100 text-rose-700",
};

export function InvoiceAgentCard({
  insight,
  compact = false,
}: {
  insight: InvoiceAgentInsight;
  compact?: boolean;
}) {
  return (
    <div className="rounded-[1.5rem] border border-violet-100 bg-violet-50/70 p-5 text-sm text-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold text-slate-950">Agent recommendation</p>
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${urgencyStyles[insight.urgency]}`}>
          {insight.followUpNow ? "follow up now" : `${insight.urgency} urgency`}
        </span>
      </div>

      <p className="mt-3 leading-6"><span className="font-semibold text-slate-950">Why:</span> {insight.followUpReason}</p>
      <p className="mt-3 leading-6"><span className="font-semibold text-slate-950">Next action:</span> {insight.suggestedNextAction}</p>
      <p className="mt-1 leading-6 text-slate-600">{insight.suggestedNextActionDetail}</p>

      {!compact ? (
        <div className="mt-4 rounded-[1.25rem] bg-white p-4">
          <p className="font-semibold text-slate-950">Auto-generated reminder draft</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Subject</p>
          <p className="mt-1 font-medium text-slate-950">{insight.reminderSubject}</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Message</p>
          <p className="mt-2 whitespace-pre-line leading-6 text-slate-700">{insight.reminderMessage}</p>
        </div>
      ) : null}

      {compact ? (
        <div className="mt-4">
          <Link href={`/invoices/${insight.invoiceId}`} className="inline-flex rounded-full border border-violet-200 px-4 py-2 font-semibold text-violet-700 transition hover:bg-white">
            Open recommendation
          </Link>
        </div>
      ) : null}
    </div>
  );
}
