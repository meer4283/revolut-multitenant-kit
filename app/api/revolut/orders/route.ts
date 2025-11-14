import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { BASE, toMinor } from "../../../lib/revolut";

type CartItem = { name: string; unitPrice: number; qty: number; image?: string };

export async function POST(req: NextRequest) {
  try {
    const {
      currency = "GBP",
      items = [],
      email,
      captureMode = "automatic",
      selectedMethod,
      order_number
    }: {
      currency?: string;
      items: CartItem[];
      email?: string;
      captureMode?: "automatic" | "manual";
      selectedMethod?: "CARD" | "APPLE_PAY" | "GOOGLE_PAY" | "REVOLUT_PAY" | "PAY_BY_BANK";
      order_number?: string;
    } = await req.json();

    const secretKey = "sk_TM7CxBpeH2Z52tNv2d_sWWFBxhlZlaVzr3wvrp9SZ352q0jYiV3Zk1Qg0II3NTHT"; //"wsk_ddftoOXmvubuv3rVNND81FyGirBckSjP";
    if (!secretKey) return NextResponse.json({ error: "Missing REVOLUT_SECRET_KEY" }, { status: 400 });

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
       "amount": 500,
  "currency": "GBP"
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
