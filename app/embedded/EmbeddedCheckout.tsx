"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import RevolutCheckout from "@revolut/checkout";
import styles from "./embedded.module.css";

type CartItem = { name: string; unitPrice: number; qty: number; image?: string };

export default function EmbeddedCheckout({
  cart, email, currency = "GBP"
}: {
  cart: CartItem[];
  email?: string;
  currency?: string;
}) {
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [customerEmail, setCustomerEmail] = useState(email || "customer@example.com");
  const [cardholderName, setCardholderName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const lastOrderIdRef = useRef<string | null>(null);
  const cardFieldRef = useRef<any | null>(null);

  function isValidCardholderName(name: string) {
    const trimmed = name.trim().replace(/\s+/g, " ");
    const parts = trimmed.split(" ").filter(Boolean);
    if (parts.length < 2) return false;
    // Allow letters, spaces, hyphens and apostrophes only
    return /^[A-Za-z][A-Za-z'\- ]+[A-Za-z]$/.test(trimmed);
  }

  function formatMoney(amount: number, ccy: string) {
    try {
      return new Intl.NumberFormat("en-GB", { style: "currency", currency: ccy }).format(amount);
    } catch {
      return `${ccy} ${amount.toFixed(2)}`;
    }
  }

  const subtotal = useMemo(
    () => Math.round(cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0) * 100) / 100,
    [cart]
  );

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

  useEffect(() => {
    (async () => {
      try {
        setInitializing(true);
        setError(null);
        setIsReady(false);
        // Create order to obtain token for Card Field
        const res = await fetch("/api/revolut/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currency, items: cart, email: customerEmail, selectedMethod: "CARD" }),
        });
        const { token, orderId, error: apiErr } = await res.json();
        if (apiErr) throw new Error(apiErr);
        lastOrderIdRef.current = orderId;
        // keep token for optional upsell
        const orderToken = token as string;

        // Initialize Card Field for this token
        const instance = await RevolutCheckout(
          token,
          process.env.NEXT_PUBLIC_REVOLUT_MODE === "prod" ? "prod" : "sandbox"
        );
        const { createCardField } = instance as any;
        if (!createCardField) {
          throw new Error("Card Field API not available in current SDK version.");
        }
        if (cardContainerRef.current) {
          // Clear any previous mount
          cardContainerRef.current.innerHTML = "";
          // High-contrast styles for the hosted Card Field iframe
          const prefersDark = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
          const cardStyles = prefersDark
            ? {
                default: {
                  color: "#F9FAFB",
                  backgroundColor: "#0C0E13",
                  fontSize: "16px",
                  "::placeholder": { color: "#9CA3AF" },
                },
                focused: {
                  color: "#FFFFFF",
                  backgroundColor: "#0F1218",
                },
                invalid: {
                  color: "#FCA5A5",
                  backgroundColor: "#2B1111",
                },
                autofilled: {
                  color: "#F9FAFB",
                  backgroundColor: "#0F1218",
                },
              }
            : {
                default: {
                  color: "#111827",
                  backgroundColor: "#FFFFFF",
                  fontSize: "16px",
                  "::placeholder": { color: "#6B7280" },
                },
                focused: {
                  color: "#111827",
                  backgroundColor: "#F9FAFB",
                },
                invalid: {
                  color: "#B91C1C",
                  backgroundColor: "#FEF2F2",
                },
                autofilled: {
                  color: "#111827",
                  backgroundColor: "#EEF2FF",
                },
              };
          const cardField = createCardField({
            target: cardContainerRef.current,
            theme: prefersDark ? "dark" : "light",
            styles: cardStyles,
            onSuccess: async () => {
              const id = lastOrderIdRef.current;
              if (id) await verifyAndFinish(id);
            },
            onError: (e: any) => {
              console.error("Card field error:", e);
              setError(e?.message || "Payment failed");
            },
          });
          cardFieldRef.current = cardField;
          setIsReady(true);
        }

        // Optional: Upsell banner
        try {
          const upsell = (RevolutCheckout as any).upsell;
          if (upsell && orderToken) {
            const { cardGatewayBanner } = await upsell({
              publicToken: process.env.NEXT_PUBLIC_REVOLUT_PUBLIC_KEY!,
              locale: "auto",
            });
            const el = document.getElementById("card-gateway-banner");
            if (el) {
              cardGatewayBanner.mount(el, { orderToken });
            }
          }
        } catch {
          // ignore upsell errors
        }
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Could not initialize payments");
      } finally {
        setInitializing(false);
      }
    })();
  }, [cart, currency, customerEmail]);

  const submitCard = async () => {
    if (!cardFieldRef.current) {
      setError("Card field not ready");
      alert("Card field not ready");
      return;
    }
    if (!isValidCardholderName(cardholderName)) {
      setError("Enter first and last name using letters only");
      alert("Enter first and last name using letters only");
      return;
    }
    try {
      setError(null);
      setSubmitting(true);
      await cardFieldRef.current.submit({
        name: cardholderName,
        email: customerEmail,
        cardholderName,
      });


    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>Checkout</h1>
      <div className={styles.grid}>
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Order summary</h2>
          <div className={styles.list}>
            {cart.map((item, idx) => {
              const lineTotal = item.unitPrice * item.qty;
              return (
                <div key={idx} className={styles.listItem}>
                  {item.image ? (
                    <img src={item.image} alt={item.name} className={styles.thumb} />
                  ) : (
                    <div className={styles.thumbPlaceholder} />
                  )}
                  <div className={styles.itemBody}>
                    <div className={styles.itemName}>{item.name}</div>
                    <div className={styles.itemMeta}>Qty {item.qty} · {formatMoney(item.unitPrice, currency)}</div>
                  </div>
                  <div className={styles.itemPrice}>{formatMoney(lineTotal, currency)}</div>
                </div>
              );
            })}
          </div>
          <div className={styles.divider} />
          <div className={styles.row}>
            <span className={styles.rowLabel}>Subtotal</span>
            <span className={styles.rowValue}>{formatMoney(subtotal, currency)}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Shipping</span>
            <span className={styles.rowValue}>{formatMoney(0, currency)}</span>
          </div>
          <div className={styles.totalRow}>
            <span>Total</span>
            <span>{formatMoney(subtotal, currency)}</span>
          </div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Card payment</h2>

          <label className={styles.fieldLabel}>Email</label>
          <input
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            className={styles.emailInput}
            placeholder="you@example.com"
          />

          <label className={styles.fieldLabel}>Cardholder name</label>
          <input
            type="text"
            value={cardholderName}
            onChange={(e) => setCardholderName(e.target.value)}
            className={styles.emailInput}
            placeholder="First Last"
            autoComplete="cc-name"
          />

          {error ? <div className={styles.errorText}>{error}</div> : null}

          <div className={styles.field}>
            <div ref={cardContainerRef} />
          </div>

          <button
            onClick={submitCard}
            className={styles.buttonPrimary}
            disabled={!isReady || initializing || submitting}
          >
            {initializing ? "Preparing…" : submitting ? "Processing…" : "Pay now"}
          </button>

          <div className={styles.helpText}>
            Secured by Revolut
          </div>
          <div id="card-gateway-banner" className={styles.banner} />
        </div>
      </div>
    </div>
  );
}


