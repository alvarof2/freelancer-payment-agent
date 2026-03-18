import { NextResponse } from "next/server";
import { reconcileTestWebhook } from "@/lib/reconciliation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await reconcileTestWebhook(body);
  return NextResponse.json(result, { status: result.status });
}
