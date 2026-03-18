import { NextResponse } from "next/server";
import { appendInvoiceEvent, getInvoiceById, setInvoicePaymentRequest, setInvoicePaymentVerification, updateInvoiceStatus } from "@/lib/data";
import { getPaymentRailProvider } from "@/lib/payment-provider";
import { resolveInvoicePaymentMode, verifySepoliaPayment } from "@/lib/celo";
import { PaymentMode } from "@/lib/types";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await getInvoiceById(id);

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as { action?: string; sessionId?: string; txHash?: string; mode?: PaymentMode };
  const provider = getPaymentRailProvider();
  const mode = resolveInvoicePaymentMode(invoice, body.mode || invoice.paymentRequest?.mode);

  if (body.action === "create") {
    if (invoice.status === "sent") {
      await updateInvoiceStatus(invoice.id, "viewed", "Client opened the hosted checkout from the shareable payment link.");
    }

    const paymentRequest = provider.createRequest(invoice, body.mode);
    await setInvoicePaymentRequest(invoice.id, paymentRequest);
    await appendInvoiceEvent(invoice.id, {
      type: "payment_request_generated",
      title: "Payment request generated",
      detail: `Celo Sepolia payment request ${paymentRequest.reference} was prepared for ${paymentRequest.mode === "stable" ? paymentRequest.settlementAsset.code : `native ${paymentRequest.settlementAsset.code}`} settlement.`,
    });

    return NextResponse.json({ quote: paymentRequest, message: paymentRequest.statusCopy });
  }

  if (!body.sessionId) {
    return NextResponse.json({ error: "Missing checkout session id." }, { status: 400 });
  }

  if (body.action === "open-wallet") {
    const paymentRequest = provider.openWallet(invoice, body.sessionId, mode);
    await setInvoicePaymentRequest(invoice.id, paymentRequest);
    await appendInvoiceEvent(invoice.id, {
      type: "wallet_opened",
      title: "Wallet handoff opened",
      detail: `The client opened the wallet handoff and can now send ${paymentRequest.mode === "stable" ? paymentRequest.settlementAsset.code : `native ${paymentRequest.settlementAsset.code}`} on Celo Sepolia.`,
    });

    return NextResponse.json({ quote: paymentRequest, message: paymentRequest.statusCopy });
  }

  if (body.action === "verify") {
    const verification = await verifySepoliaPayment(invoice, body.txHash || "", mode);

    if (!verification.ok) {
      await appendInvoiceEvent(invoice.id, {
        type: "payment_verification_failed",
        title: "Payment verification failed",
        detail: verification.reason || "Verification failed.",
      });
      return NextResponse.json({ error: verification.reason || "Verification failed." }, { status: 400 });
    }

    await setInvoicePaymentVerification(invoice.id, {
      txHash: verification.txHash!,
      verifiedAt: verification.paidAt!,
      blockNumber: verification.blockNumber,
      explorerUrl: verification.explorerUrl,
      summary: verification.verificationSummary || "Payment verified onchain.",
    });

    await updateInvoiceStatus(invoice.id, "paid", verification.verificationSummary || `Verified onchain via ${verification.txHash}.`);

    return NextResponse.json({
      quote: invoice.paymentRequest
        ? { ...invoice.paymentRequest, mode, state: "confirmed", txHash: verification.txHash, statusCopy: verification.verificationSummary }
        : null,
      verification,
      message: "Payment verified onchain and invoice marked as paid.",
    });
  }

  return NextResponse.json({ error: "Invalid checkout action." }, { status: 400 });
}
