"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { updateAccountPassword } from "./actions";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

export function AccountPasswordForm({
  hasPassword,
}: {
  hasPassword: boolean;
}) {
  const [state, formAction, isPending] = useActionState(updateAccountPassword, {
    success: false,
  });
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const validationMessage = useMemo(() => {
    if (!password && !confirmPassword) return null;
    if (!password || !confirmPassword) return "Both password fields are required.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (password !== confirmPassword) return "Passwords do not match.";
    return null;
  }, [confirmPassword, password]);
  const canSubmit = Boolean(password && confirmPassword && !validationMessage);

  useEffect(() => {
    if (state.success) {
      toast.success(hasPassword ? "Password updated" : "Password set");
      formRef.current?.reset();
      window.setTimeout(() => {
        setPassword("");
        setConfirmPassword("");
      }, 0);
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [hasPassword, router, state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-xs font-medium text-black/60">Password</span>
          <span className="relative block">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
              autoComplete="new-password"
              className="h-11 w-full rounded-md border border-black/[0.12] bg-white px-3 pr-10 text-sm text-black outline-none transition-colors focus:border-[#E58A35] focus:ring-2 focus:ring-[#F4C37B]/30"
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
        <label className="space-y-2">
          <span className="text-xs font-medium text-black/60">Confirm password</span>
          <span className="relative block">
            <input
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              required
              autoComplete="new-password"
              className="h-11 w-full rounded-md border border-black/[0.12] bg-white px-3 pr-10 text-sm text-black outline-none transition-colors focus:border-[#E58A35] focus:ring-2 focus:ring-[#F4C37B]/30"
            />
            <button
              type="button"
              aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              onClick={() => setShowConfirmPassword((value) => !value)}
              className="absolute right-2 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded text-black/45 hover:bg-black/[0.04] hover:text-black"
            >
              {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </span>
        </label>
      </div>

      {validationMessage ? (
        <p className="rounded-md border border-[#F1D2CC] bg-[#FFF7F5] px-3 py-2 text-sm text-[#8D4336]">
          {validationMessage}
        </p>
      ) : null}
      {state.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-md border border-[#CFE8D5] bg-[#EFF9F1] px-3 py-2 text-sm text-[#226236]">
          {hasPassword
            ? "Your password has been updated."
            : "Password sign-in is now available for this Gmail address."}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending || !canSubmit}
        className="inline-flex h-10 items-center rounded-md border border-[#E58A35] bg-[#E58A35] px-4 text-sm font-medium text-white transition-colors hover:bg-[#cf7626] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Saving..." : hasPassword ? "Update password" : "Set password"}
      </button>
    </form>
  );
}
