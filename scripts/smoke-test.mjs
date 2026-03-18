#!/usr/bin/env node
import process from 'node:process';

const baseUrl = process.env.SMOKE_BASE_URL || 'http://localhost:3000';

async function call(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
  });

  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  if (!response.ok) {
    throw new Error(`${init.method || 'GET'} ${path} failed (${response.status}): ${JSON.stringify(json)}`);
  }

  return json;
}

async function main() {
  console.log(`Smoke test against ${baseUrl}`);

  const reset = await call('/api/invoices/reset', { method: 'POST', body: '{}' });
  console.log(`✓ reset demo (${reset.invoices?.length ?? 0} invoices)`);

  const create = await call('/api/invoices', {
    method: 'POST',
    body: JSON.stringify({
      clientName: 'Smoke Test Client',
      clientEmail: 'smoke@example.com',
      projectName: 'Storage migration smoke test',
      description: 'Basic create/checkout/status smoke test.',
      amount: 42,
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      recipientAddress: '0x1111111111111111111111111111111111111111',
    }),
  });
  const invoiceId = create.invoice?.id;
  if (!invoiceId) throw new Error('Invoice creation did not return an id');
  console.log(`✓ created invoice ${invoiceId}`);

  const checkout = await call(`/api/invoices/${invoiceId}/checkout`, {
    method: 'POST',
    body: JSON.stringify({ action: 'create', mode: 'stable' }),
  });
  const sessionId = checkout.quote?.sessionId;
  if (!sessionId) throw new Error('Checkout creation did not return a sessionId');
  console.log(`✓ generated checkout session ${sessionId}`);

  await call(`/api/invoices/${invoiceId}/status`, {
    method: 'POST',
    body: JSON.stringify({ status: 'viewed' }),
  });
  console.log('✓ updated invoice status to viewed');

  const list = await call('/api/invoices');
  const saved = list.invoices?.find((invoice) => invoice.id === invoiceId);
  if (!saved) throw new Error('Created invoice not found in invoice list');
  if (!saved.paymentRequest?.sessionId) throw new Error('Created invoice missing persisted payment request');
  if (!Array.isArray(saved.events) || saved.events.length === 0) throw new Error('Created invoice missing persisted events');
  console.log('✓ verified persisted invoice, payment request, and events');

  await call('/api/webhooks/payments/test', {
    method: 'POST',
    body: JSON.stringify({
      eventId: `evt-${invoiceId}`,
      reference: saved.paymentRequest.reference,
      txHash: '0x123',
      mode: 'stable',
    }),
  }).catch((error) => {
    const message = String(error.message || error);
    if (!message.includes('Enter a valid 0x-prefixed transaction hash.')) {
      throw error;
    }
  });
  console.log('✓ webhook reconciliation path exercised');

  console.log('Smoke test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
