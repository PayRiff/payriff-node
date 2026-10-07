import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import {
  ApiError,
  AuthenticationError,
  InsufficientBalanceError,
  PayoutLimitError,
  Payriff,
  PayriffConnectionError,
  RequestRejectedError,
  ValidationError,
} from '../src';
import { VERSION } from '../src/version';
import { MockServer } from './mock-server';

const server = new MockServer();
before(() => server.start());
after(() => server.stop());
beforeEach(() => server.reset());

describe('transport', () => {
  test('unwraps payload on success', async () => {
    server.ok('GET', '/api/v3/orders/ORD-1', { orderId: 'ORD-1', paymentStatus: 'APPROVED' });

    const order = await server.client().orders.get('ORD-1');

    assert.equal(order.orderId, 'ORD-1');
    assert.equal(order.paymentStatus, 'APPROVED');
  });

  test('sends auth and client headers', async () => {
    server.ok('GET', '/api/v3/orders/ORD-1', { orderId: 'ORD-1' });

    await server.client().orders.get('ORD-1');

    assert.equal(server.last.headers.authorization, 'app-key');
    assert.equal(server.last.headers['user-agent'], `payriff-node/${VERSION}`);
    assert.equal(server.last.headers.accept, 'application/json');
    assert.equal(server.last.headers['content-type'], undefined);
  });

  test('encodes path segments and query parameters', async () => {
    server.ok('PATCH', '/api/v3/expire-status', null);

    await server.client().orders.expire('ORD 1/2');

    assert.equal(server.last.url, '/api/v3/expire-status?orderId=ORD%201%2F2');
  });

  test('rejects blank path segments before sending', async () => {
    await assert.rejects(server.client().orders.get(' '), { name: 'TypeError', message: 'orderId must not be blank' });
    assert.equal(server.requests.length, 0);
  });

  test('merchant envelope requires merchantId', async () => {
    const client = server.client({ merchantId: undefined });

    await assert.rejects(client.invoices.get('inv-1'), { message: 'merchantId must be configured on Payriff for this operation' });
    assert.equal(server.requests.length, 0);
  });

  const failures: Array<[number, string, new (...args: any[]) => ApiError]> = [
    [200, '15000', ApiError],
    [401, '14010', AuthenticationError],
    [401, '14013', AuthenticationError],
    [200, '14014', AuthenticationError],
    [401, '14015', AuthenticationError],
    [400, '15400', ValidationError],
    [400, '99999', ValidationError],
    [403, '99999', AuthenticationError],
    [402, '01000', RequestRejectedError],
    [402, '01200', InsufficientBalanceError],
    [402, '01300', PayoutLimitError],
    [402, '01400', PayoutLimitError],
    [402, '01500', PayoutLimitError],
    [500, '15000', ApiError],
    [503, '15000', ApiError],
  ];
  for (const [status, code, type] of failures) {
    test(`maps HTTP ${status} / ${code} to ${type.name}`, async () => {
      server.stub('GET', '/api/v3/orders/ORD-1', {
        status,
        body: { code, message: 'Failure reason', responseId: 'resp-1' },
      });

      const error = await server.client().orders.get('ORD-1').catch((e: unknown) => e);

      assert.ok(error instanceof type, `expected ${type.name}, got ${(error as Error).name}`);
      assert.equal(error.constructor, type);
      assert.equal(error.message, 'Failure reason');
      assert.equal(error.httpStatus, status);
      assert.equal(error.code, code);
      assert.equal(error.responseId, 'resp-1');
    });
  }

  test('missing message falls back to HTTP status', async () => {
    server.stub('GET', '/api/v3/orders/ORD-1', { status: 500, body: { code: '15000' } });

    await assert.rejects(server.client().orders.get('ORD-1'), { message: 'Payriff request failed (HTTP 500)' });
  });

  test('non-JSON error body keeps status and truncates', async () => {
    server.stub('GET', '/api/v3/orders/ORD-1', { status: 502, headers: { 'Content-Type': 'text/html' }, body: 'x'.repeat(600) });

    const error = await server.client().orders.get('ORD-1').catch((e: unknown) => e);

    assert.ok(error instanceof ApiError);
    assert.equal(error.httpStatus, 502);
    assert.equal(error.code, undefined);
    assert.equal(error.message, `${'x'.repeat(500)}...`);
  });

  test('success status without envelope is rejected', async () => {
    server.stub('GET', '/api/v3/orders/ORD-1', { body: { orderId: 'ORD-1' } });

    await assert.rejects(server.client().orders.get('ORD-1'), { name: 'ApiError', message: 'Unexpected response from Payriff' });
  });

  test('redirect responses are not followed', async () => {
    server.stub('GET', '/api/v3/orders/ORD-1', { status: 418, headers: { Location: 'https://example.com' }, body: { code: '15000', message: 'Redirect' } });

    await assert.rejects(server.client().orders.get('ORD-1'), { name: 'ApiError', message: 'Redirect' });
  });

  test('download returns bytes', async () => {
    const pdf = Buffer.from('%PDF-1.7');
    server.stub('GET', '/api/v3/acquiring/receipt/ORD-1', { headers: { 'Content-Type': 'application/pdf' }, body: pdf });

    const bytes = await server.client().orders.downloadReceipt('ORD-1');

    assert.deepEqual(bytes, pdf);
    assert.equal(server.last.headers.accept, 'application/pdf, application/json');
  });

  test('download maps envelope error', async () => {
    server.stub('GET', '/api/v3/acquiring/receipt/ORD-1', { status: 400, body: { code: '15400', message: 'Receipt not found' } });

    await assert.rejects(server.client().orders.downloadReceipt('ORD-1'), ValidationError);
  });

  test('connection failure raises PayriffConnectionError', async () => {
    const client = new Payriff({ appKey: 'app-key', baseUrl: 'http://127.0.0.1:1' });

    const error = await client.orders.get('ORD-1').catch((e: unknown) => e);

    assert.ok(error instanceof PayriffConnectionError);
    assert.equal(error.httpStatus, 0);
  });

  test('timeout raises PayriffConnectionError', async () => {
    server.stub('GET', '/api/v3/orders/ORD-1', { body: { code: '00000' } });
    const client = server.client({ baseUrl: 'http://10.255.255.1', timeout: 50 });

    await assert.rejects(client.orders.get('ORD-1'), PayriffConnectionError);
  });
});