export type PaymentStatus = "draft" | "sent" | "viewed" | "paid" | "overdue";

export interface Invoice {
  id: string;
  clientName: string;
  clientEmail: string;
  projectName: string;
  description: string;
  amount: number;
  currency: string;
  dueDate: string;
  issuedAt: string;
  paymentAddress: string;
  paymentRail: string;
  status: PaymentStatus;
  reminderCount: number;
  lastReminderAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceInput {
  clientName: string;
  clientEmail: string;
  projectName: string;
  description: string;
  amount: number;
  currency?: string;
  dueDate: string;
  paymentRail?: string;
}

export interface EarningsSummary {
  totalInvoiced: number;
  totalPaid: number;
  outstanding: number;
  overdue: number;
  draftCount: number;
  paidCount: number;
}

export type MockCheckoutState = "quote_ready" | "wallet_opened" | "submitted" | "confirmed";

export interface MockPaymentQuote {
  invoiceId: string;
  sessionId: string;
  state: MockCheckoutState;
  wallet: string;
  rail: string;
  network: string;
  token: string;
  amount: number;
  amountFormatted: string;
  recipient: string;
  feeEstimate: string;
  reference: string;
  memo: string;
  expiresAt: string;
  deepLink: string;
  checkoutUrl: string;
  estimatedArrival: string;
  txHash?: string;
  statusCopy: string;
}

export interface PaymentRailProvider {
  key: string;
  label: string;
  createQuote(invoice: Invoice): MockPaymentQuote;
  openWallet(invoice: Invoice, sessionId: string): MockPaymentQuote;
  submitPayment(invoice: Invoice, sessionId: string): MockPaymentQuote;
  confirmPayment(invoice: Invoice, sessionId: string): MockPaymentQuote;
}
