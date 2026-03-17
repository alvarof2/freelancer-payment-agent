"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { parseInvoicePrompt } from "@/lib/invoice-parser";

const initialState = {
  clientName: "",
  clientEmail: "",
  projectName: "",
  description: "",
  amount: "",
  currency: "cUSD",
  paymentRail: "MiniPay / Celo / cUSD",
  dueDate: "",
};

const examplePrompt = "Invoice Acme €500 for landing page design due next Friday";

export function NewInvoiceForm() {
  const router = useRouter();
  const [prompt, setPrompt] = useState(examplePrompt);
  const [form, setForm] = useState(initialState);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parserMessage, setParserMessage] = useState<string | null>(null);

  const parsedDraft = useMemo(() => parseInvoicePrompt(prompt), [prompt]);

  function applyParsedDraft() {
    setForm((current) => ({
      ...current,
      clientName: parsedDraft.clientName || current.clientName,
      clientEmail: parsedDraft.clientEmail || current.clientEmail,
      projectName: parsedDraft.projectName || current.projectName,
      description: parsedDraft.description || current.description,
      amount: parsedDraft.amount || current.amount,
      currency: parsedDraft.currency || current.currency,
      dueDate: parsedDraft.dueDate || current.dueDate,
    }));

    setParserMessage(
      parsedDraft.confidence === "high"
        ? "Draft parsed cleanly. You can send it as-is or tweak the fields below."
        : "Draft parsed with a fallback. Review the highlighted fields before creating the invoice.",
    );
  }

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
    setPrompt(examplePrompt);
    setParserMessage(null);
    setIsSaving(false);
    router.push(`/invoices/${data.invoice.id}`);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] border border-violet-200/70 bg-gradient-to-br from-violet-50 via-white to-blue-50 p-6 shadow-sm shadow-black/5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-violet-700">Natural-language invoice draft</p>
            <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Type the invoice the way you&rsquo;d say it on a call.</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Example: <span className="font-medium text-slate-950">{examplePrompt}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={applyParsedDraft}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Parse into fields
          </button>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
          <div>
            <label className="block space-y-2 text-sm font-medium text-slate-700">
              <span>Prompt</span>
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} className="input min-h-32" />
            </label>
            {parserMessage ? <p className="mt-3 text-sm text-slate-600">{parserMessage}</p> : null}
          </div>

          <div className="rounded-[1.5rem] border border-white/80 bg-white/90 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-950">Parser preview</p>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                  parsedDraft.confidence === "high"
                    ? "bg-emerald-100 text-emerald-700"
                    : parsedDraft.confidence === "medium"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-slate-200 text-slate-700"
                }`}
              >
                {parsedDraft.confidence} confidence
              </span>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <PreviewRow label="Client" value={parsedDraft.clientName || "Needs review"} />
              <PreviewRow label="Amount" value={parsedDraft.amount ? `${parsedDraft.currency} ${parsedDraft.amount}` : "Needs review"} />
              <PreviewRow label="Project" value={parsedDraft.projectName || "Needs review"} />
              <PreviewRow label="Due" value={parsedDraft.dueDate || "Needs review"} />
            </dl>
            <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
              {parsedDraft.notes.length ? (
                <ul className="space-y-1">
                  {parsedDraft.notes.map((note) => (
                    <li key={note}>• {note}</li>
                  ))}
                </ul>
              ) : (
                <p>No fallback warnings — this one is demo-ready.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <form onSubmit={onSubmit} className="space-y-5 rounded-[2rem] border border-black/5 bg-white p-6 shadow-sm shadow-black/5">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Client name">
            <input required value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} className="input" />
          </Field>
          <Field label="Client email (optional)">
            <input type="email" value={form.clientEmail} onChange={(e) => setForm({ ...form, clientEmail: e.target.value })} className="input" />
          </Field>
          <Field label="Project / milestone">
            <input required value={form.projectName} onChange={(e) => setForm({ ...form, projectName: e.target.value })} className="input" />
          </Field>
          <Field label="Amount">
            <input required type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="input" />
          </Field>
          <Field label="Currency">
            <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="input">
              <option value="cUSD">cUSD</option>
              <option value="USDC">USDC</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </Field>
          <Field label="Due date">
            <input required type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="input" />
          </Field>
          <div className="md:col-span-2">
            <Field label="Payment rail label">
              <input value={form.paymentRail} onChange={(e) => setForm({ ...form, paymentRail: e.target.value })} className="input" />
            </Field>
          </div>
        </div>
        <Field label="Description">
          <textarea required rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input min-h-32" />
        </Field>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <div className="flex flex-wrap items-center gap-3">
          <button
            disabled={isSaving}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {isSaving ? "Creating invoice..." : "Create invoice"}
          </button>
          <p className="text-sm text-slate-500">All data stays local in <code>data/invoices.json</code>.</p>
        </div>
      </form>
    </div>
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

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="max-w-[70%] text-right font-medium text-slate-950">{value}</dd>
    </div>
  );
}
