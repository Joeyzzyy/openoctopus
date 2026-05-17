"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <g fill="none" fillRule="evenodd">
        <path
          d="M17.64 9.20455c0-.63818-.05727-1.25182-.16364-1.84091H9v3.48136h4.84364c-.20864 1.125-.84273 2.07818-1.79591 2.71636v2.25818h2.90864c1.70182-1.56682 2.68363-3.87409 2.68363-6.615z"
          fill="#4285F4"
        />
        <path
          d="M9 18c2.43 0 4.46727-.80591 5.95636-2.18045l-2.90863-2.25818c-.80591.54-1.83682.85909-3.04773.85909-2.34409 0-4.32818-1.58318-5.03591-3.71045H.95727v2.33182C2.43818 15.98318 5.48182 18 9 18z"
          fill="#34A853"
        />
        <path
          d="M3.96409 10.71c-.18-.54-.28227-1.11682-.28227-1.71 0-.59318.10227-1.17.28227-1.71V4.95818H.95727C.34773 6.17318 0 7.54773 0 9c0 1.45227.34773 2.82682.95727 4.04182L3.96409 10.71z"
          fill="#FBBC05"
        />
        <path
          d="M9 3.57955c1.32136 0 2.50773.45409 3.44045 1.34591l2.58136-2.58136C13.46318.89182 11.42591 0 9 0 5.48182 0 2.43818 2.01682.95727 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955z"
          fill="#EA4335"
        />
      </g>
    </svg>
  );
}

export function GoogleSignInButton({
  nextPath = "/dashboard",
}: {
  nextPath?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
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
        aria-label="Sign in with Google"
        className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-black/[0.08] bg-[#FCFCFA] px-4 text-sm font-medium text-[#111827] shadow-sm transition-colors hover:bg-black/[0.03] hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
      >
        <GoogleIcon />
        {loading ? "Redirecting..." : "Sign in with Google"}
      </button>
      {error ? (
        <p className="text-center text-[11px] uppercase tracking-[0.8px] text-[#b43828]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
