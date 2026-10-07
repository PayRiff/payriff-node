import type { OrderInfo } from './types';

const NOT_A_CALLBACK = 'Not a Payriff order callback';

export function parseOrderCallback(body: string | Buffer | object): OrderInfo {
  let root: unknown = body;
  if (typeof body === 'string' || Buffer.isBuffer(body)) {
    try {
      root = JSON.parse(body.toString());
    } catch (e) {
      throw new TypeError(NOT_A_CALLBACK, { cause: e });
    }
  }
  const payload = isObject(root) ? root.payload : undefined;
  if (!isObject(payload) || payload.orderId === undefined || payload.orderId === null) {
    throw new TypeError(NOT_A_CALLBACK);
  }
  return payload as unknown as OrderInfo;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}