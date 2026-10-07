import type { Transport } from '../transport';
import type { Page, Transaction, TransactionFilter } from '../types';
import { formatFilterDate } from '../util';
import { pageQuery } from './paging';

export class TransactionsApi {
  constructor(private readonly transport: Transport) {}

  async list(filter: TransactionFilter = {}): Promise<Page<Transaction>> {
    const page = await this.transport.execute<Page<Record<string, unknown>> | undefined>({
      method: 'GET',
      path: '/api/v3/transactions',
      query: {
        orderId: filter.orderId,
        rrn: filter.rrn,
        status: filter.status,
        amount: filter.amount,
        description: filter.description,
        name: filter.name,
        fullName: filter.fullName,
        cardNumber: filter.cardNumber,
        bookingId: filter.bookingId,
        invoiceCode: filter.invoiceCode,
        from: formatFilterDate(filter.from, 'from'),
        to: formatFilterDate(filter.to, 'to'),
        ...pageQuery(filter),
      },
    });
    if (!page) return page as unknown as Page<Transaction>;
    return { ...page, content: (page.content ?? []).map(toTransaction) };
  }
}

function toTransaction(raw: Record<string, unknown>): Transaction {
  const { extra_payment, card_brand, payment_route, payment_way, ...rest } = raw;
  const renamed: Record<string, unknown> = { extraPayment: extra_payment, cardBrand: card_brand, paymentRoute: payment_route, paymentWay: payment_way };
  for (const [key, value] of Object.entries(renamed)) {
    if (value !== undefined && rest[key] === undefined) rest[key] = value;
  }
  return rest as Transaction;
}