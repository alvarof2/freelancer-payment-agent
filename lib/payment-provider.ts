import { buildPaymentRequest } from "@/lib/celo";
import { Invoice, PaymentMode, PaymentRailProvider, PaymentRequest } from "@/lib/types";

function withState(request: PaymentRequest, state: PaymentRequest["state"], statusCopy: string): PaymentRequest {
  return {
    ...request,
    state,
    statusCopy,
  };
}

const celoSepoliaProvider: PaymentRailProvider = {
  key: "minipay-celo-sepolia",
  label: "Celo Checkout on Celo Sepolia",
  createRequest(invoice: Invoice, mode?: PaymentMode) {
    return buildPaymentRequest(invoice, mode);
  },
  openWallet(invoice: Invoice, sessionId: string, mode?: PaymentMode) {
    const request = invoice.paymentRequest && invoice.paymentRequest.sessionId === sessionId
      ? invoice.paymentRequest
      : buildPaymentRequest(invoice, mode);

    return withState(
      request,
      "wallet_opened",
      `Wallet handoff opened for ${request.mode === "stable" ? request.settlementAsset.code : `native ${request.settlementAsset.code}`}. After sending onchain, paste the transaction hash below so the app can verify settlement on Celo Sepolia.`,
    );
  },
};

export function getPaymentRailProvider() {
  return celoSepoliaProvider;
}
