import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export const runtime = "nodejs";

function safeEqual(a: string, b: string) {
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  return A.length === B.length && crypto.timingSafeEqual(A, B);
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const tenantId = url.searchParams.get("tenant_id") || "";
  const env = (url.searchParams.get("env") || "sandbox").toLowerCase();

  if (!tenantId) return NextResponse.json({ error: "tenant_id missing" }, { status: 400 });

  const raw = await req.text();
  const sig = req.headers.get("revolut-signature") || "";
  const ts  = req.headers.get("revolut-request-timestamp") || "";

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return NextResponse.json({ error: "tenant not found" }, { status: 404 });

  const signingSecret = env === "live" ? tenant.revolut_webhook_secret_live : tenant.revolut_webhook_secret_sandbox;
  if (!signingSecret) return NextResponse.json({ error: `no ${env} signing secret for tenant` }, { status: 400 });

  const expected = `v1=${crypto.createHmac("sha256", signingSecret).update(`v1.${ts}.${raw}`).digest("hex")}`;
  if (!safeEqual(sig, expected)) {
    console.warn("[revolut:webhook] bad signature", { tenantId, env });
    return new NextResponse("Invalid signature", { status: 400 });
  }

  const evt = JSON.parse(raw) as { event: string; order_id?: string; data?: any };

  // store event
  const existingOrder = evt.order_id
    ? await prisma.order.findUnique({ where: { revolut_order_id: evt.order_id } })
    : null;

  await prisma.webhookEvent.create({
    data: {
      provider: "revolut",
      event_type: evt.event,
      provider_order_id: evt.order_id ?? null,
      signature_valid: true,
      payload_json: evt,
      order: existingOrder ? { connect: { id: existingOrder.id } } : undefined,
    },
  });

  // simple mapping
  if (evt.order_id) {
    if (evt.event === "ORDER_AUTHORISED") {
      await prisma.order.updateMany({
        where: { revolut_order_id: evt.order_id },
        data: { state: "AUTHORISED" },
      });
      await prisma.payment.updateMany({
        where: { provider_order_id: evt.order_id },
        data: { status: "AUTHORISED", authorised_at: new Date() },
      });
    } else if (evt.event === "ORDER_COMPLETED") {
      await prisma.order.updateMany({
        where: { revolut_order_id: evt.order_id },
        data: { state: "COMPLETED" },
      });
      await prisma.payment.updateMany({
        where: { provider_order_id: evt.order_id },
        data: { status: "CAPTURED", captured_at: new Date() },
      });
    } else if (evt.event === "ORDER_CANCELLED") {
      await prisma.order.updateMany({
        where: { revolut_order_id: evt.order_id },
        data: { state: "CANCELLED" },
      });
      await prisma.payment.updateMany({
        where: { provider_order_id: evt.order_id },
        data: { status: "CANCELLED", cancelled_at: new Date() },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
