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
  const raw = await req.text();
  const sig = req.headers.get("revolut-signature") || "";
  const ts  = req.headers.get("revolut-request-timestamp") || "";

  const signingSecret = process.env.REVOLUT_WEBHOOK_SECRET;
  if (!signingSecret) return NextResponse.json({ error: "Missing REVOLUT_WEBHOOK_SECRET" }, { status: 400 });

  const expected = `v1=${crypto.createHmac("sha256", signingSecret).update(`v1.${ts}.${raw}`).digest("hex")}`;
  if (!safeEqual(sig, expected)) {
    console.warn("[revolut:webhook] bad signature");
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
