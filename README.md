# Payriff Node.js SDK

Node.js client for the Payriff merchant API: orders, direct (host-to-host) card payments, saved cards,
transactions, payouts and invoices.

- Node.js 20 or newer
- No runtime dependencies
- TypeScript types included
- Talks to `https://api.payriff.com`

## Installation

```bash
npm install @payriff/node
```

Works with any Node.js framework (Express, NestJS, Fastify, Next.js).

## Quick start

```ts
import { Payriff } from '@payriff/node';

const payriff = new Payriff({ appKey: process.env.PAYRIFF_APP_KEY! });

const order = await payriff.orders.create({
  amount: 10,
  description: 'Order #1001',
  callbackUrl: 'https://shop.example/payriff/callback',
  requestRrn: 'order-1001',
});

// Send the customer to the hosted payment page
const paymentUrl = order.paymentUrl;
```

CommonJS works too: `const { Payriff } = require('@payriff/node');`

Create one `Payriff` instance and reuse it.

## Configuration

| Option | Required | Default | Notes |
|---|---|---|---|
| `appKey` | yes | — | Application key from the Payriff dashboard. |
| `merchantId` | for payouts and invoices | — | Merchant ID (e.g. `ES1000000`). |
| `timeout` | no | `60000` | Request timeout in milliseconds. Bank operations can take tens of seconds. |
| `cardEncryptionKey` | no | built-in Payriff key | Only if Payriff rotates the card-encryption key. Base64 or PEM. |

Keep the app key in an environment variable or secret store. Never commit it.

## Orders

```ts
const created = await payriff.orders.create({
  amount: 25,
  currency: 'AZN',            // default AZN
  operation: 'PRE_AUTH',      // default PURCHASE
  language: 'AZ',
  description: 'Booking #77',
  callbackUrl: 'https://shop.example/payriff/callback',
  metadata: { bookingId: '77' },
});

const info = await payriff.orders.get(created.orderId);
const byRef = await payriff.orders.getByRequestRrn('order-1001');   // the requestRrn you sent on create

await payriff.orders.complete({ orderId: created.orderId, amount: 25 });
await payriff.orders.refund({ orderId: created.orderId, amount: 5, refundReason: 'Partial return' });
await payriff.orders.expire(created.orderId);                       // cancel an unpaid order

const receiptPdf: Buffer = await payriff.orders.downloadReceipt(created.orderId);
```

`paymentStatus` is a string such as `APPROVED`, `DECLINED`, `PREAUTH_APPROVED` or `REFUNDED`. Values that
this SDK version does not know yet are passed through unchanged.

Amounts are JavaScript numbers in major units (`10.5` = 10.50 AZN).

## Direct payments (host-to-host)

You collect the card details yourself, and the SDK encrypts them before sending
(AES-256-GCM + RSA-OAEP). Raw card data never leaves your server in clear text, but your
systems still handle card data, so PCI DSS requirements apply to you.

```ts
const result = await payriff.payments.directPay({
  amount: 1,
  description: 'Order #1002',
  callbackUrl: 'https://shop.example/payriff/callback',
  requestRrn: 'order-1002',
  card: {
    pan: '4169 7413 3015 1979',
    cardHolder: 'JOHN DOE',
    expiryMonth: '11',
    expiryYear: '27',
    cvv: '123',
  },
});

if (result.redirect) {
  // 3-D Secure: send the customer's browser to result.redirectUrl.
  // The final status arrives via your callback or payriff.orders.get(result.orderId).
}
```

The SDK strips spaces and dashes from the card number, pads the month (`1` → `01`), expands a 2-digit
year (`27` → `2027`) and rejects malformed values before any network call.

### Charging a saved card

```ts
const charge = await payriff.payments.autoPay({
  cardUuid: savedCardUuid,
  amount: 9.99,
  description: 'Monthly subscription',
  requestRrn: 'sub-2026-10',
});
```

## Saved cards

```ts
import { randomUUID } from 'node:crypto';

const session = await payriff.cards.save({
  customerRef: 'customer-42',
  callbackUrl: 'https://shop.example/payriff/card-saved',
  idempotencyKey: randomUUID(),
});
// Redirect the customer to session.paymentUrl to verify the card.

const details = await payriff.cards.getSave(session.cardSaveId);
if (details.status === 'VERIFIED') {
  const cardUuid = details.cardUuid;   // store it; use with autoPay
}

const cards = await payriff.cards.list('customer-42');
await payriff.cards.delete(cards[0].cardUuid);
```

