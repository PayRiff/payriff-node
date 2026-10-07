import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import type { OrdersApi } from '../src';
import { MockServer } from './mock-server';

const server = new MockServer();
before(() => server.start());
after(() => server.stop());
beforeEach(() => server.reset());

const ORDER_INFO = {
  orderId: 'ORD-1',
  amount: 10.5,
  currencyType: 'AZN',
  merchantName: 'Shop',
  commission: 0.2,
  commissionRate: 2,
  operationType: 'PURCHASE',
  paymentStatus: 'APPROVED',
  auto: false,
  createdDate: '2026-10-01T14:05:09.123456',
  description: 'Order #1',
  metadata: '{"k":"v"}',
  transactions: [{
    uuid: '6f1c2a4e-0b7d-4c3e-9a51-2d8e7f6b1c90',
    status: 'APPROVED',
    channel: 'KAPITAL_BANK',
    cardDetails: { maskedPan: '416974******1979', brand: 'VISA' },
    installment: { type: 'BIRKART', period: 'PERIOD_3' },
  }],
};

describe('orders', () => {
  test('create sends body and RRN header', async () => {
    server.ok('POST', '/api/v3/orders', {
      orderId: 'ORD-1', paymentUrl: 'https://pay.payriff.com/ORD-1', transactionId: 77,
      comissionRate: 2.5, amount: 10, fee: 0.25, totalAmount: 10.25,
    });

    const response = await server.client().orders.create({
      amount: 10,
      language: 'AZ',
      description: 'Order #1',
      callbackUrl: 'https://shop.az/cb',
      installment: { type: 'BIRKART', period: 'PERIOD_3' },
      metadata: { cartId: 'c-9' },
      requestRrn: 'rrn-1',
    });

    assert.equal(server.last.headers.authorization, 'app-key');
    assert.equal(server.last.headers['x-request-rrn'], 'rrn-1');
    assert.equal(server.last.headers['content-type'], 'application/json');
    assert.deepEqual(server.last.json(), {
      amount: 10, currency: 'AZN', language: 'AZ', operation: 'PURCHASE', description: 'Order #1',
      callbackUrl: 'https://shop.az/cb', installment: { type: 'BIRKART', period: 'PERIOD_3' }, metadata: { cartId: 'c-9' },
    });
    assert.deepEqual(response, {
      orderId: 'ORD-1', paymentUrl: 'https://pay.payriff.com/ORD-1', transactionId: 77,
      commissionRate: 2.5, amount: 10, fee: 0.25, totalAmount: 10.25,
    });
  });

  test('create omits RRN header and empty maps', async () => {
    server.ok('POST', '/api/v3/orders', { orderId: 'ORD-1' });

    await server.client().orders.create({ amount: 1, metadata: {} });

    assert.equal(server.last.headers['x-request-rrn'], undefined);
    assert.deepEqual(server.last.json(), { amount: 1, currency: 'AZN', operation: 'PURCHASE' });
  });

  test('create rejects missing amount', async () => {
    await assert.rejects(server.client().orders.create({} as never), { name: 'TypeError', message: 'amount is required' });
    assert.equal(server.requests.length, 0);
  });

  const lookups: Array<[string, (api: OrdersApi, id: string) => Promise<unknown>, string, string]> = [
    ['get', (api, id) => api.get(id), 'ORD-1', '/api/v3/orders/ORD-1'],
    ['getStatus', (api, id) => api.getStatus(id), 'ORD-1', '/api/v3/orders/ORD-1/status'],
    ['getByRequestRrn', (api, id) => api.getByRequestRrn(id), 'rrn 1/2', '/api/v3/orders/rrn%201%2F2/rrn'],
  ];
  for (const [name, call, id, path] of lookups) {
    test(`${name} parses order info`, async () => {
      server.ok('GET', path, ORDER_INFO);

      const order = await call(server.client().orders, id);

      assert.equal(server.last.url, path);
      assert.deepEqual(order, ORDER_INFO);
    });
  }

  test('unknown status values pass through', async () => {
    server.ok('GET', '/api/v3/orders/ORD-1', { orderId: 'ORD-1', paymentStatus: 'SOMETHING_NEW' });

    const order = await server.client().orders.get('ORD-1');

    assert.equal(order.paymentStatus, 'SOMETHING_NEW');
  });

  test('expire sends orderId as query', async () => {
    server.ok('PATCH', '/api/v3/expire-status', null);

    const result = await server.client().orders.expire('ORD-1');

    assert.equal(server.last.method, 'PATCH');
    assert.equal(server.last.url, '/api/v3/expire-status?orderId=ORD-1');
    assert.equal(result, undefined);
  });

  test('refund sends body', async () => {
    server.ok('POST', '/api/v3/refund', null);

    await server.client().orders.refund({ orderId: 'ORD-1', amount: 5, refundReason: 'damaged' });

    assert.deepEqual(server.last.json(), { orderId: 'ORD-1', amount: 5, refundReason: 'damaged' });
  });

  test('complete sends body', async () => {
    server.ok('POST', '/api/v3/complete', null);

    await server.client().orders.complete({ orderId: 'ORD-1', amount: 7 });

    assert.deepEqual(server.last.json(), { orderId: 'ORD-1', amount: 7 });
  });

  test('refund requires orderId', async () => {
    await assert.rejects(server.client().orders.refund({} as never), { message: 'orderId is required' });
  });
});