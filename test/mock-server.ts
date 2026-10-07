import { createServer, type IncomingHttpHeaders, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Payriff, type PayriffOptions } from '../src';

export interface RecordedRequest {
  method: string;
  url: string;
  headers: IncomingHttpHeaders;
  body: string;
  json(): any;
}

export interface Stub {
  status?: number;
  headers?: Record<string, string>;
  body?: string | Buffer | object;
}

export class MockServer {
  readonly requests: RecordedRequest[] = [];
  private readonly stubs = new Map<string, Stub>();
  private server!: Server;

  stub(method: string, url: string, response: Stub): void {
    this.stubs.set(`${method} ${url}`, response);
  }

  ok(method: string, url: string, payload: unknown): void {
    this.stub(method, url, { body: { code: '00000', message: 'Operation performed successfully', payload } });
  }

  get last(): RecordedRequest {
    const req = this.requests.at(-1);
    if (!req) throw new Error('no request recorded');
    return req;
  }

  get url(): string {
    return `http://127.0.0.1:${(this.server.address() as AddressInfo).port}`;
  }

  client(options: Partial<PayriffOptions> = {}): Payriff {
    return new Payriff({ appKey: 'app-key', merchantId: 'ES1000000', baseUrl: this.url, ...options });
  }

  async start(): Promise<void> {
    this.server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (c: Buffer) => chunks.push(c));
      req.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        this.requests.push({ method: req.method!, url: req.url!, headers: req.headers, body, json: () => JSON.parse(body) });
        const stub = this.stubs.get(`${req.method} ${req.url}`) ?? this.stubs.get(`${req.method} ${req.url!.split('?')[0]}`);
        if (!stub) {
          res.writeHead(404).end();
          return;
        }
        const isRaw = typeof stub.body === 'string' || Buffer.isBuffer(stub.body);
        const headers = { 'Content-Type': 'application/json', ...stub.headers };
        res.writeHead(stub.status ?? 200, headers);
        res.end(stub.body === undefined ? undefined : isRaw ? stub.body as string | Buffer : JSON.stringify(stub.body));
      });
    });
    await new Promise<void>((resolve) => this.server.listen(0, '127.0.0.1', resolve));
  }

  reset(): void {
    this.requests.length = 0;
    this.stubs.clear();
  }

  async stop(): Promise<void> {
    await new Promise<void>((resolve) => this.server.close(() => resolve()));
  }
}