import assert from 'node:assert/strict';
import { constants, createDecipheriv, generateKeyPairSync, privateDecrypt } from 'node:crypto';
import { after, before, beforeEach, describe, test } from 'node:test';
import { MockServer } from './mock-server';

const server = new MockServer();
before(() => server.start());
after(() => server.stop());
beforeEach(() => server.reset());

const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicKeyBase64 = publicKey.export({ format: 'der', type: 'spki' }).toString('base64');

function decrypt(secretKey: string, encryptedMessage: string): any {
  const keyAndIv = privateDecrypt(
    { key: privateKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    Buffer.from(secretKey, 'base64'),
  );
  const data = Buffer.from(encryptedMessage, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', keyAndIv.subarray(0, 32), keyAndIv.subarray(32, 44));
  decipher.setAuthTag(data.subarray(data.length - 16));
  return JSON.parse(Buffer.concat([decipher.update(data.subarray(0, data.length - 16)), decipher.final()]).toString());
}

describe('payments', () => {
  test('directPay encrypts card and sends secret key', async () => {
    server.ok('POST', '/api/v3/directPay', {
      orderId: 'ORD-1', threeDS: true, redirect: true, redirectUrl: 'https://acs.bank/3ds',
      transactionResponse: { status: 'CREATED', requestRrn: 'req-1' },
    });

    const response = await server.client({ cardEncryptionKey: publicKeyBase64 }).payments.directPay({
      amount: 1,
      description: 'Order #1',
      callbackUrl: 'https://shop.az/cb',
      cardSave: true,
      requestRrn: 'rrn-1',
      card: { pan: '4169741330151979', cardHolder: 'JOHN DOE', expiryMonth: '11', expiryYear: '2027', cvv: '123' },
    });

    const sent = server.last;
    assert.equal(sent.headers.authorization, 'app-key');
    assert.equal(sent.headers['x-request-rrn'], 'rrn-1');
    assert.doesNotMatch(sent.body, /4169741330151979|JOHN DOE/);
    const { paymentData, ...body } = sent.json();
    assert.deepEqual(body, { amount: 1, operation: 'PURCHASE', currency: 'AZN', description: 'Order #1', callbackUrl: 'https://shop.az/cb' });
    assert.equal(paymentData.paymentWay, 'DIRECT');
    assert.equal(paymentData.cardSave, true);
    assert.deepEqual(decrypt(sent.headers['x-secret-key'] as string, paymentData.encryptedMessage), {
      pan: '4169741330151979', cardHolder: 'JOHN DOE', expiryYear: '2027', expiryMonth: '11', cvv: '123',
    });
    assert.equal(response.orderId, 'ORD-1');
    assert.equal(response.redirect, true);
    assert.equal(response.redirectUrl, 'https://acs.bank/3ds');
    assert.equal(response.transactionResponse?.status, 'CREATED');
  });

  test('directPay validates card before sending', async () => {
    const client = server.client({ cardEncryptionKey: publicKeyBase64 });

    await assert.rejects(
      client.payments.directPay({ amount: 1, description: 'x', card: { pan: '4169', cardHolder: 'A', expiryMonth: 1, expiryYear: 27, cvv: '123' } }),
      { name: 'TypeError', message: 'pan must contain 12-19 digits' },
    );
    assert.equal(server.requests.length, 0);
  });

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