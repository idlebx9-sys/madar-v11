# نشر MADAR

## المتطلبات

- Node 20+
- MySQL 8+
- Redis (موصى به للإنتاج)
- S3-compatible Storage مثل Cloudflare R2 أو AWS S3 أو MinIO
- نطاق + TLS

## متغيرات الإنتاج

```env
NODE_ENV=production
APP_URL=https://madar.app
DATABASE_URL=mysql://...
JWT_SECRET=<32+ chars>
S3_BUCKET=...
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_ENDPOINT=...
S3_PUBLIC_BASE_URL=...
ALLOWED_ORIGINS=https://madar.app,https://*.madar.app
```

لا توجد مفاتيح Stripe مطلوبة في نموذج MADAR التجاري الجديد.

## Docker

```bash
docker compose up -d
```

## Database migration

خذ نسخة احتياطية من MySQL ثم طبّق migrations بالترتيب. migration التجارية الجديدة هي:

`drizzle/0007_madar_marketplace_wallet.sql`

بعد تطبيقها تأكد من وجود:

- `platform_settings`
- `purchase_requests`
- `wallets`
- `wallet_deposit_requests`
- `wallet_transactions`
- `currency_rates`
- `currency_exchange_transactions`
- `site_purchases`
- `platform_revenue`

## إعداد Admin

بعد تسجيل الدخول بحساب Admin افتح لوحة الإدارة واضبط:

- سعر الموقع
- عملة الموقع
- تفعيل شراء المواقع
- رسوم تحويل العملات
- أسعار SAR/TRY
- Binance Pay ID / UID
- عنوان المحفظة والشبكة والأصل
- تعليمات الدفع

## فحص الجاهزية

- `GET /ready` يتحقق من اتصال MySQL، ويعرض حالة Redis وStorage أيضًا.
- اختبر مسار: Purchase Request → Admin Approval → Deposit → Deposit Approval → Wallet Payment → Site Activation.

## Netlify Deployment (MADAR)

MADAR can be deployed on Netlify as a Vite SPA + Netlify Function for the Express/tRPC API.

### Required Netlify environment variables

- `NODE_ENV=production`
- `APP_URL=https://YOUR-SITE.netlify.app` (or your custom domain)
- `APP_DOMAIN=YOUR-DOMAIN`
- `PUBLIC_SITE_BASE_URL=https://YOUR-DOMAIN`
- `DATABASE_URL=...` (external MySQL-compatible database)
- `JWT_SECRET=...` (32+ random characters)
- `ALLOWED_ORIGINS=https://YOUR-DOMAIN`
- `S3_ENDPOINT=...`
- `S3_REGION=...`
- `S3_BUCKET=...`
- `S3_ACCESS_KEY=...`
- `S3_SECRET_KEY=...`
- `S3_PUBLIC_BASE_URL=...`
- `TELEGRAM_BOT_TOKEN=...` (optional)
- `TELEGRAM_CHAT_ID=...` (optional)

Redis remains optional. Netlify Functions are stateless, so the production database and object storage must be external/shared services.

The Netlify build configuration is included in `netlify.toml` and routes `/api/*` and `/madar-storage/*` to the function while serving `dist/public` as the SPA.

### Manual database migration

Before first production launch, apply:

`drizzle/0008_payment_methods.sql`

It creates the payment-method management table and links wallet deposit requests to the selected payment method.

### Telegram behavior

Telegram is outbound notification-only. MADAR calls `sendMessage` when a purchase request or wallet deposit is created/changed. The bot does not receive commands, poll updates, or expose a webhook.
