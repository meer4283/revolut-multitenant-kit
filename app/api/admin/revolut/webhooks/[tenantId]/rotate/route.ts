import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { revolutAdminFetch } from "../../../../../lib/revolut-admin";

export async function POST(req: NextRequest, { params }: { params: { tenantId: string } }) {
  try {
    const { env = "sandbox", expiration_period = "PT1H" } = await req.json().catch(() => ({}));
    const t = await prisma.tenant.findUnique({ where: { id: params.tenantId } });
    if (!t) return NextResponse.json({ error: "tenant not found" }, { status: 404 });

    const webhookId = env === "live" ? t.revolut_webhook_id_live : t.revolut_webhook_id_sandbox;
    const secretKey = env === "live" ? t.revolut_secret_key_live : t.revolut_secret_key_sandbox;

    if (!webhookId) return NextResponse.json({ error: `No ${env} webhook id` }, { status: 400 });
    if (!secretKey) return NextResponse.json({ error: `Missing ${env} secret key` }, { status: 400 });

    const data = await revolutAdminFetch(
      `/api/1.0/webhooks/${webhookId}/rotate-signing-secret`,
      secretKey,
      { method: "POST", body: JSON.stringify({ expiration_period }) }
    );

    if (env === "live") {
      await prisma.tenant.update({
        where: { id: params.tenantId },
        data: { revolut_webhook_secret_live: data.signing_secret },
      });
    } else {
      await prisma.tenant.update({
        where: { id: params.tenantId },
        data: { revolut_webhook_secret_sandbox: data.signing_secret },
      });
    }

    const s = data.signing_secret || "";
    const masked = s ? s.slice(0, 4) + "••••" + s.slice(-4) : null;

    return NextResponse.json({ env, signing_secret_preview: masked });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
