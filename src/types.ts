export type Currency = 'AZN' | 'USD' | 'EUR' | 'PKR' | 'AED' | 'SAR';
export type Language = 'AZ' | 'EN' | 'RU' | 'AR';
export type Operation = 'PURCHASE' | 'PRE_AUTH' | 'COMPLETE' | 'REFUND' | 'REVERSE';
export type AutoPaymentType = 'NONE' | 'DEFAULT' | 'RECURRING';
export type InstallmentProductType = 'BIRKART' | 'ALLBALI' | 'BOLKART' | 'TAMKART';
export type InstallmentPeriod =
  | 'PERIOD' | 'PERIOD_1' | 'PERIOD_2' | 'PERIOD_3' | 'PERIOD_4' | 'PERIOD_5' | 'PERIOD_6'
  | 'PERIOD_7' | 'PERIOD_8' | 'PERIOD_9' | 'PERIOD_10' | 'PERIOD_11' | 'PERIOD_12'
  | 'PERIOD_13' | 'PERIOD_14' | 'PERIOD_15' | 'PERIOD_16' | 'PERIOD_17' | 'PERIOD_18'
  | 'PERIOD_19' | 'PERIOD_20' | 'PERIOD_21' | 'PERIOD_22' | 'PERIOD_23' | 'PERIOD_24';

type Open<T extends string> = T | (string & {});

export type PaymentStatus = Open<
  | 'CREATED' | 'APPROVED' | 'CANCELED' | 'DECLINED' | 'REFUNDED' | 'PREAUTH_APPROVED' | 'EXPIRED'
  | 'REVERSE' | 'PARTIAL_REFUND' | 'PARTIAL' | 'ACCEPTED' | 'REFUND_IN_PROGRESS' | 'CASH' | 'PENDING'
  | 'PREAUTH_EXPIRED' | 'IN_REVIEW'
>;
export type CardSaveStatus = Open<'CREATED' | 'VERIFIED' | 'REVERSED' | 'REVERSE_FAILED' | 'DECLINED' | 'EXPIRED'>;
export type TransferState = Open<'CREATED' | 'IN_PROGRESS' | 'NOT_FOUND' | 'FAIL' | 'SUCCESS' | 'DAILY_PAYOUT_LIMIT_EXCEEDED'>;
export type InvoiceStatus = Open<'PENDING' | 'ERROR' | 'EXPIRED' | 'PARTIAL' | 'COMPLETE' | 'CASH' | 'DECLINED' | 'CANCELED'>;

export interface Installment {
  type: InstallmentProductType;
  period: InstallmentPeriod;
}

export interface CardData {
  pan: string;
  cardHolder: string;
  expiryMonth: string | number;
  expiryYear: string | number;
  cvv: string;
}

export interface CreateOrderParams {
  amount: number;
  currency?: Currency;
  language?: Language;
  operation?: Operation;
  description?: string;
  callbackUrl?: string;
  redirectUrl?: string;
  cardSave?: boolean;
  threeDS?: boolean;
  autoPaymentType?: AutoPaymentType;
  installment?: Installment;
  fullName?: string;
  phoneNumber?: string;
  metadata?: Record<string, string>;
  fields?: Record<string, string>;
  requestRrn?: string;
}

export interface RefundParams {
  orderId: string;
  amount?: number;
  refundReason?: string;
  callbackUrl?: string;
}

export interface CompleteParams {
  orderId: string;
  amount?: number;
  callbackUrl?: string;
}

export interface DirectPayParams {
  amount: number;
  description: string;
  card: CardData;
  operation?: Operation;
  currency?: Currency;
  callbackUrl?: string;
  threeDS?: boolean;
  customFields?: Record<string, string>;
  cardSave?: boolean;
  requestRrn?: string;
}

export interface AutoPayParams {
  cardUuid: string;
  amount: number;
  description: string;
  operation?: Operation;
  currency?: Currency;
  callbackUrl?: string;
  threeDS?: boolean;
  oneClickPayment?: boolean;
  requestRrn?: string;
}

