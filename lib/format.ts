import { AssetAmount, Invoice, InvoiceDisplayAmount, PaymentRequest, SettlementAsset } from "@/lib/types";

export function formatMoney(amount: number, currency = "cUSD") {
  const upper = currency.toUpperCase();

  if (upper === "USDC" || upper === "CUSD") {
    return `${new Intl.NumberFormat("en-US", {
      minimumFractionDigits: amount < 1 ? 2 : 0,
      maximumFractionDigits: amount < 1 ? 4 : 2,
    }).format(amount)} ${upper}`;
  }

  if (upper === "CELO") {
    return `${new Intl.NumberFormat("en-US", {
      minimumFractionDigits: amount < 1 ? 1 : 0,
      maximumFractionDigits: amount < 1 ? 4 : 2,
    }).format(amount)} CELO`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: upper,
    maximumFractionDigits: amount < 1 ? 2 : 0,
  }).format(amount);
}

export function formatDisplayAmount(display: InvoiceDisplayAmount) {
  return formatMoney(display.amount, display.currency);
}

export function formatSettlementAmount(amount: number, settlementAssetOrCode: SettlementAsset | string) {
  const code = typeof settlementAssetOrCode === "string" ? settlementAssetOrCode : settlementAssetOrCode.code;
  return formatMoney(amount, code);
}

export function formatAssetBreakdown(items: AssetAmount[]) {
  if (!items.length) return "—";
  return items.map((item) => formatMoney(item.amount, item.asset)).join(" • ");
}

export function getInvoiceDisplayAmount(invoice: Invoice) {
  return formatDisplayAmount(invoice.display);
}

export function getInvoiceSettlementAmount(invoice: Invoice, paymentRequest?: PaymentRequest | null) {
  const asset = paymentRequest?.settlementAsset ?? invoice.paymentRoute.settlementAsset;
  return formatSettlementAmount(invoice.display.amount, asset);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
