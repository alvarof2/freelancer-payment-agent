"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Invoice, MockPaymentQuote } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/format";

export function ClientPaymentCard({ invoice }: { invoice: Invoice }) {
  const router = useRouter();
  const [quote, setQuote] = useState<MockPaymentQuote | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const timeline = useMemo(() => {
    return [
      { key: "quote_ready", label: "Payment request", done: Boolean(quote) },
      { key: "wallet_opened", label: "MiniPay opened", done: quote?.state === "wallet_opened" || quote?.state === "submitted" || quote?.state === "confirmed" },
      { key: "submitted", label: "Tx submitted", done: quote?.state === "submitted" || quote?.state === "confirmed" },
      { key: "confirmed", label: "Settled", done: quote?.state === "confirmed" || invoice.status === "paid" },
    ];
  }, [invoice.status, quote]);

  async function runAction(action: "create" | "open-wallet" | "submit" | "confirm") {
    setIsBusy(true);
    setMessage(null);

    const response = await fetch(`/api/invoices/${invoice.id}/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, sessionId: quote?.sessionId }),
    });

    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Checkout action failed.");
      setIsBusy(false);
      return;
    }

    setQuote(data.quote);
    setMessage(data.message ?? data.quote?.statusCopy ?? "Checkout updated.");
    setIsBusy(false);
    router.refresh();
  }

  const actionButton = (() => {
    if (invoice.status === "paid" || quote?.state === "confirmed") {
      return {
        label: "Payment confirmed",
        onClick: () => undefined,
        disabled: true,
      };
    }

    if (!quote) {
      return {
        label: "Generate MiniPay payment request",
        onClick: () => runAction("create"),
        disabled: isBusy,
      };
    }

    if (quote.state === "quote_ready") {
      return {
        label: "Open MiniPay mock checkout",
        onClick: () => runAction("open-wallet"),
        disabled: isBusy,
      };
    }

    if (quote.state === "wallet_opened") {
      return {
        label: "Submit mock Celo transaction",
        onClick: () => runAction("submit"),
        disabled: isBusy,
      };
    }

    return {
      label: "Confirm local settlement",
      onClick: () => runAction("confirm"),
      disabled: isBusy,
    };
  })();

  return (
    <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-lg shadow-slate-950/10">
        <p className="text-sm font-medium text-emerald-200">MiniPay-ready payment link</p>
        <h2 className="mt-2 text-4xl font-semibold tracking-tight">{formatMoney(invoice.amount, invoice.currency)}</h2>
        <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">
          Pay {invoice.clientName}&rsquo;s invoice over <span className="font-medium text-white">MiniPay on Celo</span> using a mocked but believable checkout flow.
          It stays local, needs no wallet secrets, and keeps the blockchain integration behind a clean provider layer.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Detail label="Invoice" value={invoice.id} />
          <Detail label="Due date" value={formatDate(invoice.dueDate)} />
          <Detail label="Payment rail" value={quote?.rail ?? invoice.paymentRail} />
          <Detail label="Recipient" value={quote?.recipient ?? invoice.paymentAddress} mono />
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-emerald-200">Checkout timeline</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {timeline.map((step, index) => (
              <div key={step.key} className={`rounded-2xl border p-4 ${step.done ? "border-emerald-400/40 bg-emerald-400/10" : "border-white/10 bg-white/5"}`}>
                <p className="text-xs text-slate-300">Step {index + 1}</p>
                <p className="mt-1 font-medium text-white">{step.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-5 rounded-[2rem] border border-black/5 bg-white p-6 shadow-sm shadow-black/5">
        <div className="rounded-[1.5rem] bg-slate-50 p-5">
          <p className="text-sm font-medium text-slate-500">Included scope</p>
          <p className="mt-2 text-sm leading-7 text-slate-700">{invoice.description}</p>
        </div>

        <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50/70 p-5 text-sm text-slate-700">
          <p className="font-semibold text-slate-950">Why this works in a hackathon demo</p>
          <ul className="mt-3 space-y-2 leading-6">
            <li>• Feels like a hosted checkout instead of a raw status toggle.</li>
            <li>• Uses MiniPay/Celo/cUSD copy, fee preview, and a deep-link style handoff.</li>
            <li>• Keeps the real payment provider swappable later through one interface.</li>
          </ul>
        </div>

        <div className="space-y-3 rounded-[1.5rem] border border-violet-100 bg-violet-50/80 p-5 text-sm text-slate-700">
          <p className="font-semibold text-slate-950">MiniPay checkout actions</p>
          <p>{quote?.statusCopy ?? "Generate the payment request, open the MiniPay handoff, submit the mock tx, then confirm settlement locally."}</p>
          <button
            onClick={actionButton.onClick}
            disabled={actionButton.disabled}
            className="w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {isBusy ? "Updating checkout..." : actionButton.label}
          </button>
          {message ? <p className="text-sm text-slate-600">{message}</p> : null}
        </div>

        <div className="grid gap-3 rounded-[1.5rem] border border-slate-100 p-5 text-sm text-slate-700">
          <p className="font-semibold text-slate-950">Transaction preview</p>
          <PreviewRow label="Wallet" value={quote?.wallet ?? "MiniPay"} />
          <PreviewRow label="Network" value={quote?.network ?? "Celo Mainnet"} />
          <PreviewRow label="Stablecoin" value={quote?.token ?? invoice.currency} />
          <PreviewRow label="Amount" value={quote?.amountFormatted ?? formatMoney(invoice.amount, invoice.currency)} />
          <PreviewRow label="Fee estimate" value={quote?.feeEstimate ?? "~0.0008 CELO"} />
          <PreviewRow label="Reference" value={quote?.reference ?? "Generated on request"} mono />
          <PreviewRow label="Memo" value={quote?.memo ?? `${invoice.projectName} • pending reference`} />
          <PreviewRow label="Deep link" value={quote?.deepLink ?? "minipay://pay?..."} mono />
          <PreviewRow label="Explorer preview" value={quote?.txHash ?? "Hash appears after submit"} mono />
          <PreviewRow label="ETA" value={quote?.estimatedArrival ?? "~5 seconds after confirmation in demo mode"} />
        </div>
      </div>
    </section>
  );
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className={`mt-2 text-sm text-white ${mono ? "font-mono" : "font-medium"}`}>{value}</p>
    </div>
  );
}

function PreviewRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
      <p className="text-slate-500">{label}</p>
      <p className={`text-right text-slate-950 ${mono ? "font-mono text-xs" : "font-medium"}`}>{value}</p>
    </div>
  );
}
