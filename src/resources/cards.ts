import type { Transport } from '../transport';
import type { CardSaveDetails, CardSaveParams, CardSaveResponse, SavedCard } from '../types';
import { compact, nonEmpty, pathSegment, required } from '../util';

export class CardsApi {
  constructor(private readonly transport: Transport) {}

  async save(params: CardSaveParams): Promise<CardSaveResponse> {
    required(params, 'params');
    return this.transport.execute({
      method: 'POST',
      path: '/api/v3/cards/save',
      headers: { 'X-Idempotency-Key': params.idempotencyKey },
      body: compact({
        customerRef: required(params.customerRef, 'customerRef'),
        callbackUrl: required(params.callbackUrl, 'callbackUrl'),
        description: params.description,
        language: params.language,
        metadata: nonEmpty(params.metadata),
      }),
    });
  }

  async getSave(cardSaveId: string): Promise<CardSaveDetails> {
    return this.transport.execute({ method: 'GET', path: `/api/v3/cards/save/${pathSegment(cardSaveId, 'cardSaveId')}` });
  }

  async list(customerRef: string): Promise<SavedCard[]> {
    pathSegment(customerRef, 'customerRef');
    const cards = await this.transport.execute<SavedCard[] | undefined>({
      method: 'GET',
      path: '/api/v3/cards/save',
      query: { customerRef },
    });
    return cards ?? [];
  }

  async delete(cardUuid: string): Promise<void> {
    await this.transport.execute({ method: 'DELETE', path: `/api/v3/cards/${pathSegment(cardUuid, 'cardUuid')}` });
  }
}