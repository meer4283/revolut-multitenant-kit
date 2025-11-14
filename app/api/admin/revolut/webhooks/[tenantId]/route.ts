import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { tenantId: string } }) {
  const t = await prisma.tenant.findUnique({ where: { id: params.tenantId } });
  if (!t) return NextResponse.json({ error: "tenant not found" }, { status: 404 });

  const mask = (s?: string | null) => (s ? s.slice(0, 4) + "••••" + s.slice(-4) : null);

  return NextResponse.json({
    tenant_id: t.id,
    sandbox: {
      webhook_id: t.revolut_webhook_id_sandbox,
      signing_secret_preview: mask(t.revolut_webhook_secret_sandbox),
    },
    live: {
      webhook_id: t.revolut_webhook_id_live,
      signing_secret_preview: mask(t.revolut_webhook_secret_live),
    },
    webhook_base_url: t.webhook_base_url,
  });
}
