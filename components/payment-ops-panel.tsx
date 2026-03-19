import Link from "next/link";
import { Invoice, PaymentWebhookEventRecord, ReconciliationAttemptRecord } from "@/lib/types";
import { formatDateTime, getInvoiceDisplayAmount } from "@/lib/format";

export function PaymentOpsPanel({
  pendingInvoices,
  webhookEvents,
  attempts,
}: {
  pendingInvoices: Invoice[];
  webhookEvents: PaymentWebhookEventRecord[];
  attempts: ReconciliationAttemptRecord[];
}) {
  return (
    <section className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-sm shadow-black/5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Payment ops console</p>
          <h3 className="text-2xl font-semibold tracking-tight">Live reconciliation monitor</h3>
        </div>
        <p className="text-sm text-slate-500">Use this panel to explain payment detection, matching, and settlement outcomes.</p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-[1.5rem] border border-slate-100 p-4">
          <p className="text-sm font-semibold text-slate-950">Pending invoices with references</p>
          <div className="mt-4 space-y-3 text-sm">
            {pendingInvoices.length ? pendingInvoices.map((invoice) => (
              <div key={invoice.id} className="rounded-2xl bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{invoice.projectName}</p>
                    <p className="text-slate-500">{invoice.clientName}</p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">{invoice.status}</span>
                </div>
                <p className="mt-2 text-slate-600">{getInvoiceDisplayAmount(invoice)}</p>
                <p className="mt-2 break-all text-xs text-slate-500">ref: {invoice.paymentRequest?.reference ?? "No payment request yet"}</p>
                <div className="mt-3 flex gap-2">
                  <Link href={`/invoices/${invoice.id}`} className="text-xs font-semibold text-slate-700 hover:text-slate-950">Open invoice</Link>
                  <span className="text-slate-300">•</span>
                  <Link href={`/pay/${invoice.id}`} className="text-xs font-semibold text-emerald-700 hover:text-emerald-800">Open checkout</Link>
                </div>
              </div>
            )) : <p className="text-slate-500">No pending invoices with generated payment requests.</p>}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-slate-100 p-4">
          <p className="text-sm font-semibold text-slate-950">Recent webhook events</p>
          <div className="mt-4 space-y-3 text-sm">
            {webhookEvents.length ? webhookEvents.map((event) => (
              <div key={event.id} className="rounded-2xl bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{event.eventType}</p>
                    <p className="text-slate-500">{event.providerKey}</p>
                  </div>
                  <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">{event.processingStatus}</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">{formatDateTime(event.receivedAt)}</p>
                {event.externalEventId ? <p className="mt-1 break-all text-xs text-slate-500">event: {event.externalEventId}</p> : null}
                {event.errorMessage ? <p className="mt-2 text-xs text-rose-600">{event.errorMessage}</p> : null}
              </div>
            )) : <p className="text-slate-500">No webhook events yet.</p>}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-slate-100 p-4">
          <p className="text-sm font-semibold text-slate-950">Recent reconciliation attempts</p>
          <div className="mt-4 space-y-3 text-sm">
            {attempts.length ? attempts.map((attempt) => (
              <div key={attempt.id} className="rounded-2xl bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{attempt.outcome}</p>
                    <p className="text-slate-500">{attempt.invoiceId ?? "No invoice matched"}</p>
                  </div>
                  <p className="text-xs text-slate-500">{formatDateTime(attempt.attemptedAt)}</p>
                </div>
                <p className="mt-2 text-slate-600">{attempt.summary}</p>
                {attempt.reference ? <p className="mt-2 break-all text-xs text-slate-500">ref: {attempt.reference}</p> : null}
                {attempt.txHash ? <p className="mt-1 break-all text-xs text-slate-500">tx: {attempt.txHash}</p> : null}
              </div>
            )) : <p className="text-slate-500">No reconciliation attempts yet.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
