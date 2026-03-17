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
}

export interface EarningsSummary {
  totalInvoiced: number;
  totalPaid: number;
  outstanding: number;
  overdue: number;
  draftCount: number;
  paidCount: number;
}
