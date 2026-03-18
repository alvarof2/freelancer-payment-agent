"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm({ nextPath }: { nextPath?: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error ?? "Login failed.");
      setIsLoading(false);
      return;
    }

    router.push(nextPath && nextPath.startsWith("/") ? nextPath : "/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-[2rem] border border-black/5 bg-white p-6 shadow-sm shadow-black/5">
      <label className="block space-y-2 text-sm font-medium text-slate-700">
        <span>Password</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
          autoFocus
          required
        />
      </label>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <button disabled={isLoading} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50">
        {isLoading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
