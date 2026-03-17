"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const initialState = {
  clientName: "",
  clientEmail: "",
  projectName: "",
  description: "",
  amount: "",
  dueDate: "",
};

export function NewInvoiceForm() {
  const router = useRouter();
  const [form, setForm] = useState(initialState);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    const response = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: Number(form.amount) }),
    });

    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Could not create invoice.");
      setIsSaving(false);
      return;
    }

    const data = await response.json();
    setForm(initialState);
    setIsSaving(false);
    router.push(`/invoices/${data.invoice.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-[2rem] border border-black/5 bg-white p-6 shadow-sm shadow-black/5">
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Client name">
          <input required value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} className="input" />
        </Field>
        <Field label="Client email">
          <input required type="email" value={form.clientEmail} onChange={(e) => setForm({ ...form, clientEmail: e.target.value })} className="input" />
        </Field>
        <Field label="Project / milestone">
          <input required value={form.projectName} onChange={(e) => setForm({ ...form, projectName: e.target.value })} className="input" />
        </Field>
        <Field label="Amount (USD / USDC)">
          <input required type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="input" />
        </Field>
        <Field label="Due date">
          <input required type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="input" />
        </Field>
      </div>
      <Field label="Description">
        <textarea required rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input min-h-32" />
      </Field>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <button
        disabled={isSaving}
        className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
      >
        {isSaving ? "Creating invoice..." : "Create invoice"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}
