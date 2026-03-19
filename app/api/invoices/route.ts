import { NextResponse } from "next/server";
import { createInvoice, getInvoices } from "@/lib/data";

const EVM_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

export async function GET() {
  const invoices = await getInvoices();
  return NextResponse.json({ invoices });
}

export async function POST(request: Request) {
  const body = await request.json();
  const recipientAddress = typeof body.recipientAddress === "string" ? body.recipientAddress.trim() : "";

  if (!body.clientName || !body.projectName || !body.description || !body.amount || !body.dueDate) {
    return NextResponse.json({ error: "Missing required invoice fields." }, { status: 400 });
  }

  if (!recipientAddress) {
    return NextResponse.json({ error: "Recipient wallet address is required." }, { status: 400 });
  }

  if (!EVM_ADDRESS_PATTERN.test(recipientAddress)) {
    return NextResponse.json({ error: "Enter a valid 0x-prefixed wallet address." }, { status: 400 });
  }

  const invoice = await createInvoice({
    ...body,
    recipientAddress,
    clientEmail: body.clientEmail ?? "",
  });

  return NextResponse.json({ invoice }, { status: 201 });
}
