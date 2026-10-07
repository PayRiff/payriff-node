import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import { MockServer } from './mock-server';

const server = new MockServer();
before(() => server.start());
after(() => server.stop());
beforeEach(() => server.reset());

describe('transactions', () => {
  test('list sends filter and parses page', async () => {
    server.ok('GET', '/api/v3/transactions?status=APPROVED&from=01.09.2026&to=30.09.2026&page=1&offset=20', {
      content: [{
        id: 5, orderId: 'ORD-1', amount: 10, currencyType: 'AZN', paymentStatus: 'APPROVED',
        card_brand: 'VISA', payment_way: 'DIRECT', extra_payment: 0.5, createdDate: '2026-09-15 10:00:00',
      }],
      totalElements: 41, totalPages: 3, number: 1, size: 20, first: false, last: false,
    });

    const page = await server.client().transactions.list({
      status: 'APPROVED',
      from: new Date(2026, 8, 1),
      to: '2026-09-30',
      page: 1,
      size: 20,
    });

    assert.equal(page.totalElements, 41);
    assert.equal(page.last, false);
    assert.deepEqual(page.content[0], {
      id: 5, orderId: 'ORD-1', amount: 10, currencyType: 'AZN', paymentStatus: 'APPROVED',
      cardBrand: 'VISA', paymentWay: 'DIRECT', extraPayment: 0.5, createdDate: '2026-09-15 10:00:00',
    });
  });

  test('default filter requests first page', async () => {
    server.ok('GET', '/api/v3/transactions', { content: [], totalElements: 0 });

    await server.client().transactions.list();

    assert.equal(server.last.url, '/api/v3/transactions?page=0&offset=10');
  });

  for (const size of [0, 21, -1, 2.5]) {
    test(`size ${size} is rejected`, async () => {
      await assert.rejects(server.client().transactions.list({ size }), { name: 'RangeError', message: 'size must be 1-20' });
    });
  }

  test('invalid date string is rejected', async () => {
    await assert.rejects(server.client().transactions.list({ from: '01.09.2026' }), { message: 'from must be a Date or a YYYY-MM-DD string' });
  });
});