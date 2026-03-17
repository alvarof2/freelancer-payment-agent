import { NewInvoiceForm } from "@/components/new-invoice-form";

export default function NewInvoicePage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-medium text-violet-600">Invoice creation</p>
        <h2 className="text-3xl font-semibold tracking-tight">Spin up a payment request in under a minute.</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          This demo stores data locally and assigns a mock payment rail + wallet address so the product story is clear without any secret-dependent integrations.
        </p>
      </div>
      <NewInvoiceForm />
    </main>
  );
}
