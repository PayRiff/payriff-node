import type { Transport } from '../transport';
import type { Page, PayoutFilter, PayoutParams, PayoutResult, PayoutStatus, PayoutSummary } from '../types';
import { compact, formatFilterDate, pathSegment, required } from '../util';
import { pageQuery } from './paging';

export class PayoutsApi {
  constructor(private readonly transport: Transport) {}

  async create(params: PayoutParams): Promise<PayoutResult> {
    required(params, 'params');
    const transferAmount = required(params.transferAmount, 'transferAmount');
    if (transferAmount < 1) throw new RangeError('transferAmount must be at least 1');
    const raw = await this.transport.execute<Record<string, unknown> | undefined>({
      method: 'POST',
      path: '/api/v3/payout',
      headers: { 'X-IDEMPOTENCY-KEY': params.idempotencyKey },
      merchantEnvelope: true,
      body: compact({
        transferAmount,
        description: required(params.description, 'description'),
        fullName: required(params.fullName, 'fullName'),
        finCode: required(params.finCode, 'finCode'),
        cardPan: params.cardPan,
        bankName: params.bankName,
        cardType: params.cardType,
        requestRrn: params.requestRrn,
        customerCode: params.customerCode,
        voen: params.voen,
        birthDate: params.birthDate,
        callbackUrl: params.callbackUrl,
      }),
    });
    if (!raw) return raw as unknown as PayoutResult;
    const { _final, ...rest } = raw;
    return compact({ finalState: _final, ...rest }) as PayoutResult;
  }

  async getByRequestRrn(requestRrn: string): Promise<PayoutStatus> {
    return this.transport.execute({ method: 'GET', path: `/api/v3/payout/info/${pathSegment(requestRrn, 'requestRrn')}` });
  }

  async checkCardholder(cardPan: string): Promise<string> {
    const pan = String(required(cardPan, 'cardPan')).replace(/[\s-]/g, '');
    if (!/^\d{16}$/.test(pan)) throw new TypeError('cardPan must be a 16-digit number');
    return this.transport.execute({ method: 'POST', path: '/api/v3/payout/check-cardholder', body: { cardPan: pan } });
  }

  async list(filter: PayoutFilter = {}): Promise<Page<PayoutSummary>> {
    return this.transport.execute({
      method: 'GET',
      path: '/api/v3/payouts',
      query: {
        rrn: filter.rrn,
        status: filter.status,
        amount: filter.amount,
        description: filter.description,
        fullName: filter.fullName,
        finCode: filter.finCode,
        bankSource: filter.bankSource,
        from: formatFilterDate(filter.from, 'from'),
        to: formatFilterDate(filter.to, 'to'),
        ...pageQuery(filter),
      },
    });
  }

  async downloadReceipt(requestRrn: string): Promise<Buffer> {
    return this.transport.download({ method: 'GET', path: `/api/v3/payout/receipt/${pathSegment(requestRrn, 'requestRrn')}` });
  }
}