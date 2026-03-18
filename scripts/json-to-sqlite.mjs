#!/usr/bin/env node
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { DatabaseSync } from 'node:sqlite';

const rootDir = process.cwd();
const dataDir = path.join(rootDir, 'data');
const jsonPath = path.join(dataDir, 'invoices.json');
const dbPath = path.join(dataDir, 'invoices.db');

async function main() {
  await mkdir(dataDir, { recursive: true });
  const raw = await readFile(jsonPath, 'utf8');
  const invoices = JSON.parse(raw);

  const db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA journal_mode = WAL;
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
      updated_at TEXT NOT NULL,
      events_json TEXT
    );
    CREATE TABLE IF NOT EXISTS invoice_events (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      detail TEXT NOT NULL,
      at TEXT NOT NULL,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    );
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
    CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
    CREATE INDEX IF NOT EXISTS idx_invoice_events_invoice_at ON invoice_events(invoice_id, at DESC);
    DELETE FROM invoice_payment_verifications;
    DELETE FROM invoice_payment_requests;
    DELETE FROM invoice_events;
    DELETE FROM invoices;
  `);

  const insertInvoice = db.prepare(`
    INSERT INTO invoices (
      id, client_name, client_email, project_name, description,
      display_amount, display_currency, due_date, issued_at, recipient_address,
      payment_route_json, status, reminder_count, last_reminder_at,
      created_at, updated_at, events_json
    ) VALUES (
      @id, @client_name, @client_email, @project_name, @description,
      @display_amount, @display_currency, @due_date, @issued_at, @recipient_address,
      @payment_route_json, @status, @reminder_count, @last_reminder_at,
      @created_at, @updated_at, NULL
    )
  `);

  const insertEvent = db.prepare(`
    INSERT INTO invoice_events (id, invoice_id, type, title, detail, at)
    VALUES (@id, @invoice_id, @type, @title, @detail, @at)
  `);

  const insertRequest = db.prepare(`
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

  const insertVerification = db.prepare(`
    INSERT INTO invoice_payment_verifications (invoice_id, tx_hash, verified_at, block_number, explorer_url, summary)
    VALUES (@invoice_id, @tx_hash, @verified_at, @block_number, @explorer_url, @summary)
  `);

  for (const invoice of invoices) {
    insertInvoice.run({
      id: invoice.id,
      client_name: invoice.clientName ?? '',
      client_email: invoice.clientEmail ?? '',
      project_name: invoice.projectName ?? '',
      description: invoice.description ?? '',
      display_amount: Number(invoice.display?.amount ?? invoice.amount ?? 0),
      display_currency: String(invoice.display?.currency ?? invoice.currency ?? 'USDC'),
      due_date: String(invoice.dueDate),
      issued_at: String(invoice.issuedAt ?? invoice.createdAt ?? new Date().toISOString()),
      recipient_address: String(invoice.recipientAddress ?? invoice.paymentAddress ?? ''),
      payment_route_json: JSON.stringify(invoice.paymentRoute ?? {}),
      status: String(invoice.status ?? 'draft'),
      reminder_count: Number(invoice.reminderCount ?? 0),
      last_reminder_at: invoice.lastReminderAt ?? null,
      created_at: String(invoice.createdAt ?? new Date().toISOString()),
      updated_at: String(invoice.updatedAt ?? new Date().toISOString()),
    });

    for (const event of invoice.events ?? []) {
      insertEvent.run({
        id: event.id,
        invoice_id: invoice.id,
        type: event.type,
        title: event.title,
        detail: event.detail,
        at: event.at,
      });
    }

    if (invoice.paymentRequest) {
      insertRequest.run({
        invoice_id: invoice.id,
        session_id: invoice.paymentRequest.sessionId,
        mode: invoice.paymentRequest.mode,
        state: invoice.paymentRequest.state,
        wallet: invoice.paymentRequest.wallet,
        route_label: invoice.paymentRequest.routeLabel,
        network: invoice.paymentRequest.network,
        network_key: invoice.paymentRequest.networkKey,
        chain_id: invoice.paymentRequest.chainId,
        rpc_url: invoice.paymentRequest.rpcUrl,
        settlement_asset_json: JSON.stringify(invoice.paymentRequest.settlementAsset),
        amount: invoice.paymentRequest.amount,
        amount_formatted: invoice.paymentRequest.amountFormatted,
        amount_base_units: invoice.paymentRequest.amountBaseUnits,
        recipient: invoice.paymentRequest.recipient,
        recipient_short: invoice.paymentRequest.recipientShort,
        fee_estimate: invoice.paymentRequest.feeEstimate,
        reference: invoice.paymentRequest.reference,
        memo: invoice.paymentRequest.memo,
        expires_at: invoice.paymentRequest.expiresAt,
        deep_link: invoice.paymentRequest.deepLink,
        checkout_url: invoice.paymentRequest.checkoutUrl,
        estimated_arrival: invoice.paymentRequest.estimatedArrival,
        explorer_url: invoice.paymentRequest.explorerUrl,
        tx_hash: invoice.paymentRequest.txHash ?? null,
        status_copy: invoice.paymentRequest.statusCopy,
      });
    }

    if (invoice.paymentVerification) {
      insertVerification.run({
        invoice_id: invoice.id,
        tx_hash: invoice.paymentVerification.txHash,
        verified_at: invoice.paymentVerification.verifiedAt,
        block_number: invoice.paymentVerification.blockNumber ?? null,
        explorer_url: invoice.paymentVerification.explorerUrl ?? null,
        summary: invoice.paymentVerification.summary,
      });
    }
  }

  console.log(`Imported ${invoices.length} invoices into ${dbPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
