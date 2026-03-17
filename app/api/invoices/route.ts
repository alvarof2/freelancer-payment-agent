import { NextResponse } from "next/server";
import { createInvoice, getInvoices } from "@/lib/data";

export async function GET() {
  const invoices = await getInvoices();
  return NextResponse.json({ invoices });
}

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.clientName || !body.projectName || !body.description || !body.amount || !body.dueDate) {
    return NextResponse.json({ error: "Missing required invoice fields." }, { status: 400 });
  }

  const invoice = await createInvoice({
    ...body,
    clientEmail: body.clientEmail ?? "",
  });

  return NextResponse.json({ invoice }, { status: 201 });
}
