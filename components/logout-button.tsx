"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function onLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button onClick={onLogout} className="rounded-full px-4 py-2 transition hover:bg-slate-100 hover:text-slate-950">
      Logout
    </button>
  );
}
