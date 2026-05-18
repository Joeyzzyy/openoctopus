"use client";

import { useState } from "react";
import { WalletCards } from "lucide-react";
import { createTopUpCheckoutSession } from "./actions";

const PRESET_AMOUNTS = [5, 10, 20, 50, 100] as const;

export function TopUpForm({ balanceLabel }: { balanceLabel?: string | null }) {
  const [amount, setAmount] = useState(5);

  return (
    <form action={createTopUpCheckoutSession} className="h-full rounded-2xl border border-[#BAE6FD] bg-[#F0F9FF] p-4 shadow-sm">
      <div className="flex h-full flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#0284C7]">
            <WalletCards className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] tracking-[0.35px] text-black/60">Wallet balance</p>
            <p className="mt-1 text-2xl font-medium tracking-tight text-black">
              {balanceLabel ?? "$0.00"}
            </p>
            <p className="mt-2 text-xs leading-5 text-black/50">Top up with Stripe Checkout.</p>
          </div>
        </div>

        <div className="mt-auto flex flex-wrap gap-2">
          {PRESET_AMOUNTS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount(preset)}
              className={`inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium transition-colors ${
                amount === preset
                  ? "border-[#38BDF8] bg-[#E0F2FE] text-[#0369A1]"
                  : "border-[#BAE6FD] bg-white text-[#075985] hover:bg-[#E0F2FE]"
              }`}
            >
              ${preset}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="flex min-w-0 flex-1 items-center gap-2 text-sm text-black/70">
            <span className="sr-only">Amount</span>
            <input
              type="number"
              min={1}
              step={1}
              name="amountUsd"
              value={amount}
              onChange={(event) => setAmount(Number(event.target.value || 1))}
              className="h-9 min-w-0 flex-1 rounded-md border border-[#BAE6FD] bg-white px-3 text-sm text-black outline-none focus:border-[#38BDF8]"
            />
            <span className="text-black/45">USD</span>
          </label>

          <button
            type="submit"
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-[#1F8A4C] px-4 text-xs font-medium text-white transition-colors hover:bg-[#176D3D]"
          >
            Top up
          </button>
        </div>
      </div>
    </form>
  );
}
