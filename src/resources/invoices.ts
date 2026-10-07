import type { Transport } from '../transport';
import type { Invoice, InvoiceCreateParams, InvoiceDetails } from '../types';
import { compact, formatDateTime, nonEmpty, pathSegment, required } from '../util';

export class InvoicesApi {
  constructor(private readonly transport: Transport) {}

  async create(params: InvoiceCreateParams): Promise<Invoice> {
    required(params, 'params');
    if (params.amountDynamic !== true && (params.amount === undefined || params.amount === null)) {
      throw new TypeError('amount is required');
    }
    return this.transport.execute({
      method: 'POST',
      path: '/api/v2/invoices',
      merchantEnvelope: true,
      body: compact({
        amount: params.amount,
        amountDynamic: params.amountDynamic,
        currencyType: params.currency ?? 'AZN',
        languageType: params.language,
        fullName: params.fullName,
        email: params.email,
        phoneNumber: params.phoneNumber,
        description: params.description,
        customMessage: params.customMessage,
        expireDate: formatDateTime(params.expireDate),
        approveURL: params.approveUrl,
        cancelURL: params.cancelUrl,
        declineURL: params.declineUrl,
        redirectURL: params.redirectUrl,
        installmentProductType: params.installmentProductType,
        installmentPeriod: params.installmentPeriod,
        directPay: params.directPay,
        sendSms: params.sendSms,
        sendWhatsapp: params.sendWhatsapp,
        sendEmail: params.sendEmail,
        metadata: nonEmpty(params.metadata),
        externalTransactionId: params.externalTransactionId,
      }),
    });
  }

  async get(invoiceUuid: string): Promise<InvoiceDetails> {
    pathSegment(invoiceUuid, 'invoiceUuid');
    return this.transport.execute({
      method: 'POST',
      path: '/api/v2/get-invoice',
      merchantEnvelope: true,
      body: { uuid: invoiceUuid },
    });
  }
}