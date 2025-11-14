import EmbeddedCheckout from "./EmbeddedCheckout";

export const metadata = { title: "Embedded Checkout | Revolut Kit" };

export default async function EmbeddedCheckoutPage() {
  const currency = "GBP";
  const initialCart = [
    { name: "Printed Tote Bag", unitPrice: 12.5, qty: 2, image: "/images/tote.jpg" },
    { name: "Branded Mug", unitPrice: 7.99, qty: 1, image: "/images/mug.jpg" },
  ];
  const email = "customer@example.com";

  return (
    <main>
      <EmbeddedCheckout cart={initialCart} email={email} currency={currency} />
    </main>
  );
}


