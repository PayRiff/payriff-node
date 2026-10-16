import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import { Payriff } from '../src';
import { MockServer } from './mock-server';

const server = new MockServer();
before(() => server.start());
after(() => server.stop());
beforeEach(() => server.reset());

describe('region', () => {
  test('saudi defaults to SAR', async () => {
    const payriff = server.client({ region: 'saudi' });

    server.ok('POST', '/api/v3/orders', { orderId: 'ORD-1' });
    await payriff.orders.create({ amount: 1 });
    assert.equal(server.last.json().currency, 'SAR');

    server.ok('POST', '/api/v3/autoPay', { orderId: 'ORD-2' });
    await payriff.payments.autoPay({ cardUuid: 'card-1', amount: 1, description: 'x' });
    assert.equal(server.last.json().currency, 'SAR');

    server.ok('POST', '/api/v2/invoices', { invoiceUuid: 'inv-1' });
    await payriff.invoices.create({ amount: 1 });
    assert.equal(server.last.json().body.currencyType, 'SAR');
  });

  test('azerbaijan is the default', async () => {
    server.ok('POST', '/api/v3/orders', { orderId: 'ORD-1' });

    await server.client().orders.create({ amount: 1 });

    assert.equal(server.last.json().currency, 'AZN');
  });

  test('explicit currency wins over region', async () => {
    server.ok('POST', '/api/v3/orders', { orderId: 'ORD-1' });

    await server.client({ region: 'saudi' }).orders.create({ amount: 1, currency: 'USD' });

    assert.equal(server.last.json().currency, 'USD');
  });

  test('rejects unknown region', () => {
    for (const region of ['ksa', 'toString']) {
      assert.throws(() => new Payriff({ appKey: 'k', region: region as never }), {
        name: 'RangeError',
        message: `unknown region: ${region}`,
      });
    }
  });
});