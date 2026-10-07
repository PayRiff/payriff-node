import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { parseOrderCallback } from '../src';

const CALLBACK = '{"payload":{"orderId":"ORD-1","invoiceUuid":"inv-1","amount":10.5,'
  + '"currencyType":"AZN","paymentStatus":"APPROVED","operationType":"PURCHASE","auto":false,'
  + '"createdDate":"2026-10-01T14:05:09.123","customFields":{"x":"y"},'
  + '"transactions":[{"uuid":"6f1c2a4e-0b7d-4c3e-9a51-2d8e7f6b1c90","status":"APPROVED"}]},'
  + '"code":"00000","message":"Operation performed successfully","route":"/dashboard","responseId":"http-nio-1"}';

describe('webhooks', () => {
  for (const [kind, body] of [['string', CALLBACK], ['Buffer', Buffer.from(CALLBACK)], ['parsed object', JSON.parse(CALLBACK)]] as const) {
    test(`parses callback from ${kind}`, () => {
      const order = parseOrderCallback(body);

      assert.equal(order.orderId, 'ORD-1');
      assert.equal(order.paymentStatus, 'APPROVED');
      assert.equal(order.invoiceUuid, 'inv-1');
      assert.equal(order.createdDate, '2026-10-01T14:05:09.123');
      assert.equal(order.transactions?.length, 1);
    });
  }

  for (const body of ['', 'not json', '{}', '{"payload":null}', '{"payload":{"amount":1}}', '[]', '{"payload":[]}']) {
    test(`rejects ${JSON.stringify(body)}`, () => {
      assert.throws(() => parseOrderCallback(body), { name: 'TypeError', message: 'Not a Payriff order callback' });
    });
  }
});