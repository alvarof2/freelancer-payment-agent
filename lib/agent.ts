import { formatAssetBreakdown, formatDisplayAmount } from "@/lib/format";
import { AssetAmount, EarningsSummary, Invoice } from "@/lib/types";

const DAY_MS = 1000 * 60 * 60 * 24;

export interface InvoiceAgentInsight {
  invoiceId: string;
  urgency: "low" | "medium" | "high";
  followUpNow: boolean;
  followUpReason: string;
  suggestedNextAction: string;
  suggestedNextActionDetail: string;
  reminderSubject: string;
  reminderMessage: string;
}

export interface WeeklyFinanceSummary {
  periodLabel: string;
  expectedThisWeek: number;
  overdueAmount: number;
  paidThisWeekEstimate: number;
  expectedThisWeekByAsset: AssetAmount[];
  overdueByAsset: AssetAmount[];
  paidByAsset: AssetAmount[];
  followUpNowCount: number;
  topPriorityIds: string[];
  assistantHeadline: string;
  assistantSummary: string;
}

function startOfDay(value: string | Date) {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function diffInDays(from: string | Date, to: string | Date) {
  return Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS);
}

function getReminderTone(invoice: Invoice, daysUntilDue: number) {
  if (invoice.status === "overdue") return "firm";
  if (daysUntilDue <= 1 || invoice.reminderCount >= 2) return "direct";
  return "friendly";
}

export function getInvoiceAgentInsight(invoice: Invoice): InvoiceAgentInsight {
  const today = new Date();
  const daysUntilDue = diffInDays(today, invoice.dueDate);
  const daysSinceReminder = invoice.lastReminderAt ? diffInDays(invoice.lastReminderAt, today) : null;
  const amount = formatDisplayAmount(invoice.display);

  let urgency: InvoiceAgentInsight["urgency"] = "low";
  let followUpNow = false;
  let followUpReason = "No immediate follow-up needed.";
  let suggestedNextAction = "Keep monitoring";
  let suggestedNextActionDetail = "Client engagement looks healthy. Keep the hosted checkout ready and revisit after the due date changes.";

  if (invoice.status === "paid") {
    followUpReason = "Invoice already settled.";
    suggestedNextAction = "Archive as paid";
    suggestedNextActionDetail = "Use this as proof that the MiniPay/Celo settlement loop closes cleanly in the demo.";
  } else if (invoice.status === "overdue") {
    urgency = "high";
    followUpNow = true;
    followUpReason = `${invoice.clientName} is overdue by ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? "" : "s"}.`;
    suggestedNextAction = "Send a firm follow-up now";
    suggestedNextActionDetail = "Share the checkout link again, ask for a payment date, and offer to walk the client through the MiniPay handoff live.";
  } else if (invoice.status === "viewed" && daysUntilDue <= 2) {
    urgency = "high";
    followUpNow = true;
    followUpReason = `Client viewed the invoice and it is due ${daysUntilDue <= 0 ? "now" : `in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}`}.`;
    suggestedNextAction = "Nudge for checkout completion";
    suggestedNextActionDetail = "The client has already engaged. Prompt them to open MiniPay and finish the configured settlement flow while the invoice is top of mind.";
  } else if (invoice.status === "sent" && daysUntilDue <= 3) {
    urgency = "medium";
    followUpNow = true;
    followUpReason = "Invoice is due soon and has not been acknowledged yet.";
    suggestedNextAction = "Prompt the client to review the invoice";
    suggestedNextActionDetail = "Send the reminder plus the hosted checkout link so the client can move directly from review to payment.";
  } else if (invoice.status === "viewed") {
    urgency = "medium";
    followUpReason = "Client has seen the invoice but has not paid yet.";
    suggestedNextAction = "Prepare a checkout-oriented reminder";
    suggestedNextActionDetail = "Mention that the payment request is already configured for MiniPay on Celo and can be completed in one flow.";
  } else if (invoice.status === "sent") {
    followUpReason = "Recently sent invoice still within a healthy follow-up window.";
    suggestedNextAction = "Wait, then send a gentle reminder";
    suggestedNextActionDetail = "Give it a little room unless you need to accelerate the demo narrative.";
  }

  if (!followUpNow && daysSinceReminder !== null && daysSinceReminder >= 5 && invoice.status !== "paid") {
    urgency = urgency === "low" ? "medium" : urgency;
    followUpNow = true;
    followUpReason = `Last reminder went out ${daysSinceReminder} days ago.`;
    suggestedNextAction = "Refresh the follow-up";
    suggestedNextActionDetail = "Use a short message with the checkout link and a single clear ask for payment timing.";
  }

  const tone = getReminderTone(invoice, daysUntilDue);
  const opener =
    tone === "firm"
      ? `Hi ${invoice.clientName}, following up on invoice ${invoice.id} for ${amount}.`
      : tone === "direct"
        ? `Hi ${invoice.clientName}, a quick reminder about invoice ${invoice.id} for ${amount}.`
        : `Hi ${invoice.clientName}, hope you are well — sharing a quick reminder for invoice ${invoice.id} (${amount}).`;

  const dueLine =
    invoice.status === "overdue"
      ? "It is now overdue, and the hosted MiniPay checkout is still ready to use."
      : daysUntilDue <= 0
        ? "It is due today, and the hosted MiniPay checkout is ready whenever you are."
        : `It is due ${daysUntilDue === 1 ? "tomorrow" : `in ${daysUntilDue} days`}, and the hosted MiniPay checkout is ready whenever you want to complete it.`;

  const closeLine =
    tone === "firm"
      ? "Please confirm the payment timing today, or let me know if anything is blocking approval."
      : tone === "direct"
        ? "Let me know if you want me to resend the payment link or adjust anything before you pay."
        : "Happy to resend the checkout link or answer any approval questions if useful.";

  return {
    invoiceId: invoice.id,
    urgency,
    followUpNow,
    followUpReason,
    suggestedNextAction,
    suggestedNextActionDetail,
    reminderSubject: `Payment reminder · ${invoice.projectName} · ${amount}`,
    reminderMessage: `${opener}\n\n${dueLine}\n\n${closeLine}`,
  };
}

