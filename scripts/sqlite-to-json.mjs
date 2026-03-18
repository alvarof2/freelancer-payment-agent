#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { DatabaseSync } from 'node:sqlite';

const rootDir = process.cwd();
const dataDir = path.join(rootDir, 'data');
const jsonPath = path.join(dataDir, 'invoices.json');
const dbPath = path.join(dataDir, 'invoices.db');

async function main() {
  await mkdir(dataDir, { recursive: true });
  const db = new DatabaseSync(dbPath);
  const rows = db.prepare('SELECT * FROM invoices ORDER BY created_at DESC').all();

  const invoices = rows.map((row) => {
    const events = db.prepare('SELECT id, type, title, detail, at FROM invoice_events WHERE invoice_id = ? ORDER BY at DESC').all(row.id);
    const paymentRequest = db.prepare('SELECT * FROM invoice_payment_requests WHERE invoice_id = ?').get(row.id);
    const paymentVerification = db.prepare('SELECT * FROM invoice_payment_verifications WHERE invoice_id = ?').get(row.id);

    return {
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
      paymentRoute: JSON.parse(row.payment_route_json),
      status: row.status,
      reminderCount: row.reminder_count,
      lastReminderAt: row.last_reminder_at ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      paymentRequest: paymentRequest ? {
        invoiceId: paymentRequest.invoice_id,
        sessionId: paymentRequest.session_id,
        mode: paymentRequest.mode,
        state: paymentRequest.state,
        wallet: paymentRequest.wallet,
        routeLabel: paymentRequest.route_label,
        network: paymentRequest.network,
        networkKey: paymentRequest.network_key,
        chainId: paymentRequest.chain_id,
        rpcUrl: paymentRequest.rpc_url,
        settlementAsset: JSON.parse(paymentRequest.settlement_asset_json),
        amount: paymentRequest.amount,
        amountFormatted: paymentRequest.amount_formatted,
        amountBaseUnits: paymentRequest.amount_base_units,
        recipient: paymentRequest.recipient,
        recipientShort: paymentRequest.recipient_short,
        feeEstimate: paymentRequest.fee_estimate,
        reference: paymentRequest.reference,
        memo: paymentRequest.memo,
        expiresAt: paymentRequest.expires_at,
        deepLink: paymentRequest.deep_link,
        checkoutUrl: paymentRequest.checkout_url,
        estimatedArrival: paymentRequest.estimated_arrival,
        explorerUrl: paymentRequest.explorer_url,
        txHash: paymentRequest.tx_hash ?? undefined,
        statusCopy: paymentRequest.status_copy,
      } : undefined,
      paymentVerification: paymentVerification ? {
        txHash: paymentVerification.tx_hash,
        verifiedAt: paymentVerification.verified_at,
        blockNumber: paymentVerification.block_number ?? undefined,
        explorerUrl: paymentVerification.explorer_url ?? undefined,
        summary: paymentVerification.summary,
      } : undefined,
      events,
    };
  });

  await writeFile(jsonPath, `${JSON.stringify(invoices, null, 2)}\n`);
  console.log(`Exported ${invoices.length} invoices to ${jsonPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
