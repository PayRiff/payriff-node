export class PayriffError extends Error {
  readonly httpStatus: number;
  readonly code: string | undefined;
  readonly responseId: string | undefined;

  constructor(message: string, httpStatus: number, code?: string, responseId?: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
    this.httpStatus = httpStatus;
    this.code = code;
    this.responseId = responseId;
  }
}

export class ApiError extends PayriffError {}

export class AuthenticationError extends ApiError {}

export class ValidationError extends ApiError {}

export class RequestRejectedError extends ApiError {}

export class InsufficientBalanceError extends ApiError {}

export class PayoutLimitError extends ApiError {}

export class PayriffConnectionError extends PayriffError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, 0, undefined, undefined, options);
  }
}

export const SUCCESS_CODE = '00000';

const AUTH_CODES = new Set(['14010', '14013', '14014', '14015']);
const PAYOUT_LIMIT_CODES = new Set(['01300', '01400', '01500']);

export function toApiError(message: string | undefined, httpStatus: number, code?: string, responseId?: string): ApiError {
  const msg = message ? message : `Payriff request failed (HTTP ${httpStatus})`;
  if (code !== undefined) {
    if (AUTH_CODES.has(code)) return new AuthenticationError(msg, httpStatus, code, responseId);
    if (PAYOUT_LIMIT_CODES.has(code)) return new PayoutLimitError(msg, httpStatus, code, responseId);
    switch (code) {
      case '01200':
        return new InsufficientBalanceError(msg, httpStatus, code, responseId);
      case '01000':
        return new RequestRejectedError(msg, httpStatus, code, responseId);
      case '15400':
        return new ValidationError(msg, httpStatus, code, responseId);
    }
  }
  if (httpStatus === 401 || httpStatus === 403) return new AuthenticationError(msg, httpStatus, code, responseId);
  if (httpStatus === 400) return new ValidationError(msg, httpStatus, code, responseId);
  return new ApiError(msg, httpStatus, code, responseId);
}