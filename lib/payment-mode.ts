import { Invoice, PaymentMode, PaymentRoute, SettlementAsset } from "@/lib/types";

function normalizeCode(code?: string) {
  return (code ?? "").toUpperCase();
}

export function assetImpliesStableMode(asset?: Pick<SettlementAsset, "code"> | null) {
  const code = normalizeCode(asset?.code);
  return code === "USDC" || code === "CUSD";
}

export function assetImpliesNativeMode(asset?: Pick<SettlementAsset, "code"> | null) {
  return normalizeCode(asset?.code) === "CELO";
}

export function routeSupportsMode(route: Pick<PaymentRoute, "supportsModes"> | undefined, mode: PaymentMode) {
  return route?.supportsModes?.includes(mode) ?? true;
}

export function inferInvoicePaymentMode(invoice: Pick<Invoice, "paymentRequest" | "paymentRoute">, stableTokenConfigured: boolean): PaymentMode {
  if (invoice.paymentRequest?.mode === "stable") {
    return stableTokenConfigured && routeSupportsMode(invoice.paymentRoute, "stable") ? "stable" : "native";
  }

  if (invoice.paymentRequest?.mode === "native") {
    return "native";
  }

  if (assetImpliesNativeMode(invoice.paymentRoute.settlementAsset)) {
    return "native";
  }

  if (assetImpliesStableMode(invoice.paymentRoute.settlementAsset)) {
    return stableTokenConfigured && routeSupportsMode(invoice.paymentRoute, "stable") ? "stable" : "native";
  }

  return stableTokenConfigured && routeSupportsMode(invoice.paymentRoute, "stable") ? "stable" : "native";
}
