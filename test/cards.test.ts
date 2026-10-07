import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import { MockServer } from './mock-server';

const server = new MockServer();
before(() => server.start());
after(() => server.stop());
beforeEach(() => server.reset());

describe('cards', () => {
  test('save sends body and idempotency key', async () => {
    server.ok('POST', '/api/v3/cards/save', {
      cardSaveId: '0b6e1f6a-3c1d-4f5e-8a2b-9c7d6e5f4a3b', orderId: 'ORD-CS', paymentUrl: 'https://pay.payriff.com/ORD-CS',
      amount: 0.1, currency: 'AZN', status: 'CREATED',
    });

    const response = await server.client().cards.save({
      customerRef: 'cust-1',
      callbackUrl: 'https://shop.az/cards/cb',
      language: 'AZ',
      idempotencyKey: 'idem-1',
    });

    assert.equal(server.last.headers['x-idempotency-key'], 'idem-1');
    assert.deepEqual(server.last.json(), { customerRef: 'cust-1', callbackUrl: 'https://shop.az/cards/cb', language: 'AZ' });
    assert.equal(response.cardSaveId, '0b6e1f6a-3c1d-4f5e-8a2b-9c7d6e5f4a3b');
    assert.equal(response.status, 'CREATED');
  });

  test('save requires callbackUrl', async () => {
    await assert.rejects(server.client().cards.save({ customerRef: 'c' } as never), { message: 'callbackUrl is required' });
  });

  test('getSave parses verified card', async () => {
    server.ok('GET', '/api/v3/cards/save/cs-1', { cardSaveId: 'cs-1', status: 'VERIFIED', cardUuid: 'card-1' });

    const details = await server.client().cards.getSave('cs-1');

    assert.equal(details.status, 'VERIFIED');
    assert.equal(details.cardUuid, 'card-1');
  });

  test('list returns cards for customer', async () => {
    server.ok('GET', '/api/v3/cards/save?customerRef=cust%201', [
      { cardUuid: 'card-1', maskedPan: '416974******1979', cardBrand: 'VISA' },
      { cardUuid: 'card-2', maskedPan: '540000******0001', cardBrand: 'MASTERCARD' },
    ]);

    const cards = await server.client().cards.list('cust 1');

    assert.deepEqual(cards.map((c) => c.cardUuid), ['card-1', 'card-2']);
  });

  test('list returns empty array for null payload', async () => {
    server.ok('GET', '/api/v3/cards/save', null);

    assert.deepEqual(await server.client().cards.list('cust-1'), []);
  });

  test('delete calls card endpoint', async () => {
    server.ok('DELETE', '/api/v3/cards/card-1', true);

    await server.client().cards.delete('card-1');

    assert.equal(server.last.method, 'DELETE');
    assert.equal(server.last.url, '/api/v3/cards/card-1');
  });
});
