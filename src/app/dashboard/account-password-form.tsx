"use client";

import { useActionState, useEffect, useRef } from "react";
import { updateAccountPassword } from "./actions";
import { toast } from "sonner";

export function AccountPasswordForm({
  hasPassword,
}: {
  hasPassword: boolean;
}) {
  const [state, formAction, isPending] = useActionState(updateAccountPassword, {
    success: false,
  });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      toast.success(hasPassword ? "Password updated" : "Password set");
      formRef.current?.reset();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [hasPassword, state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-xs font-medium text-black/60">Password</span>
          <input
            name="password"
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
            className="h-11 w-full rounded-md border border-black/[0.12] bg-white px-3 text-sm text-black outline-none transition-colors focus:border-[#E58A35] focus:ring-2 focus:ring-[#F4C37B]/30"
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-medium text-black/60">Confirm password</span>
          <input
            name="confirmPassword"
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
            className="h-11 w-full rounded-md border border-black/[0.12] bg-white px-3 text-sm text-black outline-none transition-colors focus:border-[#E58A35] focus:ring-2 focus:ring-[#F4C37B]/30"
          />
        </label>
      </div>

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
        disabled={isPending}
        className="inline-flex h-10 items-center rounded-md border border-[#E58A35] bg-[#E58A35] px-4 text-sm font-medium text-white transition-colors hover:bg-[#cf7626] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Saving..." : hasPassword ? "Update password" : "Set password"}
      </button>
    </form>
  );
}
