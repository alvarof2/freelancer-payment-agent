import { InvoiceEvent } from "@/lib/types";
import { formatDateTime } from "@/lib/format";

const toneMap: Record<InvoiceEvent["type"], string> = {
  created: "bg-slate-900 text-white",
  share_link_ready: "bg-blue-100 text-blue-700",
  client_viewed: "bg-emerald-100 text-emerald-700",
  reminder_generated: "bg-violet-100 text-violet-700",
  payment_request_generated: "bg-cyan-100 text-cyan-700",
  wallet_opened: "bg-amber-100 text-amber-700",
  payment_submitted: "bg-orange-100 text-orange-700",
  payment_confirmed: "bg-emerald-500 text-white",
  payment_verification_failed: "bg-amber-100 text-amber-700",
  status_changed: "bg-rose-100 text-rose-700",
  demo_reset: "bg-slate-200 text-slate-700",
};

export function InvoiceTimeline({ events }: { events: InvoiceEvent[] }) {
  return (
    <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-sm shadow-black/5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">Invoice history</p>
          <h3 className="text-2xl font-semibold tracking-tight">Timeline for the judge demo</h3>
        </div>
        <p className="text-sm text-slate-500">{events.length} events logged locally</p>
      </div>

      <div className="mt-6 space-y-4">
        {events.map((event, index) => (
          <div key={event.id} className="relative pl-7">
            {index !== events.length - 1 ? <div className="absolute left-[11px] top-7 h-[calc(100%+0.75rem)] w-px bg-slate-200" /> : null}
            <div className="absolute left-0 top-2.5 h-6 w-6 rounded-full border-4 border-white bg-slate-300 shadow-sm" />
            <div className="rounded-[1.5rem] bg-slate-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${toneMap[event.type]}`}>{event.title}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-700">{event.detail}</p>
                </div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">{formatDateTime(event.at)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
