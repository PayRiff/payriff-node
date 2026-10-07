import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import { InsufficientBalanceError, type PayoutParams } from '../src';
import { MockServer } from './mock-server';

const server = new MockServer();
before(() => server.start());
after(() => server.stop());
beforeEach(() => server.reset());

const payout: PayoutParams = {
  transferAmount: 25,
  description: 'Refund to customer',
  fullName: 'JOHN DOE',
  finCode: '1AB2C3D',
  cardPan: '4169741330151979',
  requestRrn: 'po-1',
};

describe('payouts', () => {
  test('create wraps body in merchant envelope', async () => {
    server.ok('POST', '/api/v3/payout', {
      _final: 'true', state: 'SUCCESS', currentDepositBalance: 975, walletHistoryId: 321, bankName: 'KAPITAL',
    });

    const result = await server.client().payouts.create({ ...payout, idempotencyKey: 'idem-po-1' });

    assert.equal(server.last.headers['x-idempotency-key'], 'idem-po-1');
    assert.deepEqual(server.last.json(), {
      merchant: 'ES1000000',
      body: { transferAmount: 25, description: 'Refund to customer', fullName: 'JOHN DOE', finCode: '1AB2C3D', cardPan: '4169741330151979', requestRrn: 'po-1' },
    });
    assert.deepEqual(result, { finalState: 'true', state: 'SUCCESS', currentDepositBalance: 975, walletHistoryId: 321, bankName: 'KAPITAL' });
  });

  test('create maps insufficient balance', async () => {
    server.stub('POST', '/api/v3/payout', { status: 402, body: { code: '01200', message: 'Insufficient wallet balance' } });

    await assert.rejects(server.client().payouts.create(payout), (e: unknown) =>
      e instanceof InsufficientBalanceError && e.message === 'Insufficient wallet balance');
  });

  test('amount below minimum is rejected', async () => {
    await assert.rejects(server.client().payouts.create({ ...payout, transferAmount: 0.99 }), {
      name: 'RangeError', message: 'transferAmount must be at least 1',
    });
    assert.equal(server.requests.length, 0);
  });

  test('getByRequestRrn parses status', async () => {
    server.ok('GET', '/api/v3/payout/info/po-1', { state: 'IN_PROGRESS', transferAmount: 25, formattedDate: '01.10.2026 10:00:00' });

    const status = await server.client().payouts.getByRequestRrn('po-1');

    assert.equal(status.state, 'IN_PROGRESS');
    assert.equal(status.formattedDate, '01.10.2026 10:00:00');
  });

  test('checkCardholder normalizes PAN', async () => {
    server.ok('POST', '/api/v3/payout/check-cardholder', 'J*** D**');

    assert.equal(await server.client().payouts.checkCardholder('4169 7413 3015 1979'), 'J*** D**');
    assert.deepEqual(server.last.json(), { cardPan: '4169741330151979' });
  });

  test('checkCardholder rejects short PAN', async () => {
    await assert.rejects(server.client().payouts.checkCardholder('4169'), { message: 'cardPan must be a 16-digit number' });
  });

  test('list parses payout page', async () => {
    server.ok('GET', '/api/v3/payouts?status=SUCCESS&page=0&offset=10', {
      content: [{ id: 1, requestRrn: 'po-1', transferAmount: 25, fee: 0.25, state: 'SUCCESS' }],
      totalElements: 1, totalPages: 1, number: 0, size: 10, first: true, last: true,
    });

    const page = await server.client().payouts.list({ status: 'SUCCESS' });

    assert.deepEqual(page.content.map((p) => p.requestRrn), ['po-1']);
  });

  test('downloadReceipt returns PDF', async () => {
    const pdf = Buffer.from('%PDF-');
    server.stub('GET', '/api/v3/payout/receipt/po-1', { headers: { 'Content-Type': 'application/pdf' }, body: pdf });

    assert.deepEqual(await server.client().payouts.downloadReceipt('po-1'), pdf);
  });
});