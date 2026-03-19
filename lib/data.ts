import { randomUUID } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { getInvoiceAgentInsight } from "@/lib/agent";
import { AssetAmount, EarningsSummary, Invoice, InvoiceEvent, InvoiceEventType, InvoiceInput, PaymentMode, PaymentRequest, PaymentStatus, PaymentVerification, PaymentRoute, PaymentWebhookEventInput, PaymentWebhookEventRecord, ReconciliationAttemptInput, ReconciliationAttemptRecord, SettlementAsset } from "@/lib/types";

const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "invoices.json");
const sqliteFile = path.join(dataDir, "invoices.db");
const DAY_MS = 1000 * 60 * 60 * 24;
const DEFAULT_RECIPIENT = "0x4444444444444444444444444444444444444444";
const DEFAULT_PROVIDER_KEY = "minipay-celo-sepolia";
const DEFAULT_PROVIDER_LABEL = "Celo Checkout";
const DEFAULT_NETWORK_KEY = "celo-sepolia";
const DEFAULT_NETWORK_LABEL = "Celo Sepolia";

type InvoiceRow = Record<string, unknown>;
type WebhookEventRow = Record<string, unknown>;
type ReconciliationAttemptRow = Record<string, unknown>;

let db: DatabaseSync | null = null;
let storeReadyPromise: Promise<void> | null = null;
const SCHEMA_VERSION = 1;

function isoDaysFromNow(days: number) {
  return new Date(Date.now() + days * DAY_MS).toISOString();
}

function createEvent(type: InvoiceEventType, title: string, detail: string, at: string): InvoiceEvent {
  return { id: `evt_${randomUUID().slice(0, 8)}`, type, title, detail, at };
}

function sortEvents(events: InvoiceEvent[]) {
  return [...events].sort((a, b) => +new Date(b.at) - +new Date(a.at));
}

function getAssetKind(code: string): SettlementAsset["kind"] {
  return code.toUpperCase() === "CELO" ? "native" : "token";
}

function getAssetDecimals(code: string) {
  return code.toUpperCase() === "CELO" ? 18 : 18;
}

function createPaymentRoute(input?: { settlementAssetCode?: string; paymentMode?: PaymentMode; paymentNetworkKey?: string }): PaymentRoute {
  const settlementAssetCode = input?.settlementAssetCode ?? (input?.paymentMode === "native" ? "CELO" : "USDC");
  const settlementAsset: SettlementAsset = {
    code: settlementAssetCode,
    kind: getAssetKind(settlementAssetCode),
    decimals: getAssetDecimals(settlementAssetCode),
  };

  return {
    providerKey: DEFAULT_PROVIDER_KEY,
    providerLabel: DEFAULT_PROVIDER_LABEL,
    networkKey: DEFAULT_NETWORK_KEY,
    networkLabel: DEFAULT_NETWORK_LABEL,
    settlementAsset,
    supportsModes: ["stable", "native"],
  };
}

function createSeedInvoice(input: {
  id: string;
  clientName: string;
  clientEmail: string;
  projectName: string;
  description: string;
  amount: number;
  displayCurrency: string;
  settlementAssetCode: string;
  dueDate: string;
  issuedAt: string;
  recipientAddress: string;
  status: PaymentStatus;
  reminderCount: number;
  lastReminderAt?: string;
  createdAt: string;
  updatedAt: string;
  events: InvoiceEvent[];
}): Invoice {
  return {
    id: input.id,
    clientName: input.clientName,
    clientEmail: input.clientEmail,
    projectName: input.projectName,
    description: input.description,
    display: { amount: input.amount, currency: input.displayCurrency },
    dueDate: input.dueDate,
    issuedAt: input.issuedAt,
    recipientAddress: input.recipientAddress,
    paymentRoute: createPaymentRoute({ settlementAssetCode: input.settlementAssetCode }),
    status: input.status,
    reminderCount: input.reminderCount,
    lastReminderAt: input.lastReminderAt,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    events: input.events,
  };
}

function buildSeedInvoices(): Invoice[] {
  return [
    createSeedInvoice({
      id: "inv_demo_1",
      clientName: "Northstar Labs",
      clientEmail: "finance@northstarlabs.dev",
      projectName: "Design system sprint",
      description: "Product design system audit, token cleanup, and component handoff.",
      amount: 2400,
      displayCurrency: "USDC",
      settlementAssetCode: "USDC",
      dueDate: isoDaysFromNow(5),
      issuedAt: isoDaysFromNow(-2),
      recipientAddress: "0x1111111111111111111111111111111111111111",
      status: "viewed",
      reminderCount: 1,
      lastReminderAt: isoDaysFromNow(-1),
      createdAt: isoDaysFromNow(-2),
      updatedAt: isoDaysFromNow(-0.5),
      events: [
        createEvent("created", "Invoice created", "Created from the freelancer dashboard with a Celo checkout flow on Celo Sepolia.", isoDaysFromNow(-2)),
        createEvent("share_link_ready", "Shareable checkout link prepared", "Hosted client payment page is ready to send.", isoDaysFromNow(-2)),
        createEvent("client_viewed", "Client opened the invoice", "Northstar Labs viewed the hosted invoice and payment instructions.", isoDaysFromNow(-1.5)),
        createEvent("reminder_generated", "Reminder draft generated", "A checkout-oriented reminder was drafted after the client viewed but did not complete payment.", isoDaysFromNow(-1)),
      ],
    }),
    createSeedInvoice({
      id: "inv_demo_2",
      clientName: "Orbit Studio",
      clientEmail: "ap@orbitstudio.co",
      projectName: "Landing page build",
      description: "Responsive marketing site implementation with analytics hooks.",
      amount: 1800,
      displayCurrency: "USDC",
      settlementAssetCode: "USDC",
      dueDate: isoDaysFromNow(-3),
      issuedAt: isoDaysFromNow(-10),
      recipientAddress: "0x2222222222222222222222222222222222222222",
      status: "overdue",
      reminderCount: 2,
      lastReminderAt: isoDaysFromNow(-1.1),
      createdAt: isoDaysFromNow(-10),
      updatedAt: isoDaysFromNow(-1.1),
      events: [
        createEvent("created", "Invoice created", "Orbit Studio invoice created for the landing page implementation milestone.", isoDaysFromNow(-10)),
        createEvent("share_link_ready", "Shareable checkout link prepared", "Hosted client payment page was generated for the Celo checkout handoff.", isoDaysFromNow(-10)),
        createEvent("reminder_generated", "Reminder draft generated", "First reminder drafted after no acknowledgement in the initial follow-up window.", isoDaysFromNow(-5)),
        createEvent("status_changed", "Invoice marked overdue", "Due date passed without settlement, so the invoice moved into overdue follow-up mode.", isoDaysFromNow(-3)),
        createEvent("reminder_generated", "Second reminder drafted", "A firmer reminder was generated to recover the overdue receivable.", isoDaysFromNow(-1.1)),
      ],
    }),
    createSeedInvoice({
      id: "inv_demo_3",
      clientName: "Comet Commerce",
      clientEmail: "payments@cometcommerce.com",
      projectName: "Checkout optimization",
      description: "Experiment design, funnel review, and checkout conversion recommendations.",
      amount: 3200,
      displayCurrency: "USDC",
      settlementAssetCode: "USDC",
      dueDate: isoDaysFromNow(14),
      issuedAt: isoDaysFromNow(0),
      recipientAddress: "0x3333333333333333333333333333333333333333",
      status: "sent",
      reminderCount: 0,
      createdAt: isoDaysFromNow(0),
      updatedAt: isoDaysFromNow(0),
      events: [
        createEvent("created", "Invoice created", "New invoice is ready to share, with checkout preconfigured for Celo Sepolia.", isoDaysFromNow(0)),
        createEvent("share_link_ready", "Shareable checkout link prepared", "Client payment page is ready for a live demo handoff.", isoDaysFromNow(0)),
      ],
    }),
  ];
}

