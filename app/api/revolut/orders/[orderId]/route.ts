import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { BASE } from "../../../../lib/revolut";

export async function GET(_req: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const existing = await prisma.order.findUnique({
      where: { revolut_order_id: params.orderId },
      include: { tenant: true }
    });

    if (!existing) {
      return NextResponse.json({ error: "order not found" }, { status: 404 });
    }

    const isLive = existing.capture_mode === "MANUAL" // env is not tied to capture mode; we need tenant keys
      ? !!existing.tenant.revolut_secret_key_live && !existing.tenant.revolut_secret_key_sandbox
      : false;

    // Pick the key based on where you created it. For demo, assume sandbox if sandbox key exists.
    const secretKey = existing.tenant.revolut_secret_key_sandbox || existing.tenant.revolut_secret_key_live;
    if (!secretKey) return NextResponse.json({ error: "tenant has no secret key" }, { status: 400 });

    const res = await fetch(`${BASE}/api/orders/${params.orderId}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Revolut-Api-Version": process.env.REVOLUT_API_VERSION || "2024-09-01",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const order = await res.json();
    return NextResponse.json(order);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
