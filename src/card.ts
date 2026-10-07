import { constants, createCipheriv, createPublicKey, publicEncrypt, randomBytes, type KeyObject } from 'node:crypto';
import type { CardData } from './types';
import { required } from './util';

export const PRODUCTION_CARD_ENCRYPTION_KEY =
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxRq5a+44T6Dac60XmVRQ/7cpPyFsBnamXbJlRVJk8CnES5Re5tVMohyD0hZr'
  + '3zcQj+bxodYB4zZpQTPlrXvFBC3zz+rXnGlevxBQ6W2d3QC9q8vWH8p3ZOwTO3qVvDSHH9o+hMMRNbJ7kueq/KZlX/F+bjZ23CZw7iXE'
  + 'GQT3HYVYnnHsvpaguYDteWBag2sPPLLsVjeB3zhTfQ7OsWp5XTkDuRwLugHPvs6RHLcwGCnodukWyvwUaEUQR/kMGC+RbMsAIVkcLMP5'
  + 'csfR3Xo7Gi98+i44iLN00f7gE8QvEmvv8xDspyTAjDEL1a5gK7TijJ3yLG/Bwa1rr1uskYy7lwIDAQAB';

const AES_KEY_BYTES = 32;
const IV_BYTES = 12;

export interface NormalizedCard {
  pan: string;
  cardHolder: string;
  expiryYear: string;
  expiryMonth: string;
  cvv: string;
}

export interface EncryptedCard {
  encryptedMessage: string;
  secretKey: string;
}

export function parsePublicKey(base64OrPem: string): KeyObject {
  const body = base64OrPem
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\s/g, '');
  try {
    const key = createPublicKey({ key: Buffer.from(body, 'base64'), format: 'der', type: 'spki' });
    if (key.asymmetricKeyType !== 'rsa') throw new Error('not an RSA key');
    return key;
  } catch (e) {
    throw new TypeError('Invalid RSA public key', { cause: e });
  }
}

export function normalizeCard(card: CardData): NormalizedCard {
  required(card, 'card');
  const pan = digits(card.pan, 'pan');
  if (pan.length < 12 || pan.length > 19) throw new TypeError('pan must contain 12-19 digits');
  const cardHolder = required(card.cardHolder, 'cardHolder').trim();
  const expiryMonth = month(card.expiryMonth);
  const expiryYear = year(card.expiryYear);
  const cvv = digits(card.cvv, 'cvv');
  if (cvv.length < 3 || cvv.length > 4) throw new TypeError('cvv must contain 3-4 digits');
  return { pan, cardHolder, expiryYear, expiryMonth, cvv };
}

function digits(value: string | number | undefined, field: string): string {
  const v = String(required(value, field)).replace(/[\s-]/g, '');
  if (!/^\d+$/.test(v)) throw new TypeError(`${field} must contain digits only`);
  return v;
}

function month(value: string | number): string {
  const m = Number(digits(value, 'expiryMonth'));
  if (m < 1 || m > 12) throw new TypeError('expiryMonth must be 1-12');
  return String(m).padStart(2, '0');
}

function year(value: string | number): string {
  const y = digits(value, 'expiryYear');
  if (y.length === 2) return `20${y}`;
  if (y.length !== 4) throw new TypeError('expiryYear must have 2 or 4 digits');
  return y;
}

export class CardEncryptor {
  constructor(private readonly publicKey: KeyObject) {}

  encrypt(card: NormalizedCard): EncryptedCard {
    const aesKey = randomBytes(AES_KEY_BYTES);
    const iv = randomBytes(IV_BYTES);
    const keyAndIv = Buffer.concat([aesKey, iv]);
    const plaintext = Buffer.from(JSON.stringify(card), 'utf8');
    try {
      const cipher = createCipheriv('aes-256-gcm', aesKey, iv);
      const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);
      const secret = publicEncrypt(
        { key: this.publicKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
        keyAndIv,
      );
      return { encryptedMessage: ciphertext.toString('base64'), secretKey: secret.toString('base64') };
    } finally {
      aesKey.fill(0);
      iv.fill(0);
      keyAndIv.fill(0);
      plaintext.fill(0);
    }
  }
}