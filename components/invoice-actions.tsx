"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PaymentStatus } from "@/lib/types";

export function InvoiceActions({ id, status, payHref }: { id: string; status: PaymentStatus; payHref?: string }) {
  const router = useRouter();
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [reminderPreview, setReminderPreview] = useState<{ subject: string; body: string } | null>(null);

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
    setReminderPreview(data.reminderDraft ?? null);
    setIsBusy(false);
    router.refresh();
  }

  async function copyShareLink() {
    const url = `${window.location.origin}${payHref ?? `/pay/${id}`}`;
    await navigator.clipboard.writeText(url);
    setMessage("Shareable client payment link copied.");
  }

  return (
    <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm shadow-black/5">
      <p className="text-sm font-medium text-slate-500">Invoice controls</p>
      <div className="mt-4 flex flex-wrap gap-3">
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
          Generate reminder draft
        </button>
        <button
          onClick={copyShareLink}
          className="rounded-full border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
        >
          Copy share link
        </button>
      </div>

      <div className="mt-4 rounded-[1.5rem] bg-slate-50 p-4 text-sm text-slate-600">
        <p className="font-semibold text-slate-950">Client-facing step</p>
        <p className="mt-1">Want the stronger demo beat? Open the checkout and walk through the payment request, wallet handoff, tx hash, and final settlement in stable-token or native-CELO mode.</p>
        <Link href={payHref ?? `/pay/${id}`} className="mt-3 inline-flex rounded-full border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-white">
          Open Celo checkout
        </Link>
      </div>

      {reminderPreview ? (
        <div className="mt-4 rounded-[1.5rem] border border-violet-100 bg-violet-50/70 p-4 text-sm text-slate-700">
          <p className="font-semibold text-slate-950">Latest reminder draft</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Subject</p>
          <p className="mt-1 font-medium text-slate-950">{reminderPreview.subject}</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Message</p>
          <p className="mt-2 whitespace-pre-line leading-6">{reminderPreview.body}</p>
        </div>
      ) : null}

      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
    </div>
  );
}
