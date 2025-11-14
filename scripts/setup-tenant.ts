/**
 * Setup script to create a tenant and register webhook
 * 
 * Usage:
 * npx tsx scripts/setup-tenant.ts
 */

import { PrismaClient } from "@prisma/client";
import * as readline from "readline/promises";

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  console.log("\n🚀 Revolut Multi-Tenant Setup\n");
  console.log("This script will:");
  console.log("1. Create a tenant record in your database");
  console.log("2. Register the webhook with Revolut");
  console.log("3. Store the webhook signing secret\n");

  // Get Revolut API Secret Key
  console.log("📋 First, get your Revolut API Secret Key:");
  console.log("   1. Go to: https://sandbox-business.revolut.com/");
  console.log("   2. Navigate to: Developer → API");
  console.log("   3. Copy your API Secret Key (starts with 'sk_')\n");

  const secretKey = await rl.question("Enter your Revolut API Secret Key (sandbox): ");
  if (!secretKey || !secretKey.startsWith("sk_")) {
    console.error("❌ Invalid secret key. Must start with 'sk_'");
    process.exit(1);
  }

  const tenantId = await rl.question("\nEnter Tenant ID (e.g., 'demo-tenant'): ");
  if (!tenantId) {
    console.error("❌ Tenant ID is required");
    process.exit(1);
  }

  const tenantName = await rl.question("Enter Tenant Name (e.g., 'Demo Store'): ") || tenantId;

  rl.close();

  console.log("\n⏳ Creating tenant...");

  // Create or update tenant
  const tenant = await prisma.tenant.upsert({
    where: { id: tenantId },
    create: {
      id: tenantId,
      name: tenantName,
      revolut_secret_key_sandbox: secretKey,
      webhook_base_url: process.env.PUBLIC_API_BASE_URL || "",
    },
    update: {
      name: tenantName,
      revolut_secret_key_sandbox: secretKey,
      webhook_base_url: process.env.PUBLIC_API_BASE_URL || "",
    },
  });

  console.log("✅ Tenant created:", tenant.id);

  // Register webhook
  console.log("\n⏳ Registering webhook with Revolut...");

  const webhookUrl = `${process.env.PUBLIC_API_BASE_URL}/api/revolut/webhook?tenant_id=${tenantId}&env=sandbox`;
  console.log("   Webhook URL:", webhookUrl);

  try {
    const response = await fetch("https://sandbox-merchant.revolut.com/api/1.0/webhooks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secretKey}`,
      },
      body: JSON.stringify({
        url: webhookUrl,
        events: [
          "ORDER_COMPLETED",
          "ORDER_AUTHORISED",
          "ORDER_CANCELLED",
          "ORDER_PAYMENT_AUTHENTICATED",
          "ORDER_PAYMENT_DECLINED",
          "ORDER_PAYMENT_FAILED",
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Failed to register webhook:", errorText);
      process.exit(1);
    }

    const webhookData = await response.json();
    console.log("✅ Webhook registered!");
    console.log("   Webhook ID:", webhookData.id);

    // Update tenant with webhook info
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        revolut_webhook_id_sandbox: webhookData.id,
        revolut_webhook_secret_sandbox: webhookData.signing_secret,
      },
    });

    console.log("✅ Webhook signing secret stored in database");

    console.log("\n🎉 Setup complete!\n");
    console.log("Next steps:");
    console.log("1. Visit: http://localhost:3000/checkout");
    console.log("2. Use test cards from: http://localhost:3000/checkout?qa=1");
    console.log("3. Webhooks will be received at:", webhookUrl);
    console.log("\n");

  } catch (error: any) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
