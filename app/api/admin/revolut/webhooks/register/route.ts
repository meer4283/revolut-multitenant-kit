import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { revolutAdminFetch } from "../../../../../lib/revolut-admin";

export async function POST(req: NextRequest) {
  try {
    const { tenant_id, env = "sandbox", webhook_base_url } = await req.json();
    if (!tenant_id) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

    const tenant = await prisma.tenant.findUnique({ where: { id: tenant_id } });
    if (!tenant) return NextResponse.json({ error: "tenant not found" }, { status: 404 });

    const secretKey =
      env === "live" ? tenant.revolut_secret_key_live : tenant.revolut_secret_key_sandbox;
    if (!secretKey) return NextResponse.json({ error: `Missing ${env} secret key` }, { status: 400 });

    const baseUrl =
      webhook_base_url ||
      tenant.webhook_base_url ||
      process.env.PUBLIC_API_BASE_URL ||
      "";
    if (!baseUrl) return NextResponse.json({ error: "webhook_base_url required" }, { status: 400 });

    const url = `${baseUrl.replace(/\/$/, "")}/api/revolut/webhook?tenant_id=${tenant_id}&env=${env}`;

    const payload = {
      url,
      events: [
        "ORDER_COMPLETED",
        "ORDER_AUTHORISED",
        "ORDER_CANCELLED",
        "ORDER_PAYMENT_AUTHENTICATED",
        "ORDER_PAYMENT_DECLINED",
        "ORDER_PAYMENT_FAILED",
      ],
    };

    const data = await revolutAdminFetch("/api/1.0/webhooks", secretKey, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (env === "live") {
      await prisma.tenant.update({
        where: { id: tenant_id },
        data: {
          webhook_base_url: baseUrl,
          revolut_webhook_id_live: data.id,
          revolut_webhook_secret_live: data.signing_secret,
        },
      });
    } else {
      await prisma.tenant.update({
        where: { id: tenant_id },
        data: {
          webhook_base_url: baseUrl,
          revolut_webhook_id_sandbox: data.id,
          revolut_webhook_secret_sandbox: data.signing_secret,
        },
      });
    }

    const masked = (s: string) => (s ? s[:4] + "••••" + s[-4:] : null);

    return NextResponse.json({
      id: data.id,
      url: data.url,
      env,
      signing_secret_preview: masked(data.signing_secret),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
