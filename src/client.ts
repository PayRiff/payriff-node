import { CardEncryptor, PRODUCTION_CARD_ENCRYPTION_KEY, parsePublicKey } from './card';
import { CardsApi } from './resources/cards';
import { InvoicesApi } from './resources/invoices';
import { OrdersApi } from './resources/orders';
import { PaymentsApi } from './resources/payments';
import { PayoutsApi } from './resources/payouts';
import { TransactionsApi } from './resources/transactions';
import { Transport } from './transport';

export interface PayriffOptions {
  appKey: string;
  merchantId?: string;
  timeout?: number;
  cardEncryptionKey?: string;
  baseUrl?: string;
}

const PRODUCTION_URL = 'https://api.payriff.com';

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
    const transport = new Transport({
      baseUrl: options.baseUrl ?? PRODUCTION_URL,
      appKey: options.appKey,
      merchantId: options.merchantId,
      timeout,
    });
    const cardEncryptor = new CardEncryptor(parsePublicKey(options.cardEncryptionKey ?? PRODUCTION_CARD_ENCRYPTION_KEY));
    this.orders = new OrdersApi(transport);
    this.payments = new PaymentsApi(transport, cardEncryptor);
    this.cards = new CardsApi(transport);
    this.transactions = new TransactionsApi(transport);
    this.payouts = new PayoutsApi(transport);
    this.invoices = new InvoicesApi(transport);
  }
}