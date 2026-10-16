# Changelog

## 0.2.0 (unreleased)

- Added: Saudi Arabia support via `new Payriff({ ..., region: 'saudi' })`. It uses
  `https://api.gccpay.sa` and defaults the currency to `SAR`. Azerbaijan (`AZN`) stays the default.
- Removed: direct (host-to-host) card payments: `payments.directPay()`, the `CardData` and
  `DirectPayParams` types and the `cardEncryptionKey` option. Use the hosted payment page
  (`orders.create()`) instead.

## 0.1.3 (2026-10-08)

- Published as `@payriff-sdk/node`.

## 0.1.2 (2026-10-07)

- First release on npm.

## 0.1.1 (2026-10-07)

- Published as `@payriff/node` (the unscoped `payriff` name on npm is not ours).
- Package builds on install, so installing from GitHub works.

## 0.1.0 (2026-10-07)

- Initial release: orders, direct and saved-card payments, saved cards, transactions, payouts,
  v2 invoices, order callback parsing.