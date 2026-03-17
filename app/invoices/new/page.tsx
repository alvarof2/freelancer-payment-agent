import { NewInvoiceForm } from "@/components/new-invoice-form";

export default function NewInvoicePage() {
  return (
    <main className="mx-auto max-w-5xl space-y-6">
      <div className="max-w-3xl">
        <p className="text-sm font-medium text-violet-600">Invoice creation</p>
        <h2 className="text-3xl font-semibold tracking-tight">Draft an invoice in plain English, then tighten the details before sending.</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          The parser is intentionally lightweight and local-first. It handles common demo prompts well, falls back gracefully when it is unsure, and always leaves the final structured fields editable.
        </p>
      </div>
      <NewInvoiceForm />
    </main>
  );
}
