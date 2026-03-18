"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Invoice, PaymentMode, PaymentRequest } from "@/lib/types";
import { formatDate, formatDateTime, formatDisplayAmount, getInvoiceSettlementAmount } from "@/lib/format";
import { inferInvoicePaymentMode } from "@/lib/payment-mode";
const EXPLORER_BASE_URL = "https://celo-sepolia.blockscout.com";

type NoticeTone = "info" | "success" | "error";
type UiPhase = "idle" | "creating" | "wallet" | "verifying" | "confirmed" | "error";

interface Notice {
  tone: NoticeTone;
  text: string;
}

export function ClientPaymentCard({ invoice }: { invoice: Invoice }) {
  const router = useRouter();
  const defaultPaymentMode = inferInvoicePaymentMode(invoice, true);
  const [quote, setQuote] = useState<PaymentRequest | null>(invoice.paymentRequest ?? null);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(invoice.paymentRequest?.mode ?? defaultPaymentMode);
  const [txHash, setTxHash] = useState(invoice.paymentVerification?.txHash ?? "");
  const [isBusy, setIsBusy] = useState(false);
  const [uiPhase, setUiPhase] = useState<UiPhase>(invoice.status === "paid" ? "confirmed" : "idle");
  const [notice, setNotice] = useState<Notice | null>(
    invoice.status === "paid"
      ? { tone: "success", text: invoice.paymentVerification?.summary ?? "Payment verified onchain and marked as paid." }
      : null,
  );

  const activeMode = quote?.mode ?? paymentMode;
  const activeSettlementAsset = quote?.settlementAsset ?? invoice.paymentRoute.settlementAsset;
  const trimmedTxHash = txHash.trim();
  const txHashLooksValid = /^0x[a-fA-F0-9]{64}$/.test(trimmedTxHash);
  const paymentConfirmed = invoice.status === "paid" || uiPhase === "confirmed";
  const currentTxExplorerUrl = invoice.paymentVerification?.explorerUrl ?? (txHashLooksValid ? `${EXPLORER_BASE_URL}/tx/${trimmedTxHash}` : null);
  const networkExplorerUrl = `${EXPLORER_BASE_URL}/address/${quote?.recipient ?? invoice.recipientAddress}`;

  const timeline = useMemo(
    () => [
      {
        key: "quote_ready",
        label: quote ? "Request ready" : "Generate request",
        detail: quote ? `Checkout prepared for ${quote.mode === "stable" ? quote.settlementAsset.code : `native ${quote.settlementAsset.code}`}.` : "Create a payment request with the final recipient, asset, amount, and memo.",
        done: Boolean(quote),
        active: !quote,
      },
      {
        key: "wallet_opened",
        label: quote?.state === "wallet_opened" ? "Wallet handoff attempted" : "Send payment in wallet",
        detail: quote?.state === "wallet_opened"
          ? "Deep link opened or copied. If nothing happened, send manually using the details below."
          : "Use the deep link or copy the recipient, amount, and token into any compatible wallet.",
        done: quote?.state === "wallet_opened" || Boolean(trimmedTxHash) || paymentConfirmed,
        active: Boolean(quote) && !trimmedTxHash && !paymentConfirmed,
      },
      {
        key: "submitted",
        label: trimmedTxHash ? "Tx hash received" : "Paste tx hash",
        detail: trimmedTxHash
          ? "The submitted hash is ready for onchain verification."
          : "After broadcasting the payment, paste the final transaction hash from your wallet or explorer.",
        done: Boolean(trimmedTxHash) || paymentConfirmed,
        active: Boolean(quote) && !paymentConfirmed && Boolean(trimmedTxHash),
      },
      {
        key: "confirmed",
        label: paymentConfirmed ? "Payment confirmed" : uiPhase === "verifying" ? "Verifying onchain" : "Verify and mark paid",
        detail: paymentConfirmed
          ? invoice.paymentVerification?.summary ?? "The invoice has been marked paid after onchain checks passed."
          : uiPhase === "verifying"
            ? "Checking recipient, network, success status, and amount on Celo Sepolia."
            : "The invoice only flips to paid after the tx passes onchain verification.",
        done: paymentConfirmed,
        active: uiPhase === "verifying" || paymentConfirmed,
      },
    ],
    [invoice.paymentVerification?.summary, paymentConfirmed, quote, trimmedTxHash, uiPhase],
  );

  const statusPanel = (() => {
    if (paymentConfirmed) {
      return {
        eyebrow: "Confirmed",
        title: "Payment verified on Celo Sepolia",
        body: invoice.paymentVerification?.summary ?? "The invoice is settled and the onchain checks passed.",
        tone: "success" as const,
      };
    }

    if (uiPhase === "verifying") {
      return {
        eyebrow: "Verifying",
        title: "Checking the submitted transaction",
        body: "We’re validating chain, recipient, transfer amount, and success status before this invoice is marked paid.",
        tone: "info" as const,
      };
    }

    if (uiPhase === "error") {
      return {
        eyebrow: "Needs attention",
        title: "Payment not verified yet",
        body: notice?.text ?? "Double-check the hash, network, recipient, and amount, then try again.",
        tone: "error" as const,
      };
    }

    if (quote) {
      return {
        eyebrow: "Ready",
        title: "Send manually or open a wallet",
        body: `Use the exact ${activeMode === "stable" ? activeSettlementAsset.code : `native ${activeSettlementAsset.code}`} details below, then paste the final tx hash here for verification.`,
        tone: "info" as const,
      };
    }

    return {
      eyebrow: "Start here",
      title: "Generate the payment request",
      body: "Choose the payment mode, create the request, then either hand off to a wallet or send the transfer manually.",
      tone: "info" as const,
    };
  })();

  async function runAction(action: "create" | "open-wallet" | "verify") {
    setIsBusy(true);
    if (action === "create") {
      setUiPhase("creating");
      setNotice({ tone: "info", text: "Generating the payment request…" });
    } else if (action === "open-wallet") {
      setUiPhase("wallet");
      setNotice({ tone: "info", text: "Opening the wallet handoff…" });
    } else {
      setUiPhase("verifying");
      setNotice({ tone: "info", text: "Verifying the submitted transaction on Celo Sepolia…" });
    }

    try {
      const mode = quote?.mode ?? paymentMode;
      const response = await fetch(`/api/invoices/${invoice.id}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, sessionId: quote?.sessionId, txHash, mode }),
      });

      const data = await response.json();
      if (!response.ok) {
        const errorText = data.error ?? "Checkout action failed.";
        setUiPhase("error");
        setNotice({ tone: "error", text: errorText });
        setIsBusy(false);
        return null;
      }

      if (data.quote) {
        setQuote(data.quote);
        setPaymentMode(data.quote.mode);
      }

      if (action === "verify") {
        setUiPhase("confirmed");
        setNotice({ tone: "success", text: data.message ?? data.quote?.statusCopy ?? "Payment verified onchain and invoice marked as paid." });
      } else {
        setUiPhase("idle");
        setNotice({ tone: "info", text: data.message ?? data.quote?.statusCopy ?? "Checkout updated." });
      }

      setIsBusy(false);
      router.refresh();
      return data.quote as PaymentRequest | null;
    } catch (error) {
      setUiPhase("error");
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Unexpected checkout error." });
      setIsBusy(false);
      return null;
    }
  }

  async function tryWalletHandoff() {
    const updatedQuote = await runAction("open-wallet");
    const deepLink = updatedQuote?.deepLink ?? quote?.deepLink;
    if (deepLink) window.location.href = deepLink;
  }

  async function copyShareLink() {
    await navigator.clipboard.writeText(window.location.href);
    setNotice({ tone: "success", text: "Hosted checkout link copied." });
  }

  async function copyWalletLink() {
    if (!quote?.deepLink) return;
    await navigator.clipboard.writeText(quote.deepLink);
    setNotice({ tone: "success", text: "Wallet handoff link copied." });
  }

  async function copyField(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    setNotice({ tone: "success", text: `${label} copied.` });
  }

  const actionButton = (() => {
    if (paymentConfirmed) return { label: "Payment confirmed", onClick: () => undefined, disabled: true };
    if (!quote) {
      return {
        label: `Generate ${paymentMode === "stable" ? `${invoice.paymentRoute.settlementAsset.code} / stable-token` : "native CELO"} request`,
        onClick: () => void runAction("create"),
        disabled: isBusy,
      };
    }

    return {
      label: uiPhase === "verifying" ? "Verifying transaction…" : `Verify ${activeMode === "stable" ? activeSettlementAsset.code : `native ${activeSettlementAsset.code}`} tx hash`,
      onClick: () => void runAction("verify"),
      disabled: isBusy || !trimmedTxHash,
    };
  })();

  return (
    <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <div className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-lg shadow-slate-950/10 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-emerald-200">Shareable Celo Sepolia checkout</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{formatDisplayAmount(invoice.display)}</h2>
            <p className="mt-2 text-sm text-slate-300">Settlement target: {getInvoiceSettlementAmount(invoice, quote)}</p>
          </div>
          <button onClick={copyShareLink} className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">Copy link</button>
        </div>

        <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">
          This checkout keeps invoice display currency, settlement asset, and payment mode separate. The invoice only flips to paid after the submitted transaction hash is verified onchain.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Detail label="Invoice" value={invoice.id} />
          <Detail label="Due date" value={formatDate(invoice.dueDate)} />
          <Detail label="Payment route" value={quote?.routeLabel ?? `${invoice.paymentRoute.providerLabel} / ${invoice.paymentRoute.networkLabel}`} />
          <Detail label="Recipient" value={quote?.recipient ?? invoice.recipientAddress} mono />
        </div>

        <div className={`mt-6 rounded-[1.5rem] border p-5 ${statusPanel.tone === "success" ? "border-emerald-400/30 bg-emerald-400/10" : statusPanel.tone === "error" ? "border-rose-400/30 bg-rose-400/10" : "border-white/10 bg-white/5"}`}>
          <p className={`text-xs uppercase tracking-[0.25em] ${statusPanel.tone === "success" ? "text-emerald-200" : statusPanel.tone === "error" ? "text-rose-200" : "text-sky-200"}`}>{statusPanel.eyebrow}</p>
          <h3 className="mt-3 text-xl font-semibold text-white">{statusPanel.title}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-200">{statusPanel.body}</p>
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-300">
            <span className="rounded-full border border-white/10 px-3 py-1">Network: Celo Sepolia</span>
            <span className="rounded-full border border-white/10 px-3 py-1">Asset: {activeMode === "stable" ? activeSettlementAsset.code : `Native ${activeSettlementAsset.code}`}</span>
            <span className="rounded-full border border-white/10 px-3 py-1">Verification required before paid</span>
          </div>
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-emerald-200">Checkout timeline</p>
          <div className="mt-4 grid gap-3">
            {timeline.map((step, index) => (
              <div
                key={step.key}
                className={`rounded-2xl border p-4 transition ${step.done ? "border-emerald-400/40 bg-emerald-400/10" : step.active ? "border-sky-300/40 bg-sky-400/10" : "border-white/10 bg-white/5"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-300">Step {index + 1}</p>
                    <p className="mt-1 font-medium text-white">{step.label}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{step.detail}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${step.done ? "bg-emerald-300/20 text-emerald-100" : step.active ? "bg-sky-300/20 text-sky-100" : "bg-white/10 text-slate-300"}`}>
                    {step.done ? "Done" : step.active ? "Current" : "Pending"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-5 rounded-[2rem] border border-black/5 bg-white p-5 shadow-sm shadow-black/5 sm:p-6">
        <div className="rounded-[1.5rem] bg-slate-50 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">Included scope</p>
              <p className="mt-2 text-sm leading-7 text-slate-700">{invoice.description}</p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 text-right shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Status</p>
              <p className="mt-1 font-semibold capitalize text-slate-950">{invoice.status}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50/70 p-5 text-sm text-slate-700">
          <p className="font-semibold text-slate-950">Manual-send flow, cleaned up</p>
          <ul className="mt-3 space-y-2 leading-6">
            <li>• Generate the request to lock in recipient, asset, amount, memo, and reference.</li>
            <li>• Send from any compatible wallet. If deep linking fails, the manual details below are enough.</li>
            <li>• Paste the final tx hash from the wallet or explorer so the app can verify it onchain.</li>
            <li>• Only a verified transfer marks the invoice as paid.</li>
          </ul>
        </div>

        <div className="space-y-4 rounded-[1.5rem] border border-violet-100 bg-violet-50/80 p-5 text-sm text-slate-700">
          <div>
            <p className="font-semibold text-slate-950">Checkout actions</p>
            <p className="mt-2 leading-6">
              {quote?.statusCopy ?? "Choose a payment mode, generate the payment request, then either open a wallet handoff or send manually using the exact recipient and amount shown below."}
            </p>
          </div>

          {!quote ? (
            <div className="grid gap-3 rounded-2xl border border-violet-100 bg-white p-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Payment mode</span>
                <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as PaymentMode)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-violet-300">
                  <option value="native">Native CELO</option>
                  <option value="stable">Stable token / {invoice.paymentRoute.settlementAsset.code}</option>
                </select>
              </label>
              <div className="rounded-2xl bg-slate-50 p-4 text-xs leading-6 text-slate-600">
                {paymentMode === "stable"
                  ? `Default for ${invoice.paymentRoute.settlementAsset.code} settlement. If stable-token settlement is unavailable or not configured server-side, checkout safely falls back to native CELO.`
                  : "Best when the payer only has CELO on Celo Sepolia or you want the simplest possible live demo path."}
              </div>
            </div>
          ) : null}

          <button onClick={actionButton.onClick} disabled={actionButton.disabled} className="w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50">
            {isBusy && uiPhase !== "idle" && !paymentConfirmed ? "Updating checkout..." : actionButton.label}
          </button>

          {notice ? <NoticeBanner notice={notice} /> : null}

          {quote ? (
            <div className="space-y-4 rounded-2xl border border-violet-100 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Optional wallet handoff link</label>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Best on mobile or on a machine with a registered wallet app. If nothing opens, just send manually with the exact payment details below.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={copyWalletLink} type="button" className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">Copy wallet link</button>
                  <button onClick={tryWalletHandoff} type="button" disabled={isBusy} className="rounded-full border border-violet-200 bg-violet-100 px-3 py-2 text-xs font-semibold text-violet-900 transition hover:bg-violet-200 disabled:opacity-50">Try wallet handoff</button>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Generated deep link / handoff URL</p>
                <p className="mt-2 break-all font-mono text-xs leading-6 text-slate-700">{quote.deepLink}</p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <InstructionCard
                  step="1"
                  title="Send the exact payment"
                  detail={`Transfer ${quote.amountFormatted} to ${quote.recipientShort} on Celo Sepolia using ${quote.mode === "stable" ? quote.settlementAsset.code : `native ${quote.settlementAsset.code}`}.`}
                />
                <InstructionCard
                  step="2"
                  title="Grab the final tx hash"
                  detail="Copy the confirmed transaction hash from your wallet activity screen or from Blockscout after broadcast."
                />
                <InstructionCard
                  step="3"
                  title="Paste and verify"
                  detail="Submit the tx hash below. Verification checks recipient, network, transaction success, and amount before the invoice flips to paid."
                />
                <InstructionCard
                  step="4"
                  title="Use explorer links if needed"
                  detail="Open the recipient address or the submitted transaction in Blockscout to double-check what was actually sent."
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <CopyableField label="Recipient address" value={quote.recipient} onCopy={() => void copyField(quote.recipient, "Recipient address")} />
                <CopyableField label="Settlement amount" value={quote.amountFormatted} onCopy={() => void copyField(quote.amountFormatted, "Settlement amount")} />
                <CopyableField label="Reference" value={quote.reference} onCopy={() => void copyField(quote.reference, "Reference")} />
                <CopyableField label="Memo" value={quote.memo} onCopy={() => void copyField(quote.memo, "Memo")} />
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Paste submitted tx hash</label>
                <input
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder="0x..."
                  className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 font-mono text-xs text-slate-950 outline-none transition focus:border-violet-300"
                />
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className={`rounded-full px-3 py-1 ${trimmedTxHash ? (txHashLooksValid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700") : "bg-slate-100 text-slate-600"}`}>
                    {trimmedTxHash ? (txHashLooksValid ? "Looks like a valid tx hash" : "Hash format looks incomplete") : "Awaiting tx hash"}
                  </span>
                  {currentTxExplorerUrl ? (
                    <a href={currentTxExplorerUrl} target="_blank" rel="noreferrer" className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700 transition hover:bg-slate-200">
                      Open tx in explorer
                    </a>
                  ) : null}
                  <a href={networkExplorerUrl} target="_blank" rel="noreferrer" className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700 transition hover:bg-slate-200">
                    Open recipient in explorer
                  </a>
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Paste the final broadcast transaction hash, not a wallet-internal reference. If verification fails, compare the tx in Blockscout against the recipient, asset, and amount shown above.
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 rounded-[1.5rem] border border-slate-100 p-5 text-sm text-slate-700">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-semibold text-slate-950">Transaction preview</p>
            <Link href={currentTxExplorerUrl ?? quote?.explorerUrl ?? EXPLORER_BASE_URL} target="_blank" rel="noreferrer" className="text-xs font-semibold text-violet-700 hover:text-violet-900">
              {paymentConfirmed || trimmedTxHash ? "Open current explorer link" : "Open network explorer"}
            </Link>
          </div>
          <PreviewRow label="Invoice currency" value={invoice.display.currency} />
          <PreviewRow label="Invoice amount" value={formatDisplayAmount(invoice.display)} />
          <PreviewRow label="Settlement asset" value={activeSettlementAsset.code} />
          <PreviewRow label="Wallet" value={quote?.wallet ?? "MiniPay-compatible wallet"} />
          <PreviewRow label="Network" value={quote?.network ?? "Celo Sepolia"} />
          <PreviewRow label="Chain ID" value={quote ? String(quote.chainId) : "11142220"} />
          <PreviewRow label="Payment mode" value={activeMode === "stable" ? "Stable token" : "Native CELO"} />
          <PreviewRow label="RPC" value={quote?.rpcUrl ?? "https://forno.celo-sepolia.celo-testnet.org"} mono />
          <PreviewRow label="Token contract" value={activeSettlementAsset.tokenAddress || (activeMode === "stable" ? "Configured server-side or falling back to native CELO" : "Native asset — no token contract")} mono />
          <PreviewRow label="Settlement amount" value={quote?.amountFormatted ?? getInvoiceSettlementAmount(invoice)} />
          <PreviewRow label="Amount (base units)" value={quote?.amountBaseUnits ?? "Generated on request"} mono />
          <PreviewRow label="Fee estimate" value={quote?.feeEstimate ?? "Network fee paid in CELO"} />
          <PreviewRow label="Reference" value={quote?.reference ?? "Generated on request"} mono />
          <PreviewRow label="Memo" value={quote?.memo ?? `${invoice.projectName} • pending reference`} />
          <PreviewRow label="Deep link" value={quote?.deepLink ?? "minipay://pay?..."} mono />
          <PreviewRow label="Explorer" value={currentTxExplorerUrl ?? invoice.paymentVerification?.explorerUrl ?? quote?.explorerUrl ?? "Appears after verification or after a tx hash is pasted"} mono />
          <PreviewRow label="Verified tx" value={invoice.paymentVerification?.txHash ?? (trimmedTxHash || "Paste a transaction hash to verify")} mono />
          <PreviewRow label="ETA" value={quote?.estimatedArrival ?? "Usually within a few Celo Sepolia blocks after broadcast"} />
        </div>

        <div className="rounded-[1.5rem] bg-slate-50 p-5 text-sm text-slate-700">
          <p className="font-semibold text-slate-950">Recent invoice history</p>
          <div className="mt-3 space-y-3">
            {invoice.events.slice(0, 4).map((event) => (
              <div key={event.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-medium text-slate-950">{event.title}</p>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{formatDateTime(event.at)}</p>
                </div>
                <p className="mt-2 leading-6 text-slate-600">{event.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4"><p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p><p className={`mt-2 break-all text-sm text-white ${mono ? "font-mono" : "font-medium"}`}>{value}</p></div>;
}

function PreviewRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0"><p className="text-slate-500">{label}</p><p className={`max-w-[65%] break-all text-right text-slate-950 ${mono ? "font-mono text-xs" : "font-medium"}`}>{value}</p></div>;
}

function InstructionCard({ step, title, detail }: { step: string; title: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Step {step}</p>
      <p className="mt-2 font-semibold text-slate-950">{title}</p>
      <p className="mt-2 text-xs leading-5 text-slate-600">{detail}</p>
    </div>
  );
}

function CopyableField({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
        <button type="button" onClick={onCopy} className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50">
          Copy
        </button>
      </div>
      <p className="mt-2 break-all font-mono text-xs leading-6 text-slate-700">{value}</p>
    </div>
  );
}

function NoticeBanner({ notice }: { notice: Notice }) {
  const styles = notice.tone === "success"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : notice.tone === "error"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : "border-sky-200 bg-sky-50 text-sky-800";

  return <div className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${styles}`}>{notice.text}</div>;
}