## Transactions

```ts
const page = await payriff.transactions.list({
  status: 'APPROVED',
  from: '2026-09-01',          // Date or YYYY-MM-DD
  to: '2026-09-30',
  page: 0,
  size: 20,                    // server maximum is 20
});

for (const tx of page.content) {
  console.log(tx.orderId, tx.amount);
}
```

## Payouts

Payouts require `merchantId` on the client.

```ts
const payriff = new Payriff({
  appKey: process.env.PAYRIFF_APP_KEY!,
  merchantId: process.env.PAYRIFF_MERCHANT_ID,
});

const maskedName = await payriff.payouts.checkCardholder('4169741330151979');  // e.g. "J*** D**"

const payout = await payriff.payouts.create({
  transferAmount: 50,          // minimum 1
  description: 'Refund for order #1001',
  fullName: 'JOHN DOE',
  finCode: '1AB2C3D',
  cardPan: '4169741330151979',
  requestRrn: 'payout-1001',
  idempotencyKey: 'payout-1001',
});

const status = await payriff.payouts.getByRequestRrn('payout-1001');
const history = await payriff.payouts.list({ status: 'SUCCESS' });
const receipt = await payriff.payouts.downloadReceipt('payout-1001');
```

## Invoices

Invoices require `merchantId` on the client.

```ts
const invoice = await payriff.invoices.create({
  amount: 15,
  fullName: 'JOHN DOE',
  phoneNumber: '+994501234567',
  description: 'Consultation',
  expireDate: new Date(Date.now() + 7 * 24 * 3600 * 1000),
  sendSms: true,
});

const link = invoice.paymentUrl;   // share with the customer
const details = await payriff.invoices.get(invoice.invoiceUuid);
```

## Callbacks

When an order changes state, Payriff POSTs JSON to the `callbackUrl` you set on the order.

```ts
import express from 'express';
import { parseOrderCallback } from '@payriff/node';

app.post('/payriff/callback', express.json(), async (req, res) => {
  const notified = parseOrderCallback(req.body);   // also accepts the raw string or Buffer

  // Callbacks are not signed: confirm the state with Payriff before fulfilling.
  const confirmed = await payriff.orders.get(notified.orderId);
  if (confirmed.paymentStatus === 'APPROVED') {
    // fulfil the order (make this idempotent: the same callback can arrive more than once)
  }
  res.sendStatus(200);
});
```

## Errors

Every SDK error extends `PayriffError`, which carries `httpStatus`, `code` (Payriff result code)
and `responseId` (quote it when contacting support).

| Error | When |
|---|---|
| `AuthenticationError` | App key rejected (`14010`, `14013`, `14014`, `14015`) |
| `ValidationError` | Invalid request (`15400` or HTTP 400) |
| `RequestRejectedError` | Business refusal (`01000`), e.g. application under review |
| `InsufficientBalanceError` | Not enough wallet balance for a payout (`01200`) |
| `PayoutLimitError` | Payout limit reached (`01300`, `01400`, `01500`) |
| `ApiError` | Any other failure reported by Payriff |
| `PayriffConnectionError` | No response: network error or timeout |

Payriff can report a failure with HTTP 200. The SDK checks the result code in the body, so you
only need to catch errors. Invalid arguments are rejected with a `TypeError` or `RangeError` before
any request is sent.

```ts
import { PayriffConnectionError, PayriffError, ValidationError } from '@payriff/node';

try {
  await payriff.orders.refund({ orderId });
} catch (e) {
  if (e instanceof ValidationError) {
    console.warn(`Refund rejected: ${e.message} (${e.code})`);
  } else if (e instanceof PayriffConnectionError) {
    // Outcome unknown: check payriff.orders.get(orderId) before retrying
  } else if (e instanceof PayriffError) {
    console.error(`Payriff error ${e.code} responseId=${e.responseId}`);
  } else {
    throw e;
  }
}
```

### Retries

The SDK never retries on its own, because payment calls are not safe to repeat blindly. After a
`PayriffConnectionError`, look the operation up first (`orders.getByRequestRrn(...)`,
`payouts.getByRequestRrn(...)`) and retry only if it does not exist. Set `requestRrn` /
`idempotencyKey` on every request so that this lookup is possible.

## Building from source

```bash
npm install
npm test
npm run build
```

## License

MIT