export interface CardSaveParams {
  customerRef: string;
  callbackUrl: string;
  description?: string;
  language?: Language;
  metadata?: Record<string, string>;
  idempotencyKey?: string;
}

export interface PayoutParams {
  transferAmount: number;
  description: string;
  fullName: string;
  finCode: string;
  cardPan?: string;
  bankName?: string;
  cardType?: string;
  requestRrn?: string;
  customerCode?: string;
  voen?: string;
  birthDate?: string;
  callbackUrl?: string;
  idempotencyKey?: string;
}

export interface InvoiceCreateParams {
  amount?: number;
  amountDynamic?: boolean;
  currency?: Currency;
  language?: Language;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  description?: string;
  customMessage?: string;
  expireDate?: Date | string;
  approveUrl?: string;
  cancelUrl?: string;
  declineUrl?: string;
  redirectUrl?: string;
  installmentProductType?: InstallmentProductType;
  installmentPeriod?: number;
  directPay?: boolean;
  sendSms?: boolean;
  sendWhatsapp?: boolean;
  sendEmail?: boolean;
  metadata?: Record<string, string>;
  externalTransactionId?: string;
}

export interface PageParams {
  page?: number;
  size?: number;
}

export interface TransactionFilter extends PageParams {
  orderId?: string;
  rrn?: string;
  status?: PaymentStatus;
  amount?: string;
  description?: string;
  name?: string;
  fullName?: string;
  cardNumber?: string;
  bookingId?: string;
  invoiceCode?: string;
  from?: Date | string;
  to?: Date | string;
}

