import { NextResponse } from "next/server";
import { updateInvoiceStatus } from "@/lib/data";
import { PaymentStatus } from "@/lib/types";

const allowed: PaymentStatus[] = ["draft", "sent", "viewed", "paid", "overdue"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  if (!allowed.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const invoice = await updateInvoiceStatus(id, body.status);
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  return NextResponse.json({
    invoice,
    message: `Invoice marked as ${body.status}.`,
  });
}
