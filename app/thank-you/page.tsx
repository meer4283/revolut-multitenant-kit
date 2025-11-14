export const metadata = { title: "Thank you!" };

export default function ThankYou({ searchParams }: { searchParams: { orderId?: string } }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="mb-2 text-2xl font-semibold">Payment received 🎉</h1>
      <p className="text-gray-600">
        Your order{searchParams?.orderId ? ` ${searchParams.orderId}` : ""} is confirmed.
      </p>
      <a href="/checkout" className="mt-6 inline-block rounded border px-4 py-2">Continue shopping</a>
    </div>
  );
}
