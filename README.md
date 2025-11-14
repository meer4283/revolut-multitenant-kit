# Revolut Checkout – Simple Integration (Next.js + Prisma)

This is a minimal, single-merchant integration for Revolut Checkout using Next.js (App Router) and Prisma.

- Cards, Payment Request (Apple/Google Pay), Revolut Pay, Pay by Bank
- Server creates orders via Revolut Merchant API
- Webhook verifies HMAC using a single signing secret from env
- Stores orders, items, payments, refunds, and webhook events in MySQL (via Prisma)

## 1) Install & configure

```bash
pnpm i   # or: npm i / yarn
```

Create `.env.local` with:

```
DATABASE_URL="mysql://user:pass@localhost:3306/revolut_simple"

# Revolut
REVOLUT_SECRET_KEY="rk_test_..."           # Server-side secret key (sandbox or live)
REVOLUT_WEBHOOK_SECRET="whsec_..."         # Webhook signing secret
NEXT_PUBLIC_REVOLUT_PUBLIC_KEY="pk_test_..."  # Public key for @revolut/checkout

# Sandbox by default; set to "prod" for live API host
NEXT_PUBLIC_REVOLUT_MODE="sandbox"
# Optional, defaults to sandbox host when not "prod"
# REVOLUT_MODE="prod"

# Optional, defaults to "2024-09-01"
# REVOLUT_API_VERSION="2024-09-01"
```

Prisma:

```bash
npx prisma migrate dev -n init
npx prisma generate
```

Start dev:

```bash
npm run dev
```

Visit `http://localhost:3000/checkout`

## 2) Webhook

Expose your local server (ngrok/cloudflared) and register the webhook in your Revolut merchant dashboard to:

```
POST https://YOUR_PUBLIC_URL/api/revolut/webhook
```

Set `REVOLUT_WEBHOOK_SECRET` to the signing secret from the dashboard. The server will:
- Verify `Revolut-Signature` HMAC
- Store the event
- Update internal order/payment state on key events (authorised, completed, cancelled)

## 3) API overview (single-merchant)

- `POST /api/revolut/orders`
  - Body: `{ currency, items, email, captureMode?, selectedMethod?, order_number? }`
  - Uses `REVOLUT_SECRET_KEY`
- `GET  /api/revolut/orders/:orderId`
- `POST /api/revolut/orders/:orderId/capture`
- `POST /api/revolut/orders/:orderId/cancel`
- `POST /api/revolut/orders/:orderId/refund`
- `POST /api/revolut/webhook`
  - Uses `REVOLUT_WEBHOOK_SECRET`

Amounts are minor units on the API; the UI converts from major units.

## 4) Notes

- Use HTTPS for webhooks.
- Fulfil on `ORDER_COMPLETED` (from webhook or confirmed server-side fetch), not only on client success callbacks.
- Apple Pay requires domain verification in production.

## 5) License
MIT
