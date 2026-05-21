"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff } from "lucide-react";
import { AuthInlineAlert } from "@/components/auth/auth-inline-alert";
import { getFriendlyAuthError } from "@/lib/auth-error";

export function EmailPasswordSignInForm({
  nextPath = "/dashboard",
}: {
  nextPath?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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

      router.replace(nextPath);
      router.refresh();
    } catch (err) {
      setError(
        getFriendlyAuthError(err instanceof Error ? err.message : "Email sign-in failed")
      );
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
          className="h-11 w-full rounded-md border border-black/[0.12] bg-white px-3 text-sm text-black outline-none transition-colors focus:border-[#38BDF8] focus:ring-2 focus:ring-[#BAE6FD]/30"
        />
      </label>
      <label className="block space-y-2">
        <span className="text-xs font-medium text-black/55">Password</span>
        <span className="relative block">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            className="h-11 w-full rounded-md border border-black/[0.12] bg-white px-3 pr-10 text-sm text-black outline-none transition-colors focus:border-[#38BDF8] focus:ring-2 focus:ring-[#BAE6FD]/30"
          />
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-2 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded text-black/45 hover:bg-black/[0.04] hover:text-black"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </span>
      </label>

      {error ? (
        <AuthInlineAlert title={error.title} message={error.message} />
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
