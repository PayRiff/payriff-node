import assert from 'node:assert/strict';
import { constants, createDecipheriv, generateKeyPairSync, privateDecrypt } from 'node:crypto';
import { describe, test } from 'node:test';
import { Payriff } from '../src';
import { CardEncryptor, normalizeCard, parsePublicKey, PRODUCTION_CARD_ENCRYPTION_KEY } from '../src/card';

const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });

function decrypt(encryptedMessage: string, secretKey: string): string {
  const keyAndIv = privateDecrypt(
    { key: privateKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    Buffer.from(secretKey, 'base64'),
  );
  assert.equal(keyAndIv.length, 44);
  const data = Buffer.from(encryptedMessage, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', keyAndIv.subarray(0, 32), keyAndIv.subarray(32));
  decipher.setAuthTag(data.subarray(data.length - 16));
  return Buffer.concat([decipher.update(data.subarray(0, data.length - 16)), decipher.final()]).toString('utf8');
}

const card = { pan: '4169 7413 3015 1979', cardHolder: ' JOHN DOE ', expiryMonth: '1', expiryYear: '27', cvv: '123' };

describe('card encryption', () => {
  test('encrypted card decrypts with the Payriff scheme', () => {
    const encryptor = new CardEncryptor(publicKey);

    const encrypted = encryptor.encrypt(normalizeCard(card));

    assert.equal(
      decrypt(encrypted.encryptedMessage, encrypted.secretKey),
      '{"pan":"4169741330151979","cardHolder":"JOHN DOE","expiryYear":"2027","expiryMonth":"01","cvv":"123"}',
    );
  });

  test('every call uses fresh key material', () => {
    const encryptor = new CardEncryptor(publicKey);

    const a = encryptor.encrypt(normalizeCard(card));
    const b = encryptor.encrypt(normalizeCard(card));

    assert.notEqual(a.encryptedMessage, b.encryptedMessage);
    assert.notEqual(a.secretKey, b.secretKey);
  });

  test('parses base64 and PEM keys', () => {
    const pem = `-----BEGIN PUBLIC KEY-----\n${PRODUCTION_CARD_ENCRYPTION_KEY.match(/.{1,64}/g)!.join('\n')}\n-----END PUBLIC KEY-----\n`;

    assert.equal(parsePublicKey(PRODUCTION_CARD_ENCRYPTION_KEY).asymmetricKeyDetails?.modulusLength, 2048);
    assert.equal(parsePublicKey(pem).asymmetricKeyDetails?.modulusLength, 2048);
  });

  test('rejects invalid encryption key', () => {
    assert.throws(() => new Payriff({ appKey: 'k', cardEncryptionKey: 'not-a-key' }), { name: 'TypeError', message: 'Invalid RSA public key' });
  });
});

describe('card data', () => {
  test('normalizes input', () => {
    assert.deepEqual(normalizeCard({ pan: '4169-7413-3015-1979', cardHolder: 'JOHN DOE', expiryMonth: 11, expiryYear: 2027, cvv: '1234' }), {
      pan: '4169741330151979',
      cardHolder: 'JOHN DOE',
      expiryYear: '2027',
      expiryMonth: '11',
      cvv: '1234',
    });
  });

  const invalid: Array<[Partial<typeof card>, string]> = [
    [{ pan: '4169' }, 'pan must contain 12-19 digits'],
    [{ pan: '4169741330151979000000' }, 'pan must contain 12-19 digits'],
    [{ pan: '4169a41330151979' }, 'pan must contain digits only'],
    [{ expiryMonth: '13' }, 'expiryMonth must be 1-12'],
    [{ expiryMonth: '0' }, 'expiryMonth must be 1-12'],
    [{ expiryYear: '202' }, 'expiryYear must have 2 or 4 digits'],
    [{ cvv: '12' }, 'cvv must contain 3-4 digits'],
    [{ cvv: undefined }, 'cvv is required'],
    [{ cardHolder: undefined }, 'cardHolder is required'],
  ];
  for (const [override, message] of invalid) {
    test(`rejects ${message}`, () => {
      assert.throws(() => normalizeCard({ ...card, ...override } as typeof card), { name: 'TypeError', message });
    });
  }
});