export interface PayoutFilter extends PageParams {
  rrn?: string;
  status?: TransferState;
  amount?: string;
  description?: string;
  fullName?: string;
  finCode?: string;
  bankSource?: string;
  from?: Date | string;
  to?: Date | string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

export interface CardDetails {
  maskedPan?: string;
  brand?: string;
  uuid?: string;
  cardHolderName?: string;
  phoneNumber?: string;
}

export interface OrderTransaction {
  uuid?: string;
  createdDate?: string;
  status?: string;
  channel?: string;
  channelType?: string;
  requestRrn?: string;
  responseRrn?: string;
  externalRrn?: string;
  pan?: string;
  paymentWay?: string;
  cardDetails?: CardDetails;
  cardUuid?: string;
  recurrenceId?: number;
  responseDescription?: string;
  merchantCategory?: string;
  installment?: Installment;
}

export interface OrderInfo {
  orderId: string;
  externalTransactionId?: string;
  invoiceUuid?: string;
  amount?: number;
  currencyType?: Currency;
  merchantName?: string;
  commission?: number;
  commissionRate?: number;
  paidAmount?: number;
  extraPayment?: number;
  operationType?: Operation;
  paymentStatus?: PaymentStatus;
  auto?: boolean;
  createdDate?: string;
  description?: string;
  metadata?: string;
  idempotencyKey?: string;
  transactions?: OrderTransaction[];
}

export interface CreateOrderResponse {
  orderId: string;
  sessionId?: string;
  paymentUrl?: string;
  previewUrl?: string;
  transactionId?: number;
  commissionRate?: number;
  amount?: number;
  fee?: number;
  totalAmount?: number;
}

export interface DirectPayResponse {
  orderId: string;
  threeDS?: boolean;
  redirect?: boolean;
  redirectUrl?: string;
  paymentUrl?: string;
  transactionResponse?: OrderTransaction;
}

export interface TransactionResponse {
  redirect?: boolean;
  redirectUrl?: string;
  threeDS?: boolean;
  accessUrl?: string;
  channel?: string;
  transactionResult?: DirectPayResponse;
}

export interface AutoPayResponse {
  orderId: string;
  paymentUrl?: string;
  description?: string;
  amount?: number;
  commission?: number;
  commissionRate?: number;
  currencyType?: Currency;
  operationType?: Operation;
  paymentStatus?: PaymentStatus;
  auto?: boolean;
  createdDate?: string;
  transactions?: OrderTransaction[];
  transactionResponseDto?: TransactionResponse;
}

export interface CardSaveResponse {
  cardSaveId: string;
  orderId?: string;
  sessionId?: string;
  paymentUrl?: string;
  amount?: number;
  currency?: Currency;
  status?: CardSaveStatus;
}

export interface CardSaveDetails {
  cardSaveId: string;
  orderId?: string;
  status?: CardSaveStatus;
  cardUuid?: string;
  maskedPan?: string;
  cardBrand?: string;
  amount?: number;
  currency?: Currency;
  customerRef?: string;
  createdDate?: string;
  verifiedDate?: string;
}

export interface SavedCard {
  cardUuid: string;
  maskedPan?: string;
  cardBrand?: string;
  createdDate?: string;
}

export interface Transaction {
  id?: number;
  applicationId?: number;
  orderId?: string;
  sessionId?: string;
  uuid?: string;
  rrn?: string;
  externalRrn?: string;
  amount?: number;
  paidAmount?: number;
  refundAmount?: number;
  restOfAmount?: number;
  amountWithoutFee?: number;
  payriffAmount?: number;
  commissionRate?: number;
  extraPayment?: number;
  currencyType?: Currency;
  paymentStatus?: PaymentStatus;
  paymentSource?: string;
  description?: string;
  responseDescription?: string;
  orderLanguage?: Language;
  tariffType?: string;
  source?: string;
  fullName?: string;
  phoneNumber?: string;
  bookingId?: string;
  invoiceCode?: string;
  pan?: string;
  cardBrand?: string;
  paymentRoute?: string;
  paymentWay?: string;
  transitId?: string;
  createdDate?: string;
  lastModifiedDate?: string;
}

export interface PayoutResult {
  finalState?: string;
  state?: string;
  stateDescription?: string;
  currentDepositBalance?: number;
  walletHistoryId?: number;
  bankName?: string;
}

export interface PayoutStatus {
  bankName?: string;
  state?: TransferState;
  cardPan?: string;
  transferAmount?: number;
  createdDate?: string;
  formattedDate?: string;
  transferType?: string;
  merchant?: string;
  description?: string;
  fullName?: string;
  finCode?: string;
}

export interface PayoutSummary {
  id?: number;
  requestRrn?: string;
  transferAmount?: number;
  amountWithFee?: number;
  fee?: number;
  createdDate?: string;
  state?: TransferState;
  stateDescription?: string;
  cardPan?: string;
  finCode?: string;
  fullName?: string;
  description?: string;
}

export interface Invoice {
  id?: number;
  merchantId?: string;
  uuid?: string;
  invoiceUuid: string;
  invoiceCode?: string;
  invoiceStatus?: InvoiceStatus;
  paymentUrl?: string;
  amount?: number;
  totalAmount?: number;
  payriffAmount?: number;
  payriffFee?: number;
  payriffFixedFeeAmount?: number;
  currencyType?: Currency;
  languageType?: Language;
  paymentType?: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  description?: string;
  customMessage?: string;
  expireDate?: string;
  createdDate?: string;
  approveURL?: string;
  cancelURL?: string;
  declineURL?: string;
  active?: boolean;
  sendSms?: boolean;
}

export interface InvoiceDetails {
  id?: number;
  merchantId?: string;
  uuid?: string;
  invoiceUuid: string;
  invoiceCode?: string;
  invoiceStatus?: InvoiceStatus;
  baseUrl?: string;
  amount?: number;
  totalAmount?: number;
  payriffAmount?: number;
  payriffFee?: number;
  payriffFixedFeeAmount?: number;
  currencyType?: Currency;
  languageType?: Language;
  paymentType?: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  description?: string;
  expireDate?: string;
  paymentDay?: string;
  expireDay?: string;
  createdDate?: string;
  approveURL?: string;
  cancelURL?: string;
  declineURL?: string;
  active?: boolean;
  installmentPeriod?: number;
  source?: string;
  directPay?: boolean;
  metadata?: string;
}