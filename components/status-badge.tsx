import { PaymentStatus } from "@/lib/types";

const statusStyles: Record<PaymentStatus, string> = {
  draft: "bg-slate-200 text-slate-700",
  sent: "bg-blue-100 text-blue-700",
  viewed: "bg-violet-100 text-violet-700",
  paid: "bg-emerald-100 text-emerald-700",
  overdue: "bg-rose-100 text-rose-700",
};

export function StatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyles[status]}`}>
      {status}
    </span>
  );
}
