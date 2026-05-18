"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { updateAccountPassword } from "./actions";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

export function AccountPasswordForm({
  hasPassword,
  labels = {
    password: "Password",
    confirmPassword: "Confirm password",
    hidePassword: "Hide password",
    showPassword: "Show password",
    hideConfirmPassword: "Hide confirm password",
    showConfirmPassword: "Show confirm password",
    required: "Both password fields are required.",
    minLength: "Password must be at least 8 characters.",
    mismatch: "Passwords do not match.",
    updatedToast: "Password updated",
    setToast: "Password set",
    updatedSuccess: "Your password has been updated.",
    setSuccess: "Password sign-in is now available for this Gmail address.",
    saving: "Saving...",
    updatePassword: "Update password",
    setPassword: "Set password",
  },
}: {
  hasPassword: boolean;
  labels?: {
    password: string;
    confirmPassword: string;
    hidePassword: string;
    showPassword: string;
    hideConfirmPassword: string;
    showConfirmPassword: string;
    required: string;
    minLength: string;
    mismatch: string;
    updatedToast: string;
    setToast: string;
    updatedSuccess: string;
    setSuccess: string;
    saving: string;
    updatePassword: string;
    setPassword: string;
  };
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
    if (!password || !confirmPassword) return labels.required;
    if (password.length < 8) return labels.minLength;
    if (password !== confirmPassword) return labels.mismatch;
    return null;
  }, [confirmPassword, labels, password]);
  const canSubmit = Boolean(password && confirmPassword && !validationMessage);

  useEffect(() => {
    if (state.success) {
      toast.success(hasPassword ? labels.updatedToast : labels.setToast);
      formRef.current?.reset();
      window.setTimeout(() => {
        setPassword("");
        setConfirmPassword("");
      }, 0);
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [hasPassword, labels, router, state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-xs font-medium text-black/60">{labels.password}</span>
          <span className="relative block">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
              autoComplete="new-password"
              className="h-11 w-full rounded-md border border-black/[0.12] bg-white px-3 pr-10 text-sm text-black outline-none transition-colors focus:border-[#38BDF8] focus:ring-2 focus:ring-[#BAE6FD]/30"
            />
            <button
              type="button"
              aria-label={showPassword ? labels.hidePassword : labels.showPassword}
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-2 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded text-black/45 hover:bg-black/[0.04] hover:text-black"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </span>
        </label>
        <label className="space-y-2">
          <span className="text-xs font-medium text-black/60">{labels.confirmPassword}</span>
          <span className="relative block">
            <input
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              required
              autoComplete="new-password"
              className="h-11 w-full rounded-md border border-black/[0.12] bg-white px-3 pr-10 text-sm text-black outline-none transition-colors focus:border-[#38BDF8] focus:ring-2 focus:ring-[#BAE6FD]/30"
            />
            <button
              type="button"
              aria-label={showConfirmPassword ? labels.hideConfirmPassword : labels.showConfirmPassword}
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
            ? labels.updatedSuccess
            : labels.setSuccess}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending || !canSubmit}
        className="inline-flex h-10 items-center rounded-md border border-[#38BDF8] bg-[#38BDF8] px-4 text-sm font-medium text-white transition-colors hover:bg-[#cf7626] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? labels.saving : hasPassword ? labels.updatePassword : labels.setPassword}
      </button>
    </form>
  );
}
