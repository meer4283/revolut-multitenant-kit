import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { BASE } from "../../../../../lib/revolut";

export async function POST(req: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const { amount, reason } = await req.json();
    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "amount (minor units) required" }, { status: 400 });
    }

    const existing = await prisma.order.findUnique({
      where: { revolut_order_id: params.orderId },
      include: { tenant: true }
    });
    if (!existing) return NextResponse.json({ error: "order not found" }, { status: 404 });

    const secretKey = existing.tenant.revolut_secret_key_sandbox || existing.tenant.revolut_secret_key_live;
    if (!secretKey) return NextResponse.json({ error: "tenant has no secret key" }, { status: 400 });

    const res = await fetch(`${BASE}/api/orders/${params.orderId}/refunds`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secretKey}`,
        "Revolut-Api-Version": process.env.REVOLUT_API_VERSION || "2024-09-01",
      },
      body: JSON.stringify({ amount, reason }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
