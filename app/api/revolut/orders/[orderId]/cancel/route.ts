import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { BASE } from "../../../../../lib/revolut";

export async function POST(_req: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const existing = await prisma.order.findUnique({
      where: { revolut_order_id: params.orderId }
    });
    if (!existing) return NextResponse.json({ error: "order not found" }, { status: 404 });

    const secretKey = process.env.REVOLUT_SECRET_KEY;
    if (!secretKey) return NextResponse.json({ error: "Missing REVOLUT_SECRET_KEY" }, { status: 400 });

    const res = await fetch(`${BASE}/api/orders/${params.orderId}/cancel`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Revolut-Api-Version": process.env.REVOLUT_API_VERSION || "2024-09-01",
      },
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
