import { NextResponse } from "next/server";
import { getInvoiceById, updateInvoiceStatus } from "@/lib/data";
import { getPaymentRailProvider } from "@/lib/payment-provider";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const invoice = await getInvoiceById(id);

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as { action?: string; sessionId?: string };
  const provider = getPaymentRailProvider(invoice.paymentRail);

  if (body.action === "create") {
    if (invoice.status === "sent") {
      await updateInvoiceStatus(invoice.id, "viewed");
    }

    return NextResponse.json({
      quote: provider.createQuote(invoice),
      message: "MiniPay checkout generated.",
    });
  }

  if (!body.sessionId) {
    return NextResponse.json({ error: "Missing checkout session id." }, { status: 400 });
  }

  if (body.action === "open-wallet") {
    return NextResponse.json({
      quote: provider.openWallet(invoice, body.sessionId),
      message: "MiniPay deep link opened in demo mode.",
    });
  }

  if (body.action === "submit") {
    return NextResponse.json({
      quote: provider.submitPayment(invoice, body.sessionId),
      message: "Mock transaction submitted.",
    });
  }

  if (body.action === "confirm") {
    await updateInvoiceStatus(invoice.id, "paid");

    return NextResponse.json({
      quote: provider.confirmPayment(invoice, body.sessionId),
      message: "Mock payment confirmed and invoice marked as paid.",
    });
  }

  return NextResponse.json({ error: "Invalid checkout action." }, { status: 400 });
}
