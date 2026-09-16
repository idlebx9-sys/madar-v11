# MADAR Production Notes

## Financial invariants

- Never trust amount, currency, fee, exchange rate, site price or wallet balance from the browser.
- Never update a user's balance without a corresponding `wallet_transactions` ledger entry.
- Never approve the same deposit twice.
- Never process a purchase twice.
- Never delete financial transactions; use refunds/adjustments.
- Deposits are liabilities/user funds, not platform revenue.
- Conversion fees and site purchases are platform revenue.

## Deployment order

1. Deploy application code that understands both the existing schema and the new marketplace schema if doing a zero-downtime rollout.
2. Back up MySQL.
3. Apply `0007_madar_marketplace_wallet.sql`.
4. Confirm the old plan/subscription tables are no longer referenced by the deployed application.
5. Configure S3/R2.
6. Configure `JWT_SECRET` (32+ chars) and `DATABASE_URL`.
7. Open Admin → Settings and configure site price, currency, conversion rates and Binance instructions.
8. Test one deposit, one approval, one conversion and one site purchase with a test account.

## Storage

Deposit screenshots use presigned S3-compatible uploads. Configure:

- `S3_ENDPOINT`
- `S3_REGION`
- `S3_BUCKET`
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`
- `S3_PUBLIC_BASE_URL`

## Verification checklist

- Admin can approve/reject purchase requests.
- Admin can approve/reject deposits with a reason.
- Deposit approval changes the ledger atomically.
- Repeating an approval returns a conflict and does not credit twice.
- Conversion fee is exactly the configured percentage using server-side arithmetic.
- Site payment locks the wallet and cannot overspend.
- Site purchase creates a site exactly once.
- Refund returns funds without deleting the original purchase ledger entry.
- Custom domains still require ownership of the site, not a subscription.
