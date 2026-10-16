import type { Transport } from '../transport';
import type { AutoPayParams, AutoPayResponse, Currency } from '../types';
import { compact, required } from '../util';

export class PaymentsApi {
  constructor(private readonly transport: Transport, private readonly defaultCurrency: Currency) {}

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
        currency: params.currency ?? this.defaultCurrency,
        description: required(params.description, 'description'),
        callbackUrl: params.callbackUrl,
        threeDS: params.threeDS,
        isOneCLickPayment: params.oneClickPayment,
      }),
    });
  }
}