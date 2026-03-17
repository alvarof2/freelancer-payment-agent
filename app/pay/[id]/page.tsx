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
          <p className="text-sm font-medium text-emerald-600">Shareable MiniPay checkout</p>
          <h1 className="text-3xl font-semibold tracking-tight">Client payment page with a mocked Celo flow</h1>
          <p className="mt-2 text-sm text-slate-500">Hosted-checkout style UX for demoing MiniPay handoff, transaction preview, and settlement without touching a live chain.</p>
        </div>
        <Link href={`/invoices/${invoice.id}`} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          Back to invoice detail
        </Link>
      </div>

      <ClientPaymentCard invoice={invoice} />
    </main>
  );
}
