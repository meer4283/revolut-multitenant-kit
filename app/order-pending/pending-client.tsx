"use client";

import { useEffect, useState } from "react";

export default function PendingClient({ orderId }: { orderId: string }) {
  const [status, setStatus] = useState<string>("checking");

  useEffect(() => {
    if (!orderId) return;

    let active = true;
    const poll = async () => {
      try {
        const r = await fetch(`/api/revolut/orders/${orderId}`, { cache: "no-store" });
        const data = await r.json();
        if (!active) return;
        const s = data?.state || "unknown";
        setStatus(s);

        if (s === "completed") {
          window.location.href = `/thank-you?orderId=${orderId}`;
          return;
        }
        if (["failed", "cancelled", "rejected", "expired"].includes(s)) {
          return;
        }
      } catch {}
    };

    poll();
    const id = setInterval(poll, 2000);
    const stopAt = setTimeout(() => clearInterval(id), 120000);

    return () => {
      active = false;
      clearInterval(id);
      clearTimeout(stopAt);
    };
  }, [orderId]);

  return (
    <div className="space-y-2">
      <div className="text-sm text-gray-600">Order: <code>{orderId || "unknown"}</code></div>
      <div className="text-sm">Status: <strong>{status}</strong></div>
      {["failed", "cancelled", "rejected", "expired"].includes(status) ? (
        <a href="/checkout" className="inline-block rounded border px-4 py-2 mt-4">
          Try again
        </a>
      ) : (
        <button className="inline-block rounded border px-4 py-2 mt-4" onClick={() => location.reload()}>
          Refresh
        </button>
      )}
    </div>
  );
}
