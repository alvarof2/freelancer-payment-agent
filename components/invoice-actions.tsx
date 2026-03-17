"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PaymentStatus } from "@/lib/types";

export function InvoiceActions({ id, status }: { id: string; status: PaymentStatus }) {
  const router = useRouter();
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function updateStatus(nextStatus: PaymentStatus) {
    setIsBusy(true);
    setMessage(null);
    const response = await fetch(`/api/invoices/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const data = await response.json();
    setMessage(data.message ?? `Invoice updated to ${nextStatus}.`);
    setIsBusy(false);
    router.refresh();
  }

  async function sendReminder() {
    setIsBusy(true);
    setMessage(null);
    const response = await fetch(`/api/invoices/${id}/reminder`, { method: "POST" });
    const data = await response.json();
    setMessage(data.message ?? "Reminder stub sent.");
    setIsBusy(false);
    router.refresh();
  }

  return (
    <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm shadow-black/5">
      <div className="flex flex-wrap gap-3">
        {status !== "paid" ? (
          <button
            onClick={() => updateStatus("paid")}
            disabled={isBusy}
            className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
          >
            Mark as paid
          </button>
        ) : null}
        {status !== "viewed" && status !== "paid" ? (
          <button
            onClick={() => updateStatus("viewed")}
            disabled={isBusy}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Simulate client view
          </button>
        ) : null}
        {status !== "overdue" && status !== "paid" ? (
          <button
            onClick={() => updateStatus("overdue")}
            disabled={isBusy}
            className="rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
          >
            Force overdue
          </button>
        ) : null}
        <button
          onClick={sendReminder}
          disabled={isBusy}
          className="rounded-full border border-violet-200 px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 disabled:opacity-50"
        >
          Send reminder stub
        </button>
      </div>
      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
    </div>
  );
}
