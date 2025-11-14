# Revolut Multitenant Kit (Next.js + Prisma)

A drop-in starter for **Revolut Checkout** with **multi-tenant** support, built on **Next.js (App Router)** and **Prisma**.

Features:
- Create orders with tenant‑specific API keys
- All payment options (Cards, Apple/Google Pay via Payment Request, Revolut Pay, Pay by Bank)
- Webhook URL with `?tenant_id=<id>&env=<sandbox|live>`
- HMAC verification using each tenant’s **signing_secret**
- Admin endpoints to **register**, **inspect** and **rotate** webhooks per tenant
- Prisma models for tenants, orders, items, payments, refunds, webhook events
- Demo checkout + QA panel with sandbox test cards

## 1) Install & configure

```bash
pnpm i   # or npm i / yarn
cp .env.example .env.local
# add DATABASE_URL, PUBLIC_API_BASE_URL, NEXT_PUBLIC_REVOLUT_PUBLIC_KEY, etc.
```

Prisma:
```bash
npx prisma migrate dev -n init
npx prisma generate
npx prisma studio  # optional, to inspect tables
```

Seed a tenant (use Prisma Studio):
- Create a **Tenant** row with `id`, `name` and at least `revolut_secret_key_sandbox`.
- (Optional) Set `webhook_base_url` to your public API base (e.g. https://api.example.com)

Start dev:
```bash
npm run dev
```

Visit: `http://localhost:3000/checkout`

> The UI shows a “Sandbox” banner if `NEXT_PUBLIC_REVOLUT_MODE !== "prod"`

## 2) Register a sandbox webhook for a tenant
Call the admin endpoint:
```bash
curl -X POST http://localhost:3000/api/admin/revolut/webhooks/register \\
  -H "Content-Type: application/json" \\
  -d '{"tenant_id":"<TENANT_ID>","env":"sandbox","webhook_base_url":"https://your-public-url"}'
```
Save the response; the **signing_secret** is stored on the tenant record.

## 3) Make a sandbox payment
- Use the demo **/checkout** page.
- Open with `?qa=1` to show the **QA panel** and copy test card numbers.
- After paying, you’ll see **/thank-you** or **/order-pending**. The webhook will mark orders completed when it arrives.

## 4) API overview

- `POST /api/revolut/orders` — create order (expects `{ tenant_id, env, currency, items, email }`)
- `GET  /api/revolut/orders/:orderId` — retrieve order from Revolut (uses tenant key based on DB record)
- `POST /api/revolut/orders/:orderId/capture` — manual capture (optional)
- `POST /api/revolut/orders/:orderId/cancel`  — cancel auth (manual flow)
- `POST /api/revolut/orders/:orderId/refund`  — refund captured order

- `POST /api/admin/revolut/webhooks/register` — register tenant webhook (stores `webhook_id` + `signing_secret`)
- `GET  /api/admin/revolut/webhooks/:tenantId` — read masked webhook data
- `POST /api/admin/revolut/webhooks/:tenantId/rotate` — rotate signing secret

- `POST /api/revolut/webhook?tenant_id=<id>&env=<sandbox|live>` — webhook receiver (verifies HMAC, updates DB)

## 5) Notes

- **HTTPS only** for webhooks. Use a tunnel (ngrok/cloudflared) for local tests.
- Always **fulfil** on `ORDER_COMPLETED` (webhook or server-side retrieval), not only client success UI.
- Amounts are **minor units** (integers). Quantity format is `{ "quantity": { "value": <number> } }`.
- Apple Pay requires domain registration in production.

## 6) License
MIT
