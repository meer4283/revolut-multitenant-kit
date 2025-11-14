import CheckoutClient from "./CheckoutClient";

export const metadata = { title: "Checkout | Revolut Kit" };

export default async function CheckoutPage() {
  const currency = "GBP";
  const initialCart = [
    { name: "Printed Tote Bag", unitPrice: 12.5, qty: 2, image: "/images/tote.jpg" },
    { name: "Branded Mug", unitPrice: 7.99, qty: 1, image: "/images/mug.jpg" },
  ];
  const email = "customer@example.com";

  return (
    <CheckoutClient initialCart={initialCart} email={email} currency={currency} tenantId="demo-tenant" env="sandbox" />
  );
}
