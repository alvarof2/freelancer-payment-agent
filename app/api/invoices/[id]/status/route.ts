import { NextResponse } from "next/server";
import { updateInvoiceStatus } from "@/lib/data";
import { PaymentStatus } from "@/lib/types";

const allowed: PaymentStatus[] = ["draft", "sent", "viewed", "paid", "overdue"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as { status?: PaymentStatus };

  if (!body.status || !allowed.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const detailMap: Partial<Record<PaymentStatus, string>> = {
    viewed: "Client reviewed the invoice and opened the shareable payment experience.",
    overdue: "Invoice was pushed into overdue mode for the live demo storyline.",
    paid: "Invoice was manually marked paid from the control panel.",
    sent: "Invoice was returned to sent state.",
    draft: "Invoice was returned to draft state.",
  };

  const invoice = await updateInvoiceStatus(id, body.status, detailMap[body.status]);
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  return NextResponse.json({
    invoice,
    message: `Invoice marked as ${body.status}.`,
  });
}
