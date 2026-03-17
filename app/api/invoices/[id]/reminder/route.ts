import { NextResponse } from "next/server";
import { sendReminder } from "@/lib/data";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await sendReminder(id);

  if (!result) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  return NextResponse.json(result);
}
