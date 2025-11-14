import PendingClient from "./pending-client";

export const metadata = { title: "Order pending…" };

export default function OrderPendingPage({ searchParams }: { searchParams: { orderId?: string } }) {
  const orderId = searchParams?.orderId || "";
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="mb-2 text-2xl font-semibold">We’re confirming your payment</h1>
      <p className="mb-8 text-gray-600">This can take a few seconds—please don’t close this tab.</p>
      <div className="mx-auto mb-8 h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-transparent" />
      <PendingClient orderId={orderId} />
    </div>
  );
}
