import { LoginForm } from "@/components/login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;

  return (
    <main className="mx-auto max-w-md space-y-6 pt-10">
      <div>
        <p className="text-sm font-medium text-violet-600">Operator login</p>
        <h2 className="text-3xl font-semibold tracking-tight">Sign in to the dashboard</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          This is the protected operator area for the freelancer dashboard, invoice management, polling, and demo controls. Public client checkout links under <code>/pay/[id]</code> remain open.
        </p>
      </div>
      <LoginForm nextPath={next} />
    </main>
  );
}
