import { CardsApi } from './resources/cards';
import { InvoicesApi } from './resources/invoices';
import { OrdersApi } from './resources/orders';
import { PaymentsApi } from './resources/payments';
import { PayoutsApi } from './resources/payouts';
import { TransactionsApi } from './resources/transactions';
import { Transport } from './transport';
import type { Currency, Region } from './types';

export interface PayriffOptions {
  appKey: string;
  merchantId?: string;
  timeout?: number;
  region?: Region;
  baseUrl?: string;
}

const REGIONS: Record<Region, { baseUrl: string; currency: Currency }> = {
  azerbaijan: { baseUrl: 'https://api.payriff.com', currency: 'AZN' },
  saudi: { baseUrl: 'https://api.gccpay.sa', currency: 'SAR' },
};

export class Payriff {
  readonly orders: OrdersApi;
  readonly payments: PaymentsApi;
  readonly cards: CardsApi;
  readonly transactions: TransactionsApi;
  readonly payouts: PayoutsApi;
  readonly invoices: InvoicesApi;

  constructor(options: PayriffOptions) {
    if (!options || typeof options.appKey !== 'string' || options.appKey.trim() === '') {
      throw new TypeError('appKey is required');
    }
    const timeout = options.timeout ?? 60_000;
    if (!Number.isFinite(timeout) || timeout <= 0) throw new RangeError('timeout must be a positive number of milliseconds');
    const regionName = options.region ?? 'azerbaijan';
    if (!Object.hasOwn(REGIONS, regionName)) throw new RangeError(`unknown region: ${regionName}`);
    const region = REGIONS[regionName];
    const transport = new Transport({
      baseUrl: options.baseUrl ?? region.baseUrl,
      appKey: options.appKey,
      merchantId: options.merchantId,
      timeout,
    });
    this.orders = new OrdersApi(transport, region.currency);
    this.payments = new PaymentsApi(transport, region.currency);
    this.cards = new CardsApi(transport);
    this.transactions = new TransactionsApi(transport);
    this.payouts = new PayoutsApi(transport);
    this.invoices = new InvoicesApi(transport, region.currency);
  }
}