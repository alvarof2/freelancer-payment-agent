import { appendInvoiceEvent, createWebhookEvent, getInvoiceByPaymentReference, getInvoices, recordReconciliationAttempt, setInvoicePaymentVerification, updateInvoiceStatus, updateWebhookEventStatus } from "@/lib/data";
import { findSepoliaPaymentCandidates, resolveInvoicePaymentMode, verifySepoliaPayment } from "@/lib/celo";
import { PaymentMode } from "@/lib/types";

export interface TestWebhookPayload {
  eventId?: string;
  eventType?: string;
  reference?: string;
  txHash?: string;
  mode?: PaymentMode;
  providerKey?: string;
}

export async function reconcileTestWebhook(payload: TestWebhookPayload) {
  const webhookEvent = await createWebhookEvent({
    providerKey: payload.providerKey ?? "test-webhook",
    externalEventId: payload.eventId,
    eventType: payload.eventType ?? "payment_detected",
    payload,
    signatureValid: true,
  });

  const reference = payload.reference?.trim();
  if (!reference) {
    await recordReconciliationAttempt({
      webhookEventId: webhookEvent.id,
      txHash: payload.txHash,
      outcome: "not_found",
      summary: "Webhook payload did not include a payment reference.",
    });
    await updateWebhookEventStatus(webhookEvent.id, "failed", "Missing payment reference.");
    return { ok: false, status: 400, error: "Missing payment reference." };
  }

  const invoice = await getInvoiceByPaymentReference(reference);
  if (!invoice) {
    await recordReconciliationAttempt({
      webhookEventId: webhookEvent.id,
      txHash: payload.txHash,
      reference,
      outcome: "not_found",
      summary: `No invoice matched payment reference ${reference}.`,
    });
    await updateWebhookEventStatus(webhookEvent.id, "ignored", `No invoice matched payment reference ${reference}.`);
    return { ok: false, status: 404, error: `No invoice matched payment reference ${reference}.` };
  }

  if (invoice.status === "paid") {
    await recordReconciliationAttempt({
      invoiceId: invoice.id,
      webhookEventId: webhookEvent.id,
      txHash: payload.txHash,
      reference,
      outcome: "already_paid",
      summary: `Invoice ${invoice.id} was already marked as paid.`,
    });
    await updateWebhookEventStatus(webhookEvent.id, "ignored", `Invoice ${invoice.id} already paid.`);
    return { ok: true, status: 200, invoice, message: `Invoice ${invoice.id} already paid.` };
  }

  const mode = resolveInvoicePaymentMode(invoice, payload.mode || invoice.paymentRequest?.mode);
  const verification = await verifySepoliaPayment(invoice, payload.txHash || "", mode);

  if (!verification.ok) {
    await appendInvoiceEvent(invoice.id, {
      type: "payment_verification_failed",
      title: "Webhook verification failed",
      detail: verification.reason || "Webhook-triggered verification failed.",
    });
    await recordReconciliationAttempt({
      invoiceId: invoice.id,
      webhookEventId: webhookEvent.id,
      txHash: payload.txHash,
      reference,
      outcome: "verification_failed",
      summary: verification.reason || "Webhook-triggered verification failed.",
    });
    await updateWebhookEventStatus(webhookEvent.id, "failed", verification.reason || "Verification failed.");
    return { ok: false, status: 400, error: verification.reason || "Verification failed." };
  }

  await setInvoicePaymentVerification(invoice.id, {
    txHash: verification.txHash!,
    verifiedAt: verification.paidAt!,
    blockNumber: verification.blockNumber,
    explorerUrl: verification.explorerUrl,
    summary: verification.verificationSummary || "Payment verified onchain.",
  });

  await updateInvoiceStatus(invoice.id, "paid", verification.verificationSummary || `Verified onchain via ${verification.txHash}.`);
  await recordReconciliationAttempt({
    invoiceId: invoice.id,
    webhookEventId: webhookEvent.id,
    txHash: verification.txHash,
    reference,
    outcome: "processed",
    summary: `Webhook reconciled and invoice ${invoice.id} marked paid.`,
  });
  await updateWebhookEventStatus(webhookEvent.id, "processed");

  return {
    ok: true,
    status: 200,
    message: `Webhook reconciled and invoice ${invoice.id} marked paid.`,
    invoiceId: invoice.id,
    verification,
  };
}

export async function pollSepoliaPayments(input?: { lookbackBlocks?: number }) {
  const invoices = await getInvoices();
  const pendingInvoices = invoices.filter((invoice) => invoice.status !== "paid" && invoice.paymentRequest);
  const lookbackBlocks = input?.lookbackBlocks ?? 120;
  const results: Array<{ invoiceId: string; txHash?: string; status: string; detail: string }> = [];

  for (const invoice of pendingInvoices) {
    const mode = resolveInvoicePaymentMode(invoice, invoice.paymentRequest?.mode);
    const candidates = await findSepoliaPaymentCandidates(invoice, mode, lookbackBlocks);

    if (candidates.length === 0) {
      results.push({ invoiceId: invoice.id, status: "no_match", detail: `No candidate transactions found in the last ${lookbackBlocks} blocks.` });
      continue;
    }

    let matched = false;
    for (const candidate of candidates) {
      if (invoice.paymentVerification?.txHash === candidate.txHash) continue;
      const verification = await verifySepoliaPayment(invoice, candidate.txHash, candidate.mode);
      if (!verification.ok) {
        await recordReconciliationAttempt({
          invoiceId: invoice.id,
          txHash: candidate.txHash,
          reference: invoice.paymentRequest?.reference,
          outcome: "verification_failed",
          summary: verification.reason || `Candidate ${candidate.txHash} failed verification.`,
        });
        continue;
      }

      await appendInvoiceEvent(invoice.id, {
        type: "payment_submitted",
        title: "Payment detected automatically",
        detail: `Detected candidate ${candidate.txHash} on Celo Sepolia via ${candidate.source}.`,
      });
      await setInvoicePaymentVerification(invoice.id, {
        txHash: verification.txHash!,
        verifiedAt: verification.paidAt!,
        blockNumber: verification.blockNumber,
        explorerUrl: verification.explorerUrl,
        summary: verification.verificationSummary || "Payment verified onchain.",
      });
      await updateInvoiceStatus(invoice.id, "paid", verification.verificationSummary || `Verified onchain via ${verification.txHash}.`);
      await recordReconciliationAttempt({
        invoiceId: invoice.id,
        txHash: verification.txHash,
        reference: invoice.paymentRequest?.reference,
        outcome: "processed",
        summary: `Polling reconciled invoice ${invoice.id} and marked it paid.`,
      });
      results.push({ invoiceId: invoice.id, txHash: verification.txHash, status: "paid", detail: `Matched via ${candidate.source}.` });
      matched = true;
      break;
    }

    if (!matched) {
      results.push({ invoiceId: invoice.id, status: "candidates_found_no_match", detail: `Found ${candidates.length} candidate transaction(s), but none verified.` });
    }
  }

  return {
    ok: true,
    status: 200,
    scannedInvoices: pendingInvoices.length,
    paidInvoices: results.filter((item) => item.status === "paid").length,
    results,
  };
}
