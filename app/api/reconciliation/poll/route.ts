import { NextResponse } from "next/server";
import { pollSepoliaPayments } from "@/lib/reconciliation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { lookbackBlocks?: number };
  const result = await pollSepoliaPayments({ lookbackBlocks: body.lookbackBlocks });
  return NextResponse.json(result, { status: result.status });
}
