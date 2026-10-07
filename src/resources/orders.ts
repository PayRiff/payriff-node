import type { Transport } from '../transport';
import type { CompleteParams, CreateOrderParams, CreateOrderResponse, OrderInfo, RefundParams } from '../types';
import { compact, nonEmpty, pathSegment, required } from '../util';

export class OrdersApi {
  constructor(private readonly transport: Transport) {}

  async create(params: CreateOrderParams): Promise<CreateOrderResponse> {
    required(params, 'params');
    const body = compact({
      amount: required(params.amount, 'amount'),
      currency: params.currency ?? 'AZN',
      language: params.language,
      operation: params.operation ?? 'PURCHASE',
      description: params.description,
      callbackUrl: params.callbackUrl,
      redirectUrl: params.redirectUrl,
      cardSave: params.cardSave,
      threeDS: params.threeDS,
      autoPaymentType: params.autoPaymentType,
      installment: params.installment,
      fullName: params.fullName,
      phoneNumber: params.phoneNumber,
      metadata: nonEmpty(params.metadata),
      fields: nonEmpty(params.fields),
    });
    const raw = await this.transport.execute<Record<string, unknown> | undefined>({
      method: 'POST',
      path: '/api/v3/orders',
      headers: { 'X-REQUEST-RRN': params.requestRrn },
      body,
    });
    if (!raw) return raw as unknown as CreateOrderResponse;
    const { comissionRate, ...rest } = raw;
    return compact({ ...rest, commissionRate: rest.commissionRate ?? comissionRate }) as unknown as CreateOrderResponse;
  }

  async get(orderId: string): Promise<OrderInfo> {
    return this.transport.execute({ method: 'GET', path: `/api/v3/orders/${pathSegment(orderId, 'orderId')}` });
  }

  async getStatus(orderId: string): Promise<OrderInfo> {
    return this.transport.execute({ method: 'GET', path: `/api/v3/orders/${pathSegment(orderId, 'orderId')}/status` });
  }

  async getByRequestRrn(requestRrn: string): Promise<OrderInfo> {
    return this.transport.execute({ method: 'GET', path: `/api/v3/orders/${pathSegment(requestRrn, 'requestRrn')}/rrn` });
  }

  async expire(orderId: string): Promise<void> {
    pathSegment(orderId, 'orderId');
    await this.transport.execute({ method: 'PATCH', path: '/api/v3/expire-status', query: { orderId } });
  }

  async refund(params: RefundParams): Promise<void> {
    required(params, 'params');
    await this.transport.execute({
      method: 'POST',
      path: '/api/v3/refund',
      body: compact({
        orderId: required(params.orderId, 'orderId'),
        amount: params.amount,
        refundReason: params.refundReason,
        callbackUrl: params.callbackUrl,
      }),
    });
  }

  async complete(params: CompleteParams): Promise<void> {
    required(params, 'params');
    await this.transport.execute({
      method: 'POST',
      path: '/api/v3/complete',
      body: compact({
        orderId: required(params.orderId, 'orderId'),
        amount: params.amount,
        callbackUrl: params.callbackUrl,
      }),
    });
  }

  async downloadReceipt(orderIdOrRrn: string): Promise<Buffer> {
    return this.transport.download({
      method: 'GET',
      path: `/api/v3/acquiring/receipt/${pathSegment(orderIdOrRrn, 'orderIdOrRrn')}`,
    });
  }
}