"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function EmailPasswordSignInForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw authError;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Email sign-in failed");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block space-y-2">
        <span className="text-xs font-medium text-black/55">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="h-11 w-full rounded-md border border-black/[0.12] bg-white px-3 text-sm text-black outline-none transition-colors focus:border-[#E58A35] focus:ring-2 focus:ring-[#F4C37B]/30"
        />
      </label>
      <label className="block space-y-2">
        <span className="text-xs font-medium text-black/55">Password</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="h-11 w-full rounded-md border border-black/[0.12] bg-white px-3 text-sm text-black outline-none transition-colors focus:border-[#E58A35] focus:ring-2 focus:ring-[#F4C37B]/30"
        />
      </label>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-11 w-full items-center justify-center rounded-md border border-[#111827] bg-[#111827] px-4 text-sm font-medium text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Signing in..." : "Sign in with email"}
      </button>
    </form>
  );
}
