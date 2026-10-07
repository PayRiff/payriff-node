import { ApiError, PayriffConnectionError, SUCCESS_CODE, toApiError } from './errors';
import { VERSION } from './version';

export type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export interface ApiRequest {
  method: Method;
  path: string;
  query?: Record<string, string | number | undefined>;
  headers?: Record<string, string | undefined>;
  body?: unknown;
  merchantEnvelope?: boolean;
}

export interface TransportOptions {
  baseUrl: string;
  appKey: string;
  merchantId?: string;
  timeout: number;
}

const USER_AGENT = `payriff-node/${VERSION}`;
const MAX_ERROR_BODY = 500;

export class Transport {
  private readonly baseUrl: string;

  constructor(private readonly options: TransportOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
  }

  async execute<T>(request: ApiRequest): Promise<T> {
    const response = await this.send(request, 'application/json');
    return this.unwrap<T>(response.status, await this.readText(response));
  }

  async download(request: ApiRequest): Promise<Buffer> {
    const response = await this.send(request, 'application/pdf, application/json');
    if (response.status >= 200 && response.status < 300) {
      try {
        return Buffer.from(await response.arrayBuffer());
      } catch (e) {
        throw new PayriffConnectionError(`Payriff request failed: ${(e as Error).message}`, { cause: e });
      }
    }
    this.unwrap(response.status, await this.readText(response));
    throw new ApiError('Unexpected response', response.status);
  }

  private async send(request: ApiRequest, accept: string): Promise<Response> {
    const headers: Record<string, string> = {
      Accept: accept,
      'User-Agent': USER_AGENT,
      Authorization: this.options.appKey,
    };
    for (const [name, value] of Object.entries(request.headers ?? {})) {
      if (value !== undefined) headers[name] = value;
    }
    const body = this.requestBody(request);
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    try {
      return await fetch(this.url(request), {
        method: request.method,
        headers,
        body,
        redirect: 'manual',
        signal: AbortSignal.timeout(this.options.timeout),
      });
    } catch (e) {
      throw new PayriffConnectionError(`Payriff request failed: ${(e as Error).message}`, { cause: e });
    }
  }

  private async readText(response: Response): Promise<string> {
    try {
      return await response.text();
    } catch (e) {
      throw new PayriffConnectionError(`Payriff request failed: ${(e as Error).message}`, { cause: e });
    }
  }

  private url(request: ApiRequest): string {
    const params = new URLSearchParams();
    for (const [name, value] of Object.entries(request.query ?? {})) {
      if (value !== undefined) params.append(name, String(value));
    }
    const query = params.toString().replace(/\+/g, '%20');
    return this.baseUrl + request.path + (query ? `?${query}` : '');
  }

  private requestBody(request: ApiRequest): string | undefined {
    if (request.merchantEnvelope) {
      if (!this.options.merchantId) {
        throw new Error('merchantId must be configured on Payriff for this operation');
      }
      return JSON.stringify({ merchant: this.options.merchantId, body: request.body ?? {} });
    }
    return request.body === undefined ? undefined : JSON.stringify(request.body);
  }

  private unwrap<T>(status: number, text: string): T {
    let root: unknown;
    try {
      root = text ? JSON.parse(text) : undefined;
    } catch {
      root = undefined;
    }
    const ok = status >= 200 && status < 300;
    if (!isObject(root) || !('code' in root)) {
      throw new ApiError(ok ? 'Unexpected response from Payriff' : truncate(text, status), status);
    }
    const code = asString(root.code);
    const responseId = asString(root.responseId);
    if (!ok || code !== SUCCESS_CODE) {
      throw toApiError(asString(root.message), status, code, responseId);
    }
    return (root.payload ?? undefined) as T;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return value === undefined || value === null ? undefined : String(value);
}

function truncate(text: string, status: number): string {
  if (!text) return `Payriff request failed (HTTP ${status})`;
  return text.length > MAX_ERROR_BODY ? `${text.slice(0, MAX_ERROR_BODY)}...` : text;
}