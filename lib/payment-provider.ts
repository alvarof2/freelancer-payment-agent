import { createHash } from "node:crypto";
import { formatMoney } from "@/lib/format";
import { Invoice, MockCheckoutState, MockPaymentQuote, PaymentRailProvider } from "@/lib/types";

function buildReference(invoice: Invoice) {
  return `mini-${invoice.id.slice(-6)}-${invoice.clientName.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 6)}`;
}

function hash(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

function buildTxHash(invoice: Invoice, sessionId: string, state: MockCheckoutState) {
  return `0x${hash(`${invoice.id}:${sessionId}:${state}`).slice(0, 64)}`;
}

function buildQuote(invoice: Invoice, sessionId: string, state: MockCheckoutState): MockPaymentQuote {
  const reference = buildReference(invoice);
  const token = invoice.currency === "USDC" ? "cUSD" : invoice.currency;
  const amountFormatted = formatMoney(invoice.amount, "USDC");
  const memo = `${invoice.projectName} • ${reference}`;
  const txHash = state === "submitted" || state === "confirmed" ? buildTxHash(invoice, sessionId, state) : undefined;

  const stateCopy: Record<MockCheckoutState, string> = {
    quote_ready: "MiniPay quote generated. The client can review the Celo payment request before opening their wallet.",
    wallet_opened: "MiniPay opened with the payment request loaded. The client sees amount, recipient, and reference before signing.",
    submitted: "Mock transaction submitted to the Celo mempool. Waiting for confirmation.",
    confirmed: "Mock Celo transfer confirmed. Funds are shown as settled in the freelancer dashboard.",
  };

  return {
    invoiceId: invoice.id,
    sessionId,
    state,
    wallet: "MiniPay",
    rail: "MiniPay / Celo",
    network: "Celo Mainnet",
    token,
    amount: invoice.amount,
    amountFormatted,
    recipient: invoice.paymentAddress,
    feeEstimate: "~0.0008 CELO",
    reference,
    memo,
    expiresAt: new Date(Date.now() + 1000 * 60 * 15).toISOString(),
    deepLink: `minipay://pay?address=${encodeURIComponent(invoice.paymentAddress)}&amount=${invoice.amount}&token=${token}&reference=${reference}`,
    checkoutUrl: `https://demo.minipay.local/checkout/${sessionId}`,
    estimatedArrival: "~5 seconds after confirmation in demo mode",
    txHash,
    statusCopy: stateCopy[state],
  };
}

const miniPayMockProvider: PaymentRailProvider = {
  key: "minipay-celo-mock",
  label: "MiniPay on Celo (mock)",
  createQuote(invoice) {
    const sessionId = `mp_${hash(`${invoice.id}:quote:${Date.now()}`).slice(0, 12)}`;
    return buildQuote(invoice, sessionId, "quote_ready");
  },
  openWallet(invoice, sessionId) {
    return buildQuote(invoice, sessionId, "wallet_opened");
  },
  submitPayment(invoice, sessionId) {
    return buildQuote(invoice, sessionId, "submitted");
  },
  confirmPayment(invoice, sessionId) {
    return buildQuote(invoice, sessionId, "confirmed");
  },
};

export function getPaymentRailProvider(paymentRail?: string) {
  if (paymentRail?.toLowerCase().includes("celo") || paymentRail?.toLowerCase().includes("minipay")) {
    return miniPayMockProvider;
  }

  return miniPayMockProvider;
}
