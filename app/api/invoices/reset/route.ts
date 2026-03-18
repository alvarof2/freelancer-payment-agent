import { NextResponse } from "next/server";
import { resetDemoData } from "@/lib/data";

export async function POST() {
  const invoices = await resetDemoData();

  return NextResponse.json({
    invoices,
    message: "Seeded demo data restored. You are ready for another judge walkthrough.",
  });
}
