import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import { MockServer } from './mock-server';

const server = new MockServer();
before(() => server.start());
after(() => server.stop());
beforeEach(() => server.reset());

describe('payments', () => {
  test('autoPay sends explicit currency and one-click flag', async () => {
    server.ok('POST', '/api/v3/autoPay', {
      orderId: 'ORD-2', amount: 3, paymentStatus: 'APPROVED', auto: true, transactionResponseDto: { threeDS: false },
    });

    const response = await server.client().payments.autoPay({
      cardUuid: 'card-uuid-1',
      amount: 3,
      description: 'Subscription',
      oneClickPayment: true,
      requestRrn: 'rrn-2',
    });

    assert.equal(server.last.headers['x-request-rrn'], 'rrn-2');
    assert.deepEqual(server.last.json(), {
      cardUuid: 'card-uuid-1', amount: 3, operation: 'PURCHASE', currency: 'AZN', description: 'Subscription', isOneCLickPayment: true,
    });
    assert.equal(response.paymentStatus, 'APPROVED');
    assert.equal(response.transactionResponseDto?.threeDS, false);
  });
});