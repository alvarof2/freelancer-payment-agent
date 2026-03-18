import Link from "next/link";
import { notFound } from "next/navigation";
import { ClientPaymentCard } from "@/components/client-payment-card";
import { getInvoiceById } from "@/lib/data";

export default async function ClientPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await getInvoiceById(id);

  if (!invoice) notFound();

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-emerald-600">Shareable Celo Sepolia checkout</p>
          <h1 className="text-3xl font-semibold tracking-tight">Real USDC / CELO payment flow with manual send + onchain verification</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Generate the real payment request, optionally hand off to a wallet, then verify the submitted tx hash on Celo Sepolia before this invoice flips to paid.
          </p>
        </div>
        <Link href={`/invoices/${invoice.id}`} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          Back to invoice detail
        </Link>
      </div>

      <ClientPaymentCard invoice={invoice} />
    </main>
  );
}
