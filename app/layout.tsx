import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Freelancer Payment Agent",
  description: "Hackathon MVP for creating invoices from natural language, sharing a clean payment page, and tracking payment status locally.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} bg-slate-50 text-slate-950 antialiased`}>
        <div className="mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <header className="mb-10 flex flex-col gap-4 rounded-[2rem] border border-white/70 bg-white/90 px-6 py-5 shadow-sm shadow-black/5 backdrop-blur md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-600">Freelancer Payment Agent</p>
              <h1 className="text-2xl font-semibold tracking-tight">Get invoices out fast. Track cash with less chaos.</h1>
            </div>
            <nav className="flex flex-wrap gap-3 text-sm font-medium text-slate-600">
              <Link href="/" className="rounded-full px-4 py-2 transition hover:bg-slate-100 hover:text-slate-950">
                Dashboard
              </Link>
              <Link href="/invoices/new" className="rounded-full px-4 py-2 transition hover:bg-slate-100 hover:text-slate-950">
                New invoice
              </Link>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
