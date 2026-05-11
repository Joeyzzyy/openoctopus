"use client";

import { useState } from "react";
import { createTopUpCheckoutSession } from "./actions";

const PRESET_AMOUNTS = [5, 10, 20, 50, 100] as const;

export function TopUpForm() {
  const [amount, setAmount] = useState(5);

  return (
    <form action={createTopUpCheckoutSession} className="rounded-2xl border border-black/[0.08] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-sm font-medium text-black">Top up credit</p>
          <p className="mt-1 text-xs text-black/55">Minimum $5. You can enter any amount and pay with Stripe Checkout.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {PRESET_AMOUNTS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount(preset)}
              className={`inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium transition-colors ${
                amount === preset
                  ? "border-black bg-black text-white"
                  : "border-black/12 bg-[#FCFCFA] text-black/70 hover:bg-black/[0.04]"
              }`}
            >
              ${preset}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm text-black/70">
          <span>Amount</span>
          <input
            type="number"
            min={5}
            step={1}
            name="amountUsd"
            value={amount}
            onChange={(event) => setAmount(Number(event.target.value || 5))}
            className="h-9 w-32 rounded-md border border-black/[0.12] bg-white px-3 text-sm text-black outline-none"
          />
          <span className="text-black/45">USD</span>
        </label>

        <button
          type="submit"
          className="inline-flex h-9 w-fit items-center justify-center rounded-md bg-[#111827] px-4 text-xs font-medium text-white transition-colors hover:bg-[#0B1220]"
        >
          Continue to Checkout
        </button>
      </div>
    </form>
  );
}
