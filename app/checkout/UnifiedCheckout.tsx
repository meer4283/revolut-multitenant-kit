"use client";

import { useEffect, useRef, useState } from "react";
import RevolutCheckout from "@revolut/checkout";

type CartItem = { name: string; unitPrice: number; qty: number; image?: string };

export default function UnifiedCheckout({
  cart, email, currency = "GBP"
}: {
  cart: CartItem[];
  email?: string;
  currency?: string;
}) {
  const [loading, setLoading] = useState(false);
  const payReqRef = useRef<HTMLDivElement>(null);
  const rpRef     = useRef<HTMLDivElement>(null);
  const lastOrderIdRef = useRef<string | null>(null);

  async function verifyAndFinish(orderId: string) {
    const attempts = 6;
    for (let i = 0; i < attempts; i++) {
      const r = await fetch(`/api/revolut/orders/${orderId}`, { cache: "no-store" });
      const data = await r.json();
      if (data?.state === "completed") {
        window.location.href = `/thank-you?orderId=${orderId}`;
        return;
      }
      await new Promise((res) => setTimeout(res, 1000));
    }
    window.location.href = `/order-pending?orderId=${orderId}`;
  }

  const createOrder = async () => {
    const res = await fetch("/api/revolut/orders/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currency, items: cart, email }),
    });
    const data = await res.json();
    console.log("order data", data)
    if (data.error) throw new Error(data.error);
    lastOrderIdRef.current = data.orderId;
    return { publicId: data.token };
  };

  useEffect(() => {
    (async () => {
      const payments = await RevolutCheckout.payments({
        publicToken: process.env.NEXT_PUBLIC_REVOLUT_PUBLIC_KEY!,
        locale: "en",
      });

      if (payReqRef.current) {
        const pr = payments.paymentRequest(payReqRef.current, {
          currency,
          amount: Math.round(cart.reduce((s, i) => s + i.unitPrice * i.qty, 0) * 100),
          createOrder,
          onSuccess: async () => {
            const id = lastOrderIdRef.current;
            if (id) await verifyAndFinish(id);
          },
          onError: (err: any) => console.error("Payment Request error:", err),
          onCancel: () => {},
        });
        pr.canMakePayment().then((ok) => (ok ? pr.render() : pr.destroy()));
      }

      if (rpRef.current) {
        const rp = payments.revolutPay();
        rp.mount(rpRef.current, {
          currency,
          totalAmount: Math.round(cart.reduce((s, i) => s + i.unitPrice * i.qty, 0) * 100),
          createOrder,
          on: {
            success: async (payload: any) => {
              const id = payload?.orderId ?? lastOrderIdRef.current;
              if (id) await verifyAndFinish(id);
            },
            error: (e: any) => console.error("Revolut Pay error:", e),
            cancel: () => {},
          },
        });
      }

      const pbb = payments.payByBank({
        currency,
        amount: Math.round(cart.reduce((s, i) => s + i.unitPrice * i.qty, 0) * 100),
        createOrder,
        onSuccess: async () => {
          const id = lastOrderIdRef.current;
          if (id) await verifyAndFinish(id);
        },
        onError: (e: any) => console.error("Pay by Bank error:", e),
        onCancel: () => {},
      });
      document.getElementById("pay-by-bank-btn")?.addEventListener("click", () => pbb.show());
    })();
  }, [cart, currency, email]);

  const payByCard = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/revolut/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency, items: cart, email }),
      });
      const { token, orderId, error } = await res.json();
      if (error) throw new Error(error);

      lastOrderIdRef.current = orderId;

      const instance = await RevolutCheckout(
        token,
        process.env.NEXT_PUBLIC_REVOLUT_MODE === "prod" ? "prod" : "sandbox"
      );

      instance.payWithPopup({
        onSuccess: async () => {
          if (orderId) await verifyAndFinish(orderId);
        },
        onError: (err) => alert(`Card payment failed: ${err?.message || err}`),
        onCancel: () => {},
      });
    } catch (e: any) {
      console.error(e);
      alert("Could not start card checkout.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div ref={payReqRef} />
      <div ref={rpRef} />
      <button id="pay-by-bank-btn" className="px-4 py-2 rounded border">
        Pay by bank
      </button>
      <button onClick={payByCard} disabled={loading} className="px-4 py-2 rounded border">
        {loading ? "Starting…" : "Pay by card"}
      </button>
    </div>
  );
}
