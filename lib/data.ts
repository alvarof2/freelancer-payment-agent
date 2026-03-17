import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Invoice, InvoiceInput, PaymentStatus, EarningsSummary } from "@/lib/types";

const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "invoices.json");

const seedInvoices: Invoice[] = [
  {
    id: "inv_demo_1",
    clientName: "Northstar Labs",
    clientEmail: "finance@northstarlabs.dev",
    projectName: "Design system sprint",
    description: "Product design system audit, token cleanup, and component handoff.",
    amount: 2400,
    currency: "USDC",
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(),
    issuedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    paymentAddress: "0x91fc...a4B2",
    paymentRail: "Base / USDC",
    status: "viewed",
    reminderCount: 1,
    lastReminderAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
  {
    id: "inv_demo_2",
    clientName: "Orbit Studio",
    clientEmail: "ap@orbitstudio.co",
    projectName: "Landing page build",
    description: "Responsive marketing site implementation with analytics hooks.",
    amount: 1800,
    currency: "USDC",
    dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    issuedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    paymentAddress: "0xa6d2...5F19",
    paymentRail: "Ethereum / USDC",
    status: "overdue",
    reminderCount: 2,
    lastReminderAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
  },
  {
    id: "inv_demo_3",
    clientName: "Comet Commerce",
    clientEmail: "payments@cometcommerce.com",
    projectName: "Checkout optimization",
    description: "Experiment design, funnel review, and checkout conversion recommendations.",
    amount: 3200,
    currency: "USDC",
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
    issuedAt: new Date().toISOString(),
    paymentAddress: "0x4b3e...e901",
    paymentRail: "Polygon / USDC",
    status: "sent",
    reminderCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

async function ensureStore() {
  await mkdir(dataDir, { recursive: true });

  try {
    await readFile(dataFile, "utf8");
  } catch {
    await writeFile(dataFile, JSON.stringify(seedInvoices, null, 2));
  }
}

async function readInvoices() {
  await ensureStore();
  const raw = await readFile(dataFile, "utf8");
  return JSON.parse(raw) as Invoice[];
}

async function writeInvoices(invoices: Invoice[]) {
  await ensureStore();
  await writeFile(dataFile, JSON.stringify(invoices, null, 2));
}

function resolveStatus(invoice: Invoice): PaymentStatus {
  if (invoice.status === "paid") return "paid";
  if (invoice.status === "draft") return "draft";
  if (new Date(invoice.dueDate).getTime() < Date.now()) return "overdue";
  return invoice.status;
}

export async function getInvoices() {
  const invoices = await readInvoices();
  return invoices
    .map((invoice) => ({ ...invoice, status: resolveStatus(invoice) }))
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export async function getInvoiceById(id: string) {
  const invoices = await getInvoices();
  return invoices.find((invoice) => invoice.id === id) ?? null;
}

export async function createInvoice(input: InvoiceInput) {
  const invoices = await readInvoices();
  const now = new Date().toISOString();
  const invoice: Invoice = {
    id: `inv_${randomUUID().slice(0, 8)}`,
    clientName: input.clientName,
    clientEmail: input.clientEmail,
    projectName: input.projectName,
    description: input.description,
    amount: Number(input.amount),
    currency: input.currency || "USDC",
    dueDate: new Date(input.dueDate).toISOString(),
    issuedAt: now,
    paymentAddress: `0x${randomUUID().replace(/-/g, "").slice(0, 12)}...${randomUUID().replace(/-/g, "").slice(0, 4)}`,
    paymentRail: "Mock escrow / stablecoin rail",
    status: "sent",
    reminderCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  invoices.push(invoice);
  await writeInvoices(invoices);
  return invoice;
}

export async function updateInvoiceStatus(id: string, status: PaymentStatus) {
  const invoices = await readInvoices();
  const invoice = invoices.find((item) => item.id === id);
  if (!invoice) return null;

  invoice.status = status;
  invoice.updatedAt = new Date().toISOString();

  await writeInvoices(invoices);
  return invoice;
}

export async function sendReminder(id: string) {
  const invoices = await readInvoices();
  const invoice = invoices.find((item) => item.id === id);
  if (!invoice) return null;

  invoice.reminderCount += 1;
  invoice.lastReminderAt = new Date().toISOString();
  invoice.updatedAt = new Date().toISOString();

  await writeInvoices(invoices);

  return {
    invoice,
    message: `Reminder stub queued for ${invoice.clientEmail}. In production this would trigger email, push, or on-chain notification flows.`,
  };
}

export async function getEarningsSummary(): Promise<EarningsSummary> {
  const invoices = await getInvoices();

  return invoices.reduce<EarningsSummary>(
    (acc, invoice) => {
      acc.totalInvoiced += invoice.amount;
      if (invoice.status === "paid") acc.totalPaid += invoice.amount;
      if (invoice.status !== "paid") acc.outstanding += invoice.amount;
      if (invoice.status === "overdue") acc.overdue += invoice.amount;
      if (invoice.status === "draft") acc.draftCount += 1;
      if (invoice.status === "paid") acc.paidCount += 1;
      return acc;
    },
    {
      totalInvoiced: 0,
      totalPaid: 0,
      outstanding: 0,
      overdue: 0,
      draftCount: 0,
      paidCount: 0,
    },
  );
}
