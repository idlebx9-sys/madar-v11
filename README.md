# MADAR — Marketplace + Wallet Platform

MADAR is a production-oriented full-stack platform for selling one-time professional websites. The commercial model is **not subscription-based**.

## Commercial model

1. User submits a site purchase request.
2. Admin reviews and approves/rejects it.
3. Approved requests can be paid from the user's wallet.
4. Wallet deposits are submitted manually through Binance payment instructions and reviewed by an admin.
5. A successful wallet payment creates and activates the user's site.
6. The user can then edit, publish, connect domains, receive leads/messages and view analytics.

## Removed legacy model

The application no longer uses Starter/Pro/Business plans, subscriptions, subscription renewals, trials, Stripe subscription checkout, Stripe price IDs, or billing quotas.

Historical migrations remain for database history, while migration `0007_madar_marketplace_wallet.sql` removes the obsolete tables/columns and creates the new marketplace + wallet schema.

## Wallet

Wallets are ledger-based. `wallet_transactions` is the source of truth and supports USD, SAR and TRY balances. Every balance-changing operation creates a ledger entry.

Supported transaction types:

- deposit
- purchase
- conversion
- conversion_fee
- refund
- admin_credit
- admin_debit
- adjustment

Manual Binance deposits use S3-compatible storage for proof screenshots. Screenshots are uploaded directly with a presigned URL; the API refuses a deposit request unless the object exists under the user's deposit prefix.

## Currency exchange

Admin controls exchange rates in the database. Currency conversion is server-side, uses decimal-safe integer arithmetic for money, charges the configurable conversion fee (default 2%), records the fee as platform revenue, and writes an audit log.

Default currencies: USD, SAR, TRY.

## Security

Financial mutations validate and authorize on the server. Deposit approval, wallet debit/credit, currency conversion, site payment and refund operations use MySQL transactions and wallet row locks to prevent double processing/race conditions.

Sensitive actions are audited and user notifications are created for important state changes.

## Stack

- React + TypeScript + Vite
- Tailwind CSS + Framer Motion
- tRPC + Express
- Drizzle ORM + MySQL
- Redis-compatible rate limiting
- S3-compatible storage
- Vitest + Playwright

## Development

The uploaded project does not include a pnpm lockfile, so `pnpm install --frozen-lockfile` cannot be truthfully reported as executed until a lockfile is supplied/generated in the deployment environment.

Recommended commands once dependencies are installed:

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
pnpm test:e2e
```

## Database

Apply migrations in order. The new migration is:

`drizzle/0007_madar_marketplace_wallet.sql`

It creates:

- platform_settings
- purchase_requests
- wallets
- wallet_deposit_requests
- wallet_transactions
- currency_rates
- currency_exchange_transactions
- site_purchases
- platform_revenue

It also removes the old subscription/plan/Stripe persistence model and the legacy `users.walletBalance` and `sites.plan` fields.

## Admin settings

The admin panel controls:

- site purchase enabled/disabled
- site purchase price and currency
- exchange fee percentage
- SAR → TRY and TRY → SAR rates
- Binance Pay ID / UID
- wallet address, network and asset
- payment instructions

## Production notes

See `PRODUCTION_NOTES.md` and `DEPLOYMENT.md` before production deployment. Never put database credentials, storage secrets or session secrets in source control.

## Payment Methods & Telegram

Admins can manage manual payment methods from **Admin → طرق الدفع**. Each method supports:

- Method name
- Account image
- Account number
- Optional account name
- Active/inactive state

Users select one active method when submitting a wallet deposit. The selected method is stored with the deposit request so historical requests remain traceable even if the method is later removed.

Optional Telegram outbound notifications are configured with `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`. Notifications are send-only; no bot commands or webhooks are enabled.
