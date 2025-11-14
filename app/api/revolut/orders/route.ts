import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { BASE, toMinor } from "../../../lib/revolut";

type CartItem = { name: string; unitPrice: number; qty: number; image?: string };

export async function POST(req: NextRequest) {
  try {
    const {
      tenant_id,
      env = "sandbox",
      currency = "GBP",
      items = [],
      email,
      captureMode = "automatic",
      selectedMethod,
      order_number
    }: {
      tenant_id: string;
      env?: "sandbox" | "live";
      currency?: string;
      items: CartItem[];
      email?: string;
      captureMode?: "automatic" | "manual";
      selectedMethod?: "CARD" | "APPLE_PAY" | "GOOGLE_PAY" | "REVOLUT_PAY" | "PAY_BY_BANK";
      order_number?: string;
    } = await req.json();

    if (!tenant_id) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });
    const tenant = await prisma.tenant.findUnique({ where: { id: tenant_id } });
    if (!tenant) return NextResponse.json({ error: "tenant not found" }, { status: 404 });

    const secretKey =
      env === "live" ? tenant.revolut_secret_key_live : tenant.revolut_secret_key_sandbox;
    if (!secretKey) {
      return NextResponse.json({ error: `Missing ${env} Revolut secret key for tenant` }, { status: 400 });
    }

    // Compute totals & line items
    const amountMajor = (items as CartItem[]).reduce((s, it) => s + (Number(it.unitPrice) * Number(it.qty)), 0);
    const amount = toMinor(amountMajor);

    const line_items = (items as CartItem[]).map((it) => {
      const qty = Number(it.qty);
      const unitMinor = toMinor(Number(it.unitPrice));
      return {
        name: it.name,
        type: "physical",
        quantity: { value: qty },
        unit_price_amount: unitMinor,
        total_amount: unitMinor * qty,
        image_urls: it.image ? [it.image] : undefined,
      };
    });

    const res = await fetch(`${BASE}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secretKey}`,
        "Revolut-Api-Version": process.env.REVOLUT_API_VERSION || "2024-09-01",
      },
      body: JSON.stringify({
        amount,
        currency,
        capture_mode: captureMode,
        description: "Cart checkout",
        line_items,
        customer: email ? { email } : undefined,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const order = await res.json();

    // Persist internally
    const now = new Date();
    const created = await prisma.order.create({
      data: {
        order_number: order_number || `ORD-${now.getTime()}`,
        tenant_id,
        customer: email
          ? {
              connectOrCreate: {
                where: { email },
                create: { email },
              },
            }
          : undefined,
        email,
        total_amount_minor: amount,
        currency,
        capture_mode: captureMode === "manual" ? "MANUAL" : "AUTOMATIC",
        state: "CREATED",
        revolut_order_id: order.id,
        revolut_public_token: order.token,
        selected_method: selectedMethod || null,
        items: {
          create: (items as CartItem[]).map((it) => ({
            name: it.name,
            item_type: "PHYSICAL",
            quantity: Number(it.qty),
            unit_price_minor: toMinor(Number(it.unitPrice)),
            total_amount_minor: toMinor(Number(it.unitPrice) * Number(it.qty)),
            image_url: it.image || null,
          })),
        },
        payments: {
          create: {
            method: (selectedMethod || "CARD") as any,
            status: "INITIATED",
            amount_minor: amount,
            currency,
            provider_order_id: order.id,
            raw_payload: order,
          },
        },
      },
    });

    return NextResponse.json({ token: order.token, orderId: order.id, internalOrderId: created.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
