"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PollPaymentsButton() {
  const router = useRouter();
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onPoll() {
    setIsBusy(true);
    setMessage(null);

    const response = await fetch("/api/reconciliation/poll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lookbackBlocks: 120 }),
    });
    const data = await response.json();

    setMessage(data.paidInvoices > 0
      ? `Detected and reconciled ${data.paidInvoices} payment${data.paidInvoices === 1 ? "" : "s"}.`
      : `Scan complete. ${data.scannedInvoices ?? 0} invoice${data.scannedInvoices === 1 ? "" : "s"} checked, no verified payments found.`);
    setIsBusy(false);
    router.refresh();
  }

  return (
    <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-slate-700">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-slate-950">Celo Sepolia polling</p>
          <p className="mt-1">Scan recent Celo Sepolia activity for unpaid invoices and auto-verify any matching payment.</p>
        </div>
        <button
          onClick={onPoll}
          disabled={isBusy}
          className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
        >
          {isBusy ? "Polling Sepolia..." : "Poll Celo Sepolia"}
        </button>
      </div>
      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
    </div>
  );
}
