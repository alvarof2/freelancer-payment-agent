"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DemoResetButton() {
  const router = useRouter();
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onReset() {
    setIsBusy(true);
    setMessage(null);

    const response = await fetch("/api/invoices/reset", { method: "POST" });
    const data = await response.json();

    setMessage(data.message ?? "Demo data restored.");
    setIsBusy(false);
    router.refresh();
  }

  return (
    <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50/80 p-4 text-sm text-slate-700">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-slate-950">Seeded demo reset</p>
          <p className="mt-1">Restore the default invoices, timeline history, and dashboard story before the next live run.</p>
        </div>
        <button
          onClick={onReset}
          disabled={isBusy}
          className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          {isBusy ? "Resetting demo..." : "Reset demo data"}
        </button>
      </div>
      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
    </div>
  );
}
