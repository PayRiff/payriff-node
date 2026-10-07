import { normalizeCard, type CardEncryptor } from '../card';
import type { Transport } from '../transport';
import type { AutoPayParams, AutoPayResponse, DirectPayParams, DirectPayResponse } from '../types';
import { compact, nonEmpty, required } from '../util';

export class PaymentsApi {
  constructor(private readonly transport: Transport, private readonly cardEncryptor: CardEncryptor) {}

  async directPay(params: DirectPayParams): Promise<DirectPayResponse> {
    required(params, 'params');
    const body = compact({
      amount: required(params.amount, 'amount'),
      operation: params.operation ?? 'PURCHASE',
      currency: params.currency ?? 'AZN',
      description: required(params.description, 'description'),
      callbackUrl: params.callbackUrl,
      threeDS: params.threeDS,
      customFields: nonEmpty(params.customFields),
    });
    const encrypted = this.cardEncryptor.encrypt(normalizeCard(params.card));
    body.paymentData = {
      paymentWay: 'DIRECT',
      encryptedMessage: encrypted.encryptedMessage,
      cardSave: params.cardSave ?? false,
    };
    return this.transport.execute({
      method: 'POST',
      path: '/api/v3/directPay',
      headers: { 'X-REQUEST-RRN': params.requestRrn, 'x-secret-key': encrypted.secretKey },
      body,
    });
  }

  async autoPay(params: AutoPayParams): Promise<AutoPayResponse> {
    required(params, 'params');
    return this.transport.execute({
      method: 'POST',
      path: '/api/v3/autoPay',
      headers: { 'X-REQUEST-RRN': params.requestRrn },
      body: compact({
        cardUuid: required(params.cardUuid, 'cardUuid'),
        amount: required(params.amount, 'amount'),
        operation: params.operation ?? 'PURCHASE',
        currency: params.currency ?? 'AZN',
        description: required(params.description, 'description'),
        callbackUrl: params.callbackUrl,
        threeDS: params.threeDS,
        isOneCLickPayment: params.oneClickPayment,
      }),
    });
  }
}