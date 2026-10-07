import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Payriff } from '../src';

describe('client', () => {
  test('appKey is required', () => {
    assert.throws(() => new Payriff({ appKey: '' }), { name: 'TypeError', message: 'appKey is required' });
    assert.throws(() => new Payriff({ appKey: '  ' }), { name: 'TypeError', message: 'appKey is required' });
    assert.throws(() => new Payriff(undefined as never), { name: 'TypeError', message: 'appKey is required' });
  });

  test('timeout must be positive', () => {
    assert.throws(() => new Payriff({ appKey: 'k', timeout: 0 }), RangeError);
  });

  test('exposes all API groups', () => {
    const payriff = new Payriff({ appKey: 'k' });

    for (const group of ['orders', 'payments', 'cards', 'transactions', 'payouts', 'invoices'] as const) {
      assert.ok(payriff[group], group);
    }
  });
});