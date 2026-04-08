"use client";

import { useState } from "react";
import { LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=/dashboard`;
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });

      if (authError) {
        throw authError;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={loading}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[#111111] px-4 font-mono text-[11px] font-semibold uppercase tracking-[1px] text-white transition-colors hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <LogIn className="h-4 w-4" />
        {loading ? "Redirecting..." : "Continue With Google"}
      </button>
      {error ? (
        <p className="font-mono text-[11px] uppercase tracking-[0.8px] text-[#b43828]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
