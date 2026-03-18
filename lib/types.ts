export type PaymentStatus = "draft" | "sent" | "viewed" | "paid" | "overdue";
export type PaymentMode = "stable" | "native";
export type SettlementAssetCode = "CELO" | "USDC" | "cUSD";
export type PaymentNetworkKey = "celo-sepolia";
export type PaymentProviderKey = "minipay-celo-sepolia";

export type InvoiceEventType =
  | "created"
  | "share_link_ready"
  | "client_viewed"
  | "reminder_generated"
  | "payment_request_generated"
  | "wallet_opened"
  | "payment_submitted"
  | "payment_confirmed"
  | "payment_verification_failed"
  | "status_changed"
  | "demo_reset";

export interface InvoiceEvent {
  id: string;
  type: InvoiceEventType;
  title: string;
  detail: string;
  at: string;
}

export interface InvoiceDisplayAmount {
  amount: number;
  currency: string;
}

export interface SettlementAsset {
  code: string;
  kind: "native" | "token";
  decimals: number;
  tokenAddress?: string;
}

export interface PaymentRoute {
  providerKey: PaymentProviderKey;
  providerLabel: string;
  networkKey: PaymentNetworkKey;
  networkLabel: string;
  settlementAsset: SettlementAsset;
  supportsModes: PaymentMode[];
}

export interface PaymentRequest {
  invoiceId: string;
  sessionId: string;
  mode: PaymentMode;
  state: "quote_ready" | "wallet_opened" | "verifying" | "confirmed";
  wallet: string;
  routeLabel: string;
  network: string;
  networkKey: PaymentNetworkKey;
  chainId: number;
  rpcUrl: string;
  settlementAsset: SettlementAsset;
  amount: number;
  amountFormatted: string;
  amountBaseUnits: string;
  recipient: string;
  recipientShort: string;
  feeEstimate: string;
  reference: string;
  memo: string;
  expiresAt: string;
  deepLink: string;
  checkoutUrl: string;
  estimatedArrival: string;
  explorerUrl: string;
  txHash?: string;
  statusCopy: string;
}

export interface PaymentVerification {
  txHash: string;
  verifiedAt: string;
  blockNumber?: number;
  explorerUrl?: string;
  summary: string;
}

export interface Invoice {
  id: string;
  clientName: string;
  clientEmail: string;
  projectName: string;
  description: string;
  display: InvoiceDisplayAmount;
  dueDate: string;
  issuedAt: string;
  recipientAddress: string;
  paymentRoute: PaymentRoute;
  status: PaymentStatus;
  reminderCount: number;
  lastReminderAt?: string;
  createdAt: string;
  updatedAt: string;
  paymentRequest?: PaymentRequest;
  paymentVerification?: PaymentVerification;
  events: InvoiceEvent[];
}

export interface InvoiceInput {
  clientName: string;
  clientEmail: string;
  projectName: string;
  description: string;
  amount: number;
  displayCurrency?: string;
  dueDate: string;
  paymentMode?: PaymentMode;
  settlementAssetCode?: string;
  paymentNetworkKey?: PaymentNetworkKey;
  recipientAddress?: string;
}

export interface AssetAmount {
  asset: string;
  amount: number;
}

export interface EarningsSummary {
  totalInvoiced: number;
  totalPaid: number;
  outstanding: number;
  overdue: number;
  draftCount: number;
  paidCount: number;
  totalInvoicedByAsset: AssetAmount[];
  totalPaidByAsset: AssetAmount[];
  outstandingByAsset: AssetAmount[];
  overdueByAsset: AssetAmount[];
}

export interface ReminderDraft {
  subject: string;
  body: string;
}

export interface PaymentVerificationResult {
  ok: boolean;
  reason?: string;
  txHash?: string;
  paidAt?: string;
  blockNumber?: number;
  explorerUrl?: string;
  verificationSummary?: string;
}

export interface PaymentRailProvider {
  key: string;
  label: string;
  createRequest(invoice: Invoice, mode?: PaymentMode): PaymentRequest;
  openWallet(invoice: Invoice, sessionId: string, mode?: PaymentMode): PaymentRequest;
}
