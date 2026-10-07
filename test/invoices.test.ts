import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import { MockServer } from './mock-server';

const server = new MockServer();
before(() => server.start());
after(() => server.stop());
beforeEach(() => server.reset());

describe('invoices', () => {
  test('create sends merchant envelope', async () => {
    server.ok('POST', '/api/v2/invoices', {
      id: 9, invoiceUuid: 'inv-uuid-1', invoiceCode: 'INV-001', invoiceStatus: 'PENDING',
      paymentUrl: 'https://pay.payriff.com/i/inv?type=preview', amount: 15, currencyType: 'AZN',
    });

    const invoice = await server.client().invoices.create({
      amount: 15,
      language: 'AZ',
      fullName: 'JOHN DOE',
      phoneNumber: '+994501234567',
      description: 'Consultation',
      expireDate: new Date(2026, 9, 8, 23, 59),
      approveUrl: 'https://shop.az/ok',
      sendSms: false,
      metadata: { bookingRef: 'B-77' },
    });

    assert.deepEqual(server.last.json(), {
      merchant: 'ES1000000',
      body: {
        amount: 15, currencyType: 'AZN', languageType: 'AZ', fullName: 'JOHN DOE', phoneNumber: '+994501234567',
        description: 'Consultation', expireDate: '2026-10-08T23:59:00', approveURL: 'https://shop.az/ok',
        sendSms: false, metadata: { bookingRef: 'B-77' },
      },
    });
    assert.equal(invoice.invoiceUuid, 'inv-uuid-1');
    assert.equal(invoice.invoiceStatus, 'PENDING');
  });

  test('amount required unless dynamic', async () => {
    const client = server.client();
    server.ok('POST', '/api/v2/invoices', { invoiceUuid: 'inv-2' });

    await assert.rejects(client.invoices.create({}), { message: 'amount is required' });
    await client.invoices.create({ amountDynamic: true });
    assert.deepEqual(server.last.json().body, { amountDynamic: true, currencyType: 'AZN' });
  });

  test('get sends invoice uuid in envelope', async () => {
    server.ok('POST', '/api/v2/get-invoice', { invoiceUuid: 'inv-uuid-1', invoiceStatus: 'COMPLETE', paymentDay: '2026-10-02' });

    const details = await server.client().invoices.get('inv-uuid-1');

    assert.deepEqual(server.last.json(), { merchant: 'ES1000000', body: { uuid: 'inv-uuid-1' } });
    assert.equal(details.invoiceStatus, 'COMPLETE');
    assert.equal(details.paymentDay, '2026-10-02');
  });
});