export function getWeeklyFinanceSummary(invoices: Invoice[], summary: EarningsSummary): WeeklyFinanceSummary {
  const today = new Date();
  const sevenDaysFromNow = new Date(Date.now() + DAY_MS * 7);

  const dueThisWeek = invoices.filter((invoice) => invoice.status !== "paid" && new Date(invoice.dueDate) <= sevenDaysFromNow);
  const expectedThisWeek = dueThisWeek.reduce((total, invoice) => total + invoice.display.amount, 0);
  const expectedThisWeekByAssetMap = new Map<string, number>();
  for (const invoice of dueThisWeek) {
    const asset = invoice.paymentRequest?.settlementAsset.code || invoice.paymentRoute.settlementAsset.code;
    expectedThisWeekByAssetMap.set(asset, (expectedThisWeekByAssetMap.get(asset) ?? 0) + invoice.display.amount);
  }
  const expectedThisWeekByAsset = [...expectedThisWeekByAssetMap.entries()].map(([asset, amount]) => ({ asset, amount })).sort((a, b) => a.asset.localeCompare(b.asset));
  const overdueAmount = invoices.filter((invoice) => invoice.status === "overdue").reduce((total, invoice) => total + invoice.display.amount, 0);
  const followUpInsights = invoices.map(getInvoiceAgentInsight).filter((insight) => insight.followUpNow);
  const topPriorityIds = followUpInsights.slice(0, 3).map((insight) => insight.invoiceId);

  const assistantHeadline =
    summary.overdueByAsset.length > 0
      ? `Recover ${formatAssetBreakdown(summary.overdueByAsset)} in overdue cash first.`
      : dueThisWeek.length > 0
        ? `${formatAssetBreakdown(summary.outstandingByAsset)} is currently in play.`
        : "No urgent receivables in the next 7 days.";

  const assistantSummary =
    summary.overdueByAsset.length > 0
      ? `Prioritize overdue invoices, then move to viewed invoices that are close to their due dates. ${followUpInsights.length} invoice${followUpInsights.length === 1 ? " needs" : "s need"} a follow-up now.`
      : `Outstanding pipeline sits at ${formatAssetBreakdown(summary.outstandingByAsset)}. ${followUpInsights.length === 0 ? "Nothing needs an immediate chase." : `${followUpInsights.length} invoice${followUpInsights.length === 1 ? " needs" : "s need"} a timely nudge now.`}`;

  return {
    periodLabel: `${today.toLocaleDateString("en", { month: "short", day: "numeric" })} → ${sevenDaysFromNow.toLocaleDateString("en", { month: "short", day: "numeric" })}`,
    expectedThisWeek,
    overdueAmount,
    paidThisWeekEstimate: summary.totalPaid,
    expectedThisWeekByAsset,
    overdueByAsset: summary.overdueByAsset,
    paidByAsset: summary.totalPaidByAsset,
    followUpNowCount: followUpInsights.length,
    topPriorityIds,
    assistantHeadline,
    assistantSummary,
  };
}
