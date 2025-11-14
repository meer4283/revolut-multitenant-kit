"use client";

import { useMemo, useState } from "react";
import UnifiedCheckout from "./UnifiedCheckout";
import TestCardsQA from "./TestCardsQA";

type CartItem = { name: string; unitPrice: number; qty: number; image?: string };

function formatMoney(v: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(v);
}

export default function CheckoutClient({
  initialCart,
  email,
  currency = "GBP",
  tenantId = "demo-tenant",
  env = "sandbox"
}: {
  initialCart: CartItem[];
  email?: string;
  currency?: string;
  tenantId?: string;
  env?: "sandbox" | "live";
}) {
  const [cart, setCart] = useState<CartItem[]>(initialCart);

  const subtotal = useMemo(
    () => cart.reduce((s, i) => s + i.unitPrice * i.qty, 0),
    [cart]
  );
  const shipping = 0;
  const total = subtotal + shipping;
  const totalMinor = Math.round(total * 100);

  const setTotalMinor = (targetMinor: number) => {
    const target = targetMinor / 100;
    const diff = Math.max(target - (subtotal + shipping), 0);
    const QA_NAME = "[QA Adjustment]";
    const idx = cart.findIndex((c) => c.name === QA_NAME);
    const updated = [...cart];

    if (diff === 0) {
      if (idx >= 0) updated.splice(idx, 1);
      setCart(updated);
      return;
    }

    const unitPrice = diff;
    if (idx >= 0) {
      updated[idx] = { ...updated[idx], unitPrice, qty: 1 };
    } else {
      updated.push({ name: QA_NAME, unitPrice, qty: 1 });
    }
    setCart(updated);
  };

  const mode =
    process.env.NEXT_PUBLIC_REVOLUT_MODE === "prod" ? "Production" : "Sandbox";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div
        className="mb-6 rounded-lg border p-3 text-sm"
        style={{
          borderColor: mode === "Sandbox" ? "#999" : "#16a34a",
          background: mode === "Sandbox" ? "#f3f4f6" : "#ecfdf5",
        }}
      >
        <strong>Revolut mode:</strong> {mode}
      </div>

      <h1 className="mb-4 text-2xl font-semibold">Checkout</h1>

      <div className="mb-6 divide-y rounded-lg border">
        {cart.map((item, idx) => (
          <div key={idx} className="flex items-center gap-4 p-4">
            {item.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.image}
                alt={item.name}
                width={64}
                height={64}
                className="h-16 w-16 rounded object-cover"
              />
            ) : (
              <div className="h-16 w-16 rounded bg-gray-200" />
            )}
            <div className="flex-1">
              <div className="font-medium">{item.name}</div>
              <div className="text-sm text-gray-600">
                {item.qty} × {formatMoney(item.unitPrice, currency)}
              </div>
            </div>
            <div className="font-medium">
              {formatMoney(item.unitPrice * item.qty, currency)}
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between p-4 text-sm text-gray-700">
          <span>Subtotal</span>
          <span>{formatMoney(subtotal, currency)}</span>
        </div>
        <div className="flex items-center justify-between p-4 text-sm text-gray-700">
          <span>Shipping</span>
          <span>{formatMoney(shipping, currency)}</span>
        </div>
        <div className="flex items-center justify-between p-4 text-base font-semibold">
          <span>Total</span>
          <span>{formatMoney(total, currency)}</span>
        </div>
      </div>

      <UnifiedCheckout cart={cart} email={email} currency={currency} tenantId={tenantId} env={env} />

      <TestCardsQA
        currentTotalMinor={totalMinor}
        onSetTotalMinor={setTotalMinor}
        currency={currency}
      />

      <p className="mt-6 text-xs text-gray-500">
        By placing your order, you agree to our Terms and Privacy Policy.
      </p>
    </div>
  );
}
