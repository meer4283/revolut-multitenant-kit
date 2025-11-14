"use client";

import { useMemo } from "react";

type Props = {
  onSetTotalMinor?: (amountMinor: number) => void;
  currentTotalMinor: number;
  currency?: string;
};

export default function TestCardsQA({
  onSetTotalMinor,
  currentTotalMinor,
  currency = "GBP",
}: Props) {
  const isSandbox =
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_REVOLUT_MODE !== "prod";

  const searchParams =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const forceQA = searchParams?.get("qa") === "1";

  const show = isSandbox || forceQA;

  const fmt = (minor: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(minor / 100);

  const tests = useMemo(
    () => [
      { label: "VISA (success)", card: "4929 4205 7359 5709", hint: "Any CVV / future expiry" },
      { label: "MC (success)", card: "5281 4388 0180 4148", hint: "Any CVV / future expiry" },
      { label: "3-DS fail @ ≥ £25", card: "4242 4242 4242 4242", hint: "Set total ≥ £25.00" },
      { label: "Insufficient funds", card: "4929 5736 3812 5985", hint: "Declined" },
      { label: "Expired card", card: "4532 3367 4387 4205", hint: "Declined" },
      { label: "Do not honour", card: "2720 9988 3777 9594", hint: "Declined" },
      { label: "Challenge failed", card: "5215 6741 1512 7070", hint: "3-DS failed" },
      { label: "Slow auth scenario", card: "2223 0000 1047 9399", hint: "Authorisation pending" },
    ],
    []
  );

  if (!show) return null;

  const set25 = () => onSetTotalMinor?.(2500);
  const set100 = () => onSetTotalMinor?.(10000);

  return (
    <div className="mt-8 rounded-lg border p-4">
      <div className="mb-2 text-sm font-semibold">
        Sandbox QA Panel {isSandbox ? "(Sandbox)" : "(Forced via ?qa=1)"}
      </div>

      <div className="mb-3 text-xs text-gray-600">
        Click to copy a test card then paste it into Revolut's popup. Use the buttons to set useful totals.
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {tests.map((t) => (
          <button
            key={t.card}
            onClick={() => navigator.clipboard.writeText(t.card)}
            className="flex items-center justify-between rounded border px-3 py-2 text-left text-sm hover:bg-gray-50"
            title="Copy card number"
          >
            <span className="mr-3">
              <span className="block font-medium">{t.label}</span>
              <span className="block text-xs text-gray-500">{t.hint}</span>
            </span>
            <span className="select-all rounded bg-gray-100 px-2 py-1 text-xs font-mono">
              {t.card}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-600">
          Current total: <strong>{fmt(currentTotalMinor)}</strong>
        </span>
        <span className="mx-1 text-gray-400">•</span>
        <button
          onClick={set25}
          className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
          title="Trigger 3-DS fail scenarios @ ≥ £25"
        >
          Set total to {fmt(2500)}
        </button>
        <button
          onClick={set100}
          className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
          title="Higher amount test"
        >
          Set total to {fmt(10000)}
        </button>
      </div>
    </div>
  );
}