function getDb() {
  if (!db) {
    db = new DatabaseSync(sqliteFile);
    db.exec("PRAGMA journal_mode = WAL;");
  }
  return db;
}

function applySchemaV1(database: DatabaseSync) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      client_name TEXT NOT NULL,
      client_email TEXT NOT NULL,
      project_name TEXT NOT NULL,
      description TEXT NOT NULL,
      display_amount REAL NOT NULL,
      display_currency TEXT NOT NULL,
      due_date TEXT NOT NULL,
      issued_at TEXT NOT NULL,
      recipient_address TEXT NOT NULL,
      payment_route_json TEXT NOT NULL,
      status TEXT NOT NULL,
      reminder_count INTEGER NOT NULL DEFAULT 0,
      last_reminder_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

    CREATE TABLE IF NOT EXISTS invoice_events (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      detail TEXT NOT NULL,
      at TEXT NOT NULL,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_invoice_events_invoice_at ON invoice_events(invoice_id, at DESC);

    CREATE TABLE IF NOT EXISTS invoice_payment_requests (
      invoice_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      mode TEXT NOT NULL,
      state TEXT NOT NULL,
      wallet TEXT NOT NULL,
      route_label TEXT NOT NULL,
      network TEXT NOT NULL,
      network_key TEXT NOT NULL,
      chain_id INTEGER NOT NULL,
      rpc_url TEXT NOT NULL,
      settlement_asset_json TEXT NOT NULL,
      amount REAL NOT NULL,
      amount_formatted TEXT NOT NULL,
      amount_base_units TEXT NOT NULL,
      recipient TEXT NOT NULL,
      recipient_short TEXT NOT NULL,
      fee_estimate TEXT NOT NULL,
      reference TEXT NOT NULL,
      memo TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      deep_link TEXT NOT NULL,
      checkout_url TEXT NOT NULL,
      estimated_arrival TEXT NOT NULL,
      explorer_url TEXT NOT NULL,
      tx_hash TEXT,
      status_copy TEXT NOT NULL,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS invoice_payment_verifications (
      invoice_id TEXT PRIMARY KEY,
      tx_hash TEXT NOT NULL,
      verified_at TEXT NOT NULL,
      block_number INTEGER,
      explorer_url TEXT,
      summary TEXT NOT NULL,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payment_webhook_events (
      id TEXT PRIMARY KEY,
      provider_key TEXT NOT NULL,
      external_event_id TEXT,
      event_type TEXT NOT NULL,
      received_at TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      signature_valid INTEGER NOT NULL,
      processing_status TEXT NOT NULL,
      error_message TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_provider_external ON payment_webhook_events(provider_key, external_event_id);

    CREATE TABLE IF NOT EXISTS invoice_reconciliation_attempts (
      id TEXT PRIMARY KEY,
      invoice_id TEXT,
      webhook_event_id TEXT,
      tx_hash TEXT,
      reference TEXT,
      attempted_at TEXT NOT NULL,
      outcome TEXT NOT NULL,
      summary TEXT NOT NULL,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
      FOREIGN KEY (webhook_event_id) REFERENCES payment_webhook_events(id) ON DELETE SET NULL
    );
  `);
}

function invoiceToRow(invoice: Invoice) {
  return {
    id: invoice.id,
    client_name: invoice.clientName,
    client_email: invoice.clientEmail,
    project_name: invoice.projectName,
    description: invoice.description,
    display_amount: invoice.display.amount,
    display_currency: invoice.display.currency,
    due_date: invoice.dueDate,
    issued_at: invoice.issuedAt,
    recipient_address: invoice.recipientAddress,
    payment_route_json: JSON.stringify(invoice.paymentRoute),
    status: invoice.status,
    reminder_count: invoice.reminderCount,
    last_reminder_at: invoice.lastReminderAt ?? null,
    created_at: invoice.createdAt,
    updated_at: invoice.updatedAt,
  };
}

function eventToRow(invoiceId: string, event: InvoiceEvent) {
  return {
    id: event.id,
    invoice_id: invoiceId,
    type: event.type,
    title: event.title,
    detail: event.detail,
    at: event.at,
  };
}

function paymentRequestToRow(invoiceId: string, request: PaymentRequest) {
  return {
    invoice_id: invoiceId,
    session_id: request.sessionId,
    mode: request.mode,
    state: request.state,
    wallet: request.wallet,
    route_label: request.routeLabel,
    network: request.network,
    network_key: request.networkKey,
    chain_id: request.chainId,
    rpc_url: request.rpcUrl,
    settlement_asset_json: JSON.stringify(request.settlementAsset),
    amount: request.amount,
    amount_formatted: request.amountFormatted,
    amount_base_units: request.amountBaseUnits,
    recipient: request.recipient,
    recipient_short: request.recipientShort,
    fee_estimate: request.feeEstimate,
    reference: request.reference,
    memo: request.memo,
    expires_at: request.expiresAt,
    deep_link: request.deepLink,
    checkout_url: request.checkoutUrl,
    estimated_arrival: request.estimatedArrival,
    explorer_url: request.explorerUrl,
    tx_hash: request.txHash ?? null,
    status_copy: request.statusCopy,
  };
}

function paymentVerificationToRow(invoiceId: string, verification: PaymentVerification) {
  return {
    invoice_id: invoiceId,
    tx_hash: verification.txHash,
    verified_at: verification.verifiedAt,
    block_number: verification.blockNumber ?? null,
    explorer_url: verification.explorerUrl ?? null,
    summary: verification.summary,
  };
}

function rowToPaymentRequest(row: Record<string, unknown>): PaymentRequest {
  return {
    invoiceId: String(row.invoice_id),
    sessionId: String(row.session_id),
    mode: row.mode as PaymentMode,
    state: row.state as PaymentRequest["state"],
    wallet: String(row.wallet),
    routeLabel: String(row.route_label),
    network: String(row.network),
    networkKey: row.network_key as PaymentRequest["networkKey"],
    chainId: Number(row.chain_id),
    rpcUrl: String(row.rpc_url),
    settlementAsset: JSON.parse(String(row.settlement_asset_json)) as SettlementAsset,
    amount: Number(row.amount),
    amountFormatted: String(row.amount_formatted),
    amountBaseUnits: String(row.amount_base_units),
    recipient: String(row.recipient),
    recipientShort: String(row.recipient_short),
    feeEstimate: String(row.fee_estimate),
    reference: String(row.reference),
    memo: String(row.memo),
    expiresAt: String(row.expires_at),
    deepLink: String(row.deep_link),
    checkoutUrl: String(row.checkout_url),
    estimatedArrival: String(row.estimated_arrival),
    explorerUrl: String(row.explorer_url),
    txHash: typeof row.tx_hash === "string" ? row.tx_hash : undefined,
    statusCopy: String(row.status_copy),
  };
}

function rowToPaymentVerification(row: Record<string, unknown>): PaymentVerification {
  return {
    txHash: String(row.tx_hash),
    verifiedAt: String(row.verified_at),
    blockNumber: row.block_number == null ? undefined : Number(row.block_number),
    explorerUrl: typeof row.explorer_url === "string" ? row.explorer_url : undefined,
    summary: String(row.summary),
  };
}

function normalizePaymentRoute(raw: Record<string, unknown>) {
  if (raw.paymentRoute && typeof raw.paymentRoute === "object") {
    const paymentRoute = raw.paymentRoute as Partial<PaymentRoute> & { settlementAsset?: Partial<SettlementAsset> };
    const settlementCode = paymentRoute.settlementAsset?.code ?? (typeof raw.currency === "string" && raw.currency.toUpperCase() === "CELO" ? "CELO" : "USDC");
    return {
      providerKey: paymentRoute.providerKey ?? DEFAULT_PROVIDER_KEY,
      providerLabel: paymentRoute.providerLabel ?? DEFAULT_PROVIDER_LABEL,
      networkKey: paymentRoute.networkKey ?? DEFAULT_NETWORK_KEY,
      networkLabel: paymentRoute.networkLabel ?? DEFAULT_NETWORK_LABEL,
      settlementAsset: {
        code: settlementCode,
        kind: paymentRoute.settlementAsset?.kind ?? getAssetKind(settlementCode),
        decimals: paymentRoute.settlementAsset?.decimals ?? getAssetDecimals(settlementCode),
        tokenAddress: paymentRoute.settlementAsset?.tokenAddress,
      },
      supportsModes: paymentRoute.supportsModes ?? ["stable", "native"],
    } satisfies PaymentRoute;
  }

  const legacyCurrency = typeof raw.currency === "string" ? raw.currency : "USDC";
  const settlementAssetCode = legacyCurrency.toUpperCase() === "CELO" ? "CELO" : legacyCurrency.toUpperCase() === "CUSD" ? "cUSD" : "USDC";
  return createPaymentRoute({ settlementAssetCode, paymentMode: settlementAssetCode === "CELO" ? "native" : "stable" });
}

function normalizePaymentRequest(raw: Record<string, unknown>, invoice: Invoice): PaymentRequest | undefined {
  if (!raw.paymentRequest || typeof raw.paymentRequest !== "object") return undefined;
  const request = raw.paymentRequest as Record<string, unknown>;
  const legacyToken = typeof request.token === "string" ? request.token : invoice.paymentRoute.settlementAsset.code;
  const settlementAsset: SettlementAsset = request.settlementAsset && typeof request.settlementAsset === "object"
    ? {
        code: String((request.settlementAsset as Record<string, unknown>).code ?? legacyToken),
        kind: ((request.settlementAsset as Record<string, unknown>).kind as SettlementAsset["kind"]) ?? getAssetKind(legacyToken),
        decimals: Number((request.settlementAsset as Record<string, unknown>).decimals ?? request.tokenDecimals ?? getAssetDecimals(legacyToken)),
        tokenAddress: typeof (request.settlementAsset as Record<string, unknown>).tokenAddress === "string" ? String((request.settlementAsset as Record<string, unknown>).tokenAddress) : typeof request.tokenAddress === "string" ? String(request.tokenAddress) : undefined,
      }
    : {
        code: legacyToken,
        kind: getAssetKind(legacyToken),
        decimals: Number(request.tokenDecimals ?? getAssetDecimals(legacyToken)),
        tokenAddress: typeof request.tokenAddress === "string" ? request.tokenAddress : undefined,
      };

  return {
    invoiceId: String(request.invoiceId ?? invoice.id),
    sessionId: String(request.sessionId ?? `cp_${randomUUID().slice(0, 12)}`),
    mode: (request.mode as PaymentMode) ?? (settlementAsset.kind === "native" ? "native" : "stable"),
    state: (request.state as PaymentRequest["state"]) ?? "quote_ready",
    wallet: String(request.wallet ?? "Celo-compatible wallet"),
    routeLabel: String(request.routeLabel ?? request.rail ?? `${invoice.paymentRoute.providerLabel} / ${invoice.paymentRoute.networkLabel} / ${settlementAsset.code}`),
    network: String(request.network ?? invoice.paymentRoute.networkLabel),
    networkKey: (request.networkKey as PaymentRequest["networkKey"]) ?? invoice.paymentRoute.networkKey,
    chainId: Number(request.chainId ?? 11142220),
    rpcUrl: String(request.rpcUrl ?? "https://forno.celo-sepolia.celo-testnet.org"),
    settlementAsset,
    amount: Number(request.amount ?? invoice.display.amount),
    amountFormatted: String(request.amountFormatted ?? `${request.amount ?? invoice.display.amount} ${settlementAsset.code}`),
    amountBaseUnits: String(request.amountBaseUnits ?? "0"),
    recipient: String(request.recipient ?? raw.paymentAddress ?? invoice.recipientAddress),
    recipientShort: String(request.recipientShort ?? `${invoice.recipientAddress.slice(0, 6)}...${invoice.recipientAddress.slice(-4)}`),
    feeEstimate: String(request.feeEstimate ?? "Network fee paid in CELO"),
    reference: String(request.reference ?? "generated-on-request"),
    memo: String(request.memo ?? `${invoice.projectName} • pending reference`),
    expiresAt: String(request.expiresAt ?? new Date().toISOString()),
    deepLink: String(request.deepLink ?? "minipay://pay?..."),
    checkoutUrl: String(request.checkoutUrl ?? `/pay/${invoice.id}`),
    estimatedArrival: String(request.estimatedArrival ?? "Usually within a few Celo Sepolia blocks after broadcast"),
    explorerUrl: String(request.explorerUrl ?? "https://celo-sepolia.blockscout.com"),
    txHash: typeof request.txHash === "string" ? request.txHash : undefined,
    statusCopy: String(request.statusCopy ?? "Checkout ready."),
  };
}

function normalizeInvoice(raw: Record<string, unknown>): Invoice {
  const paymentRoute = normalizePaymentRoute(raw);
  const amount = typeof raw.amount === "number" ? raw.amount : Number(raw.amount ?? 0);
  const displayCurrency = raw.display && typeof raw.display === "object"
    ? String((raw.display as Record<string, unknown>).currency ?? raw.currency ?? "USDC")
    : String(raw.currency ?? paymentRoute.settlementAsset.code ?? "USDC");
  const invoice: Invoice = {
    id: String(raw.id),
    clientName: String(raw.clientName ?? ""),
    clientEmail: String(raw.clientEmail ?? ""),
    projectName: String(raw.projectName ?? ""),
    description: String(raw.description ?? ""),
    display: {
      amount: raw.display && typeof raw.display === "object" ? Number((raw.display as Record<string, unknown>).amount ?? amount) : amount,
      currency: displayCurrency,
    },
    dueDate: String(raw.dueDate),
    issuedAt: String(raw.issuedAt ?? raw.createdAt ?? new Date().toISOString()),
    recipientAddress: String(raw.recipientAddress ?? raw.paymentAddress ?? DEFAULT_RECIPIENT),
    paymentRoute,
    status: (raw.status as PaymentStatus) ?? "draft",
    reminderCount: Number(raw.reminderCount ?? 0),
    lastReminderAt: typeof raw.lastReminderAt === "string" ? raw.lastReminderAt : undefined,
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
    paymentVerification: raw.paymentVerification as PaymentVerification | undefined,
    events: sortEvents((raw.events as InvoiceEvent[] | undefined) ?? []),
  };

  invoice.paymentRequest = normalizePaymentRequest(raw, invoice);
  return invoice;
}

function readEventsByInvoiceIds(database: DatabaseSync, invoiceIds: string[]) {
  if (invoiceIds.length === 0) return new Map<string, InvoiceEvent[]>();
  const placeholders = invoiceIds.map(() => "?").join(", ");
  const rows = database.prepare(`SELECT id, invoice_id, type, title, detail, at FROM invoice_events WHERE invoice_id IN (${placeholders}) ORDER BY at DESC`).all(...invoiceIds) as Array<Record<string, unknown>>;
  const eventsByInvoiceId = new Map<string, InvoiceEvent[]>();

  for (const row of rows) {
    const invoiceId = String(row.invoice_id);
    const event: InvoiceEvent = {
      id: String(row.id),
      type: row.type as InvoiceEventType,
      title: String(row.title),
      detail: String(row.detail),
      at: String(row.at),
    };
    const existing = eventsByInvoiceId.get(invoiceId) ?? [];
    existing.push(event);
    eventsByInvoiceId.set(invoiceId, existing);
  }

  return eventsByInvoiceId;
}

function readPaymentRequestsByInvoiceIds(database: DatabaseSync, invoiceIds: string[]) {
  if (invoiceIds.length === 0) return new Map<string, PaymentRequest>();
  const placeholders = invoiceIds.map(() => "?").join(", ");
  const rows = database.prepare(`SELECT * FROM invoice_payment_requests WHERE invoice_id IN (${placeholders})`).all(...invoiceIds) as Array<Record<string, unknown>>;
  return new Map(rows.map((row) => [String(row.invoice_id), rowToPaymentRequest(row)]));
}

function readPaymentVerificationsByInvoiceIds(database: DatabaseSync, invoiceIds: string[]) {
  if (invoiceIds.length === 0) return new Map<string, PaymentVerification>();
  const placeholders = invoiceIds.map(() => "?").join(", ");
  const rows = database.prepare(`SELECT * FROM invoice_payment_verifications WHERE invoice_id IN (${placeholders})`).all(...invoiceIds) as Array<Record<string, unknown>>;
  return new Map(rows.map((row) => [String(row.invoice_id), rowToPaymentVerification(row)]));
}

function replaceInvoiceEvents(database: DatabaseSync, invoiceId: string, events: InvoiceEvent[]) {
  database.prepare("DELETE FROM invoice_events WHERE invoice_id = ?").run(invoiceId);
  const insert = database.prepare("INSERT INTO invoice_events (id, invoice_id, type, title, detail, at) VALUES (@id, @invoice_id, @type, @title, @detail, @at)");
  for (const event of sortEvents(events)) insert.run(eventToRow(invoiceId, event));
}

function replacePaymentRequest(database: DatabaseSync, invoiceId: string, request?: PaymentRequest) {
  database.prepare("DELETE FROM invoice_payment_requests WHERE invoice_id = ?").run(invoiceId);
  if (!request) return;
  const insert = database.prepare(`
    INSERT INTO invoice_payment_requests (
      invoice_id, session_id, mode, state, wallet, route_label, network, network_key,
      chain_id, rpc_url, settlement_asset_json, amount, amount_formatted, amount_base_units,
      recipient, recipient_short, fee_estimate, reference, memo, expires_at, deep_link,
      checkout_url, estimated_arrival, explorer_url, tx_hash, status_copy
    ) VALUES (
      @invoice_id, @session_id, @mode, @state, @wallet, @route_label, @network, @network_key,
      @chain_id, @rpc_url, @settlement_asset_json, @amount, @amount_formatted, @amount_base_units,
      @recipient, @recipient_short, @fee_estimate, @reference, @memo, @expires_at, @deep_link,
      @checkout_url, @estimated_arrival, @explorer_url, @tx_hash, @status_copy
    )
  `);
  insert.run(paymentRequestToRow(invoiceId, request));
}

function replacePaymentVerification(database: DatabaseSync, invoiceId: string, verification?: PaymentVerification) {
  database.prepare("DELETE FROM invoice_payment_verifications WHERE invoice_id = ?").run(invoiceId);
  if (!verification) return;
  const insert = database.prepare("INSERT INTO invoice_payment_verifications (invoice_id, tx_hash, verified_at, block_number, explorer_url, summary) VALUES (@invoice_id, @tx_hash, @verified_at, @block_number, @explorer_url, @summary)");
  insert.run(paymentVerificationToRow(invoiceId, verification));
}

function foreignKeyPointsToLegacy(database: DatabaseSync, tableName: string) {
  const rows = database.prepare(`PRAGMA foreign_key_list(${tableName})`).all() as Array<Record<string, unknown>>;
  return rows.some((row) => String(row.table) === "invoices_legacy");
}

function rebuildNormalizedChildTablesIfNeeded(database: DatabaseSync) {
  const needsEventsRebuild = foreignKeyPointsToLegacy(database, "invoice_events");
  const needsRequestsRebuild = foreignKeyPointsToLegacy(database, "invoice_payment_requests");
  const needsVerificationsRebuild = foreignKeyPointsToLegacy(database, "invoice_payment_verifications");

  if (!needsEventsRebuild && !needsRequestsRebuild && !needsVerificationsRebuild) return;

  database.exec("PRAGMA foreign_keys = OFF;");

  if (needsEventsRebuild) {
    database.exec(`
      ALTER TABLE invoice_events RENAME TO invoice_events_legacy;
      CREATE TABLE invoice_events (
        id TEXT PRIMARY KEY,
        invoice_id TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        detail TEXT NOT NULL,
        at TEXT NOT NULL,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
      );
      INSERT INTO invoice_events (id, invoice_id, type, title, detail, at)
      SELECT id, invoice_id, type, title, detail, at FROM invoice_events_legacy;
      DROP TABLE invoice_events_legacy;
      CREATE INDEX IF NOT EXISTS idx_invoice_events_invoice_at ON invoice_events(invoice_id, at DESC);
    `);
  }

  if (needsRequestsRebuild) {
    database.exec(`
      ALTER TABLE invoice_payment_requests RENAME TO invoice_payment_requests_legacy;
      CREATE TABLE invoice_payment_requests (
        invoice_id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        mode TEXT NOT NULL,
        state TEXT NOT NULL,
        wallet TEXT NOT NULL,
        route_label TEXT NOT NULL,
        network TEXT NOT NULL,
        network_key TEXT NOT NULL,
        chain_id INTEGER NOT NULL,
        rpc_url TEXT NOT NULL,
        settlement_asset_json TEXT NOT NULL,
        amount REAL NOT NULL,
        amount_formatted TEXT NOT NULL,
        amount_base_units TEXT NOT NULL,
        recipient TEXT NOT NULL,
        recipient_short TEXT NOT NULL,
        fee_estimate TEXT NOT NULL,
        reference TEXT NOT NULL,
        memo TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        deep_link TEXT NOT NULL,
        checkout_url TEXT NOT NULL,
        estimated_arrival TEXT NOT NULL,
        explorer_url TEXT NOT NULL,
        tx_hash TEXT,
        status_copy TEXT NOT NULL,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
      );
      INSERT INTO invoice_payment_requests (
        invoice_id, session_id, mode, state, wallet, route_label, network, network_key,
        chain_id, rpc_url, settlement_asset_json, amount, amount_formatted, amount_base_units,
        recipient, recipient_short, fee_estimate, reference, memo, expires_at, deep_link,
        checkout_url, estimated_arrival, explorer_url, tx_hash, status_copy
      )
      SELECT
        invoice_id, session_id, mode, state, wallet, route_label, network, network_key,
        chain_id, rpc_url, settlement_asset_json, amount, amount_formatted, amount_base_units,
        recipient, recipient_short, fee_estimate, reference, memo, expires_at, deep_link,
        checkout_url, estimated_arrival, explorer_url, tx_hash, status_copy
      FROM invoice_payment_requests_legacy;
      DROP TABLE invoice_payment_requests_legacy;
    `);
  }

  if (needsVerificationsRebuild) {
    database.exec(`
      ALTER TABLE invoice_payment_verifications RENAME TO invoice_payment_verifications_legacy;
      CREATE TABLE invoice_payment_verifications (
        invoice_id TEXT PRIMARY KEY,
        tx_hash TEXT NOT NULL,
        verified_at TEXT NOT NULL,
        block_number INTEGER,
        explorer_url TEXT,
        summary TEXT NOT NULL,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
      );
      INSERT INTO invoice_payment_verifications (invoice_id, tx_hash, verified_at, block_number, explorer_url, summary)
      SELECT invoice_id, tx_hash, verified_at, block_number, explorer_url, summary
      FROM invoice_payment_verifications_legacy;
      DROP TABLE invoice_payment_verifications_legacy;
    `);
  }

  database.exec("PRAGMA foreign_keys = ON;");
}

function migrateInvoicesTableIfNeeded(database: DatabaseSync) {
  const tableInfo = database.prepare("PRAGMA table_info(invoices)").all() as Array<Record<string, unknown>>;
  const hasLegacyColumns = tableInfo.some((column) => {
    const name = String(column.name);
    return name === "events_json" || name === "payment_request_json" || name === "payment_verification_json";
  });

  if (hasLegacyColumns) {
    database.exec("PRAGMA foreign_keys = OFF;");
    database.exec(`
      ALTER TABLE invoices RENAME TO invoices_legacy;
      CREATE TABLE invoices (
        id TEXT PRIMARY KEY,
        client_name TEXT NOT NULL,
        client_email TEXT NOT NULL,
        project_name TEXT NOT NULL,
        description TEXT NOT NULL,
        display_amount REAL NOT NULL,
        display_currency TEXT NOT NULL,
        due_date TEXT NOT NULL,
        issued_at TEXT NOT NULL,
        recipient_address TEXT NOT NULL,
        payment_route_json TEXT NOT NULL,
        status TEXT NOT NULL,
        reminder_count INTEGER NOT NULL DEFAULT 0,
        last_reminder_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      INSERT INTO invoices (
        id, client_name, client_email, project_name, description,
        display_amount, display_currency, due_date, issued_at, recipient_address,
        payment_route_json, status, reminder_count, last_reminder_at,
        created_at, updated_at
      )
      SELECT
        id, client_name, client_email, project_name, description,
        display_amount, display_currency, due_date, issued_at, recipient_address,
        payment_route_json, status, reminder_count, last_reminder_at,
        created_at, updated_at
      FROM invoices_legacy;
      CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
    `);
    rebuildNormalizedChildTablesIfNeeded(database);
    database.exec(`
      DROP TABLE invoices_legacy;
      PRAGMA foreign_keys = ON;
    `);
    return;
  }

  rebuildNormalizedChildTablesIfNeeded(database);
}

async function seedFromJsonIfNeeded(database: DatabaseSync) {
  const countRow = database.prepare("SELECT COUNT(*) as count FROM invoices").get() as { count: number };
  if (countRow.count > 0) return;

  let invoices: Invoice[] = [];
  try {
    const raw = await readFile(dataFile, "utf8");
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
    invoices = parsed.map(normalizeInvoice);
  } catch {
    invoices = buildSeedInvoices();
  }

  const insert = database.prepare(`
    INSERT INTO invoices (
      id, client_name, client_email, project_name, description,
      display_amount, display_currency, due_date, issued_at, recipient_address,
      payment_route_json, status, reminder_count, last_reminder_at,
      created_at, updated_at
    ) VALUES (
      @id, @client_name, @client_email, @project_name, @description,
      @display_amount, @display_currency, @due_date, @issued_at, @recipient_address,
      @payment_route_json, @status, @reminder_count, @last_reminder_at,
      @created_at, @updated_at
    )
  `);

  for (const invoice of invoices) {
    insert.run(invoiceToRow(invoice));
    replaceInvoiceEvents(database, invoice.id, invoice.events ?? []);
    replacePaymentRequest(database, invoice.id, invoice.paymentRequest);
    replacePaymentVerification(database, invoice.id, invoice.paymentVerification);
  }
}

function migrateSchema(database: DatabaseSync) {
  const versionRow = database.prepare("PRAGMA user_version").get() as { user_version?: number };
  const currentVersion = Number(versionRow.user_version ?? 0);

  if (currentVersion < 1) {
    applySchemaV1(database);
    migrateInvoicesTableIfNeeded(database);
    database.exec(`PRAGMA user_version = ${SCHEMA_VERSION};`);
    return;
  }

  applySchemaV1(database);
  migrateInvoicesTableIfNeeded(database);
}

async function ensureStore() {
  if (!storeReadyPromise) {
    storeReadyPromise = (async () => {
      await mkdir(dataDir, { recursive: true });
      const database = getDb();
      migrateSchema(database);
      await seedFromJsonIfNeeded(database);
    })();
  }
  await storeReadyPromise;
}

function rowToInvoice(row: InvoiceRow, events: InvoiceEvent[], paymentRequest?: PaymentRequest, paymentVerification?: PaymentVerification): Invoice {
  return normalizeInvoice({
    id: row.id,
    clientName: row.client_name,
    clientEmail: row.client_email,
    projectName: row.project_name,
    description: row.description,
    display: {
      amount: row.display_amount,
      currency: row.display_currency,
    },
    dueDate: row.due_date,
    issuedAt: row.issued_at,
    recipientAddress: row.recipient_address,
    paymentRoute: JSON.parse(String(row.payment_route_json)),
    status: row.status,
    reminderCount: row.reminder_count,
    lastReminderAt: row.last_reminder_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    paymentRequest,
    paymentVerification,
    events,
  });
}

async function readInvoices() {
  await ensureStore();
  const database = getDb();
  const rows = database.prepare("SELECT * FROM invoices ORDER BY created_at DESC").all() as InvoiceRow[];
  const invoiceIds = rows.map((row) => String(row.id));
  const eventsByInvoiceId = readEventsByInvoiceIds(database, invoiceIds);
  const requestsByInvoiceId = readPaymentRequestsByInvoiceIds(database, invoiceIds);
  const verificationsByInvoiceId = readPaymentVerificationsByInvoiceIds(database, invoiceIds);

  return rows.map((row) => rowToInvoice(
    row,
    eventsByInvoiceId.get(String(row.id)) ?? [],
    requestsByInvoiceId.get(String(row.id)),
    verificationsByInvoiceId.get(String(row.id)),
  ));
}

async function writeInvoices(invoices: Invoice[]) {
  await ensureStore();
  const database = getDb();
  const replace = database.prepare(`
    INSERT OR REPLACE INTO invoices (
      id, client_name, client_email, project_name, description,
      display_amount, display_currency, due_date, issued_at, recipient_address,
      payment_route_json, status, reminder_count, last_reminder_at,
      created_at, updated_at
    ) VALUES (
      @id, @client_name, @client_email, @project_name, @description,
      @display_amount, @display_currency, @due_date, @issued_at, @recipient_address,
      @payment_route_json, @status, @reminder_count, @last_reminder_at,
      @created_at, @updated_at
    )
  `);

  const existingRows = database.prepare("SELECT id FROM invoices").all() as Array<{ id: string }>;
  const existingIds = new Set(existingRows.map((row) => row.id));
  const nextIds = new Set(invoices.map((invoice) => invoice.id));

  for (const invoice of invoices) {
    replace.run(invoiceToRow(invoice));
    replaceInvoiceEvents(database, invoice.id, invoice.events ?? []);
    replacePaymentRequest(database, invoice.id, invoice.paymentRequest);
    replacePaymentVerification(database, invoice.id, invoice.paymentVerification);
  }

  for (const id of existingIds) {
    if (!nextIds.has(id)) {
      database.prepare("DELETE FROM invoice_events WHERE invoice_id = ?").run(id);
      database.prepare("DELETE FROM invoice_payment_requests WHERE invoice_id = ?").run(id);
      database.prepare("DELETE FROM invoice_payment_verifications WHERE invoice_id = ?").run(id);
      database.prepare("DELETE FROM invoices WHERE id = ?").run(id);
    }
  }
}

function resolveStatus(invoice: Invoice): PaymentStatus {
  if (invoice.status === "paid") return "paid";
  if (invoice.status === "draft") return "draft";
  if (new Date(invoice.dueDate).getTime() < Date.now()) return "overdue";
  return invoice.status;
}

function syncOverdueState(invoice: Invoice): Invoice {
  const resolvedStatus = resolveStatus(invoice);
  if (resolvedStatus === invoice.status) return invoice;

  const nextEvents = [...invoice.events];
  if (resolvedStatus === "overdue" && !nextEvents.some((event) => event.type === "status_changed" && event.title === "Invoice marked overdue")) {
    nextEvents.unshift(createEvent("status_changed", "Invoice marked overdue", "The due date passed without local payment confirmation.", invoice.dueDate));
  }

  return { ...invoice, status: resolvedStatus, events: sortEvents(nextEvents) };
}

export async function getInvoices() {
  const invoices = await readInvoices();
  return invoices.map(syncOverdueState).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export async function getInvoiceById(id: string) {
  const invoices = await getInvoices();
  return invoices.find((invoice) => invoice.id === id) ?? null;
}

export async function getInvoiceByPaymentReference(reference: string) {
  const invoices = await getInvoices();
  return invoices.find((invoice) => invoice.paymentRequest?.reference === reference) ?? null;
}

export async function createInvoice(input: InvoiceInput) {
  const invoices = await readInvoices();
  const now = new Date().toISOString();
  const displayCurrency = input.displayCurrency || "USDC";
  const settlementAssetCode = input.settlementAssetCode || (input.paymentMode === "native" ? "CELO" : displayCurrency.toUpperCase() === "CELO" ? "CELO" : "USDC");
  const invoice: Invoice = {
    id: `inv_${randomUUID().slice(0, 8)}`,
    clientName: input.clientName,
    clientEmail: input.clientEmail,
    projectName: input.projectName,
    description: input.description,
    display: {
      amount: Number(input.amount),
      currency: displayCurrency,
    },
    dueDate: new Date(input.dueDate).toISOString(),
    issuedAt: now,
    recipientAddress: input.recipientAddress || DEFAULT_RECIPIENT,
    paymentRoute: createPaymentRoute({
      settlementAssetCode,
      paymentMode: input.paymentMode,
      paymentNetworkKey: input.paymentNetworkKey,
    }),
    status: "sent",
    reminderCount: 0,
    createdAt: now,
    updatedAt: now,
    events: [
      createEvent("created", "Invoice created", `Invoice drafted for ${input.clientName} from a structured input flow.`, now),
      createEvent("share_link_ready", "Shareable checkout link prepared", "A client-facing payment page is ready to send immediately.", now),
    ],
  };

  invoices.push(invoice);
  await writeInvoices(invoices);
  return invoice;
}

export async function appendInvoiceEvent(id: string, input: { type: InvoiceEventType; title: string; detail: string; at?: string }) {
  const invoices = await readInvoices();
  const invoice = invoices.find((item) => item.id === id);
  if (!invoice) return null;

  const at = input.at ?? new Date().toISOString();
  invoice.events = sortEvents([createEvent(input.type, input.title, input.detail, at), ...(invoice.events ?? [])]);
  invoice.updatedAt = at;

  await writeInvoices(invoices);
  return invoice;
}

export async function setInvoicePaymentRequest(id: string, request: PaymentRequest) {
  const invoices = await readInvoices();
  const invoice = invoices.find((item) => item.id === id);
  if (!invoice) return null;
  invoice.paymentRequest = request;
  invoice.paymentRoute = {
    ...invoice.paymentRoute,
    settlementAsset: request.settlementAsset,
  };
  invoice.updatedAt = new Date().toISOString();
  await writeInvoices(invoices);
  return invoice;
}

export async function setInvoicePaymentVerification(id: string, verification: PaymentVerification) {
  const invoices = await readInvoices();
  const invoice = invoices.find((item) => item.id === id);
  if (!invoice) return null;
  invoice.paymentVerification = verification;
  invoice.updatedAt = verification.verifiedAt;
  await writeInvoices(invoices);
  return invoice;
}

export async function updateInvoiceStatus(id: string, status: PaymentStatus, eventDetail?: string) {
  const invoices = await readInvoices();
  const invoice = invoices.find((item) => item.id === id);
  if (!invoice) return null;

  invoice.status = status;
  invoice.updatedAt = new Date().toISOString();
  invoice.events = sortEvents([
    createEvent(
      status === "paid" ? "payment_confirmed" : "status_changed",
      status === "paid" ? "Payment confirmed" : `Status changed to ${status}`,
      eventDetail ?? `Invoice moved to ${status}.`,
      invoice.updatedAt,
    ),
    ...(invoice.events ?? []),
  ]);

  await writeInvoices(invoices);
  return invoice;
}

export async function sendReminder(id: string) {
  const invoices = await readInvoices();
  const invoice = invoices.find((item) => item.id === id);
  if (!invoice) return null;

  invoice.reminderCount += 1;
  invoice.lastReminderAt = new Date().toISOString();
  invoice.updatedAt = invoice.lastReminderAt;
  invoice.events = sortEvents([
    createEvent("reminder_generated", `Reminder draft #${invoice.reminderCount} generated`, "Local reminder copy was prepared for the freelancer to send through their preferred channel.", invoice.updatedAt),
    ...(invoice.events ?? []),
  ]);

  await writeInvoices(invoices);

  const insight = getInvoiceAgentInsight(invoice);
  return {
    invoice,
    reminderDraft: { subject: insight.reminderSubject, body: insight.reminderMessage },
    message: `Reminder draft generated for ${invoice.clientEmail || invoice.clientName}. In production this would hand off to email, push, or on-chain notification flows.`,
  };
}

export async function resetDemoData() {
  const seededInvoices = buildSeedInvoices().map((invoice) => ({
    ...invoice,
    events: sortEvents([
      createEvent("demo_reset", "Demo data refreshed", "Seeded invoice state was reset for the next live presentation.", new Date().toISOString()),
      ...invoice.events,
    ]),
    updatedAt: new Date().toISOString(),
  }));

  await writeInvoices(seededInvoices);
  return seededInvoices;
}

function rowToWebhookEvent(row: WebhookEventRow): PaymentWebhookEventRecord {
  return {
    id: String(row.id),
    providerKey: String(row.provider_key),
    externalEventId: typeof row.external_event_id === "string" ? row.external_event_id : undefined,
    eventType: String(row.event_type),
    receivedAt: String(row.received_at),
    payload: JSON.parse(String(row.payload_json)),
    signatureValid: Boolean(row.signature_valid),
    processingStatus: row.processing_status as PaymentWebhookEventRecord["processingStatus"],
    errorMessage: typeof row.error_message === "string" ? row.error_message : undefined,
  };
}

function rowToReconciliationAttempt(row: ReconciliationAttemptRow): ReconciliationAttemptRecord {
  return {
    id: String(row.id),
    invoiceId: typeof row.invoice_id === "string" ? row.invoice_id : undefined,
    webhookEventId: typeof row.webhook_event_id === "string" ? row.webhook_event_id : undefined,
    txHash: typeof row.tx_hash === "string" ? row.tx_hash : undefined,
    reference: typeof row.reference === "string" ? row.reference : undefined,
    attemptedAt: String(row.attempted_at),
    outcome: row.outcome as ReconciliationAttemptRecord["outcome"],
    summary: String(row.summary),
  };
}

export async function createWebhookEvent(input: PaymentWebhookEventInput) {
  await ensureStore();
  const database = getDb();
  const existing = input.externalEventId
    ? database.prepare("SELECT * FROM payment_webhook_events WHERE provider_key = ? AND external_event_id = ?").get(input.providerKey, input.externalEventId) as WebhookEventRow | undefined
    : undefined;

  if (existing) return rowToWebhookEvent(existing);

  const id = `whe_${randomUUID().slice(0, 8)}`;
  const receivedAt = new Date().toISOString();
  database.prepare(`
    INSERT INTO payment_webhook_events (
      id, provider_key, external_event_id, event_type, received_at, payload_json,
      signature_valid, processing_status, error_message
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.providerKey,
    input.externalEventId ?? null,
    input.eventType,
    receivedAt,
    JSON.stringify(input.payload),
    input.signatureValid ? 1 : 0,
    "received",
    null,
  );

  return {
    id,
    providerKey: input.providerKey,
    externalEventId: input.externalEventId,
    eventType: input.eventType,
    receivedAt,
    payload: input.payload,
    signatureValid: input.signatureValid,
    processingStatus: "received",
  } satisfies PaymentWebhookEventRecord;
}

export async function updateWebhookEventStatus(id: string, processingStatus: PaymentWebhookEventRecord["processingStatus"], errorMessage?: string) {
  await ensureStore();
  const database = getDb();
  database.prepare("UPDATE payment_webhook_events SET processing_status = ?, error_message = ? WHERE id = ?").run(processingStatus, errorMessage ?? null, id);
}

export async function recordReconciliationAttempt(input: ReconciliationAttemptInput) {
  await ensureStore();
  const database = getDb();
  database.prepare(`
    INSERT INTO invoice_reconciliation_attempts (
      id, invoice_id, webhook_event_id, tx_hash, reference, attempted_at, outcome, summary
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    `rec_${randomUUID().slice(0, 8)}`,
    input.invoiceId ?? null,
    input.webhookEventId ?? null,
    input.txHash ?? null,
    input.reference ?? null,
    new Date().toISOString(),
    input.outcome,
    input.summary,
  );
}

export async function getRecentWebhookEvents(limit = 6) {
  await ensureStore();
  const database = getDb();
  const rows = database.prepare("SELECT * FROM payment_webhook_events ORDER BY received_at DESC LIMIT ?").all(limit) as WebhookEventRow[];
  return rows.map(rowToWebhookEvent);
}

export async function getRecentReconciliationAttempts(limit = 8) {
  await ensureStore();
  const database = getDb();
  const rows = database.prepare("SELECT * FROM invoice_reconciliation_attempts ORDER BY attempted_at DESC LIMIT ?").all(limit) as ReconciliationAttemptRow[];
  return rows.map(rowToReconciliationAttempt);
}

function addAssetAmount(map: Map<string, number>, asset: string, amount: number) {
  map.set(asset, (map.get(asset) ?? 0) + amount);
}

function mapToAssetAmounts(map: Map<string, number>): AssetAmount[] {
  return [...map.entries()].map(([asset, amount]) => ({ asset, amount })).sort((a, b) => a.asset.localeCompare(b.asset));
}

export async function getEarningsSummary(): Promise<EarningsSummary> {
  const invoices = await getInvoices();
  const totalInvoicedByAsset = new Map<string, number>();
  const totalPaidByAsset = new Map<string, number>();
  const outstandingByAsset = new Map<string, number>();
  const overdueByAsset = new Map<string, number>();

  return invoices.reduce<EarningsSummary>((acc, invoice) => {
    const asset = invoice.paymentRequest?.settlementAsset.code || invoice.paymentRoute.settlementAsset.code;
    acc.totalInvoiced += invoice.display.amount;
    addAssetAmount(totalInvoicedByAsset, asset, invoice.display.amount);
    if (invoice.status === "paid") {
      acc.totalPaid += invoice.display.amount;
      acc.paidCount += 1;
      addAssetAmount(totalPaidByAsset, asset, invoice.display.amount);
    }
    if (invoice.status !== "paid") {
      acc.outstanding += invoice.display.amount;
      addAssetAmount(outstandingByAsset, asset, invoice.display.amount);
    }
    if (invoice.status === "overdue") {
      acc.overdue += invoice.display.amount;
      addAssetAmount(overdueByAsset, asset, invoice.display.amount);
    }
    if (invoice.status === "draft") acc.draftCount += 1;
    acc.totalInvoicedByAsset = mapToAssetAmounts(totalInvoicedByAsset);
    acc.totalPaidByAsset = mapToAssetAmounts(totalPaidByAsset);
    acc.outstandingByAsset = mapToAssetAmounts(outstandingByAsset);
    acc.overdueByAsset = mapToAssetAmounts(overdueByAsset);
    return acc;
  }, {
    totalInvoiced: 0,
    totalPaid: 0,
    outstanding: 0,
    overdue: 0,
    draftCount: 0,
    paidCount: 0,
    totalInvoicedByAsset: [],
    totalPaidByAsset: [],
    outstandingByAsset: [],
    overdueByAsset: [],
  });
}
