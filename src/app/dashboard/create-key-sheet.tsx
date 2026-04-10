"use client";

import { useActionState, useState, useEffect, useRef } from "react";
import { createApiKey } from "./actions";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Check, KeyRound } from "lucide-react";
import { toast } from "sonner";
import {
  PUBLIC_API_BASE_URL,
} from "@/lib/api-docs";

const environments = ["Production", "Development", "Server", "Partner"];

export function CreateKeySheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, formAction, isPending] = useActionState(createApiKey, {
    success: false,
  });
  const [copied, setCopied] = useState(false);
  const [env, setEnv] = useState("Production");
  const formRef = useRef<HTMLFormElement>(null);

  // Handle success/error from action
  useEffect(() => {
    if (state.success && state.data?.secret) {
      toast.success("API key created");
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      // Reset form when closing
      formRef.current?.reset();
      setEnv("Production");
    }
    onOpenChange(nextOpen);
  };

  const copySecret = () => {
    if (state.data?.secret) {
      navigator.clipboard.writeText(state.data.secret as string);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100vh-2rem)] overflow-y-auto rounded-[28px] border border-[#dde5d8] bg-[linear-gradient(180deg,#fffdf8_0%,#f5f8f0_100%)] p-0 shadow-[0_30px_80px_rgba(34,47,31,0.14)] sm:max-w-xl"
      >
        <DialogHeader className="border-b border-[#e1e8dd] px-5 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
          <DialogTitle className="font-mono text-sm uppercase tracking-[1px] text-[#162319]">
            Create API Key
          </DialogTitle>
          <DialogDescription className="text-[#566254]">
            Generate a new key for your workspace. The secret is shown only
            once.
          </DialogDescription>
        </DialogHeader>

        {state.success && state.data?.secret ? (
          /* ---------- Success: show secret ---------- */
          <div className="space-y-5 px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
            <div className="rounded-[16px] border border-[#cfe7d7] bg-[#eef8f0] p-4">
              <p className="font-mono text-[10px] uppercase tracking-[1px] text-[#167a3d]">
                Key Created
              </p>
              <p className="mt-1 text-sm leading-6 text-[#2d4a35]">
                Copy the secret now. It will not be shown again after you close this window.
              </p>
              <p className="mt-2 font-mono text-xs text-[#167a3d]">
                Prefix: {state.data.keyPrefix as string}
              </p>
            </div>

            <div>
              <Label className="font-mono text-[10px] uppercase tracking-[1px] text-black/45">
                Secret (copy now — it won&apos;t be shown again)
              </Label>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 rounded-[14px] border border-[#dde5d8] bg-white px-3 py-2.5 font-mono text-[11px] break-all text-[#162319]">
                  {state.data.secret as string}
                </code>
                <button
                  type="button"
                  onClick={copySecret}
                  className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-[12px] border border-[#dde5d8] bg-white transition-colors hover:bg-[#f4f8f1]"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-[#168a42]" />
                  ) : (
                    <Copy className="h-4 w-4 text-black/50" />
                  )}
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[16px] border border-[#dde5d8] bg-white/90 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[1px] text-black/45">
                  Base URL
                </p>
                <code className="mt-2 block break-all font-mono text-[11px] text-[#111111]">
                  {PUBLIC_API_BASE_URL}
                </code>
              </div>
              <div className="rounded-[16px] border border-[#dde5d8] bg-white/90 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[1px] text-black/45">
                  Next Step
                </p>
                <p className="mt-2 text-sm leading-6 text-black/60">
                  Use the quickstart section on the dashboard to send your first request.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="#quickstart"
                onClick={() => handleClose(false)}
                className="inline-flex h-11 cursor-pointer items-center justify-center rounded-[14px] border border-[#dde5d8] bg-white px-4 font-mono text-[11px] font-semibold uppercase tracking-[1px] text-[#162319] transition-colors hover:bg-[#f4f8f1] sm:flex-1"
              >
                Open Quickstart
              </Link>
              <button
                type="button"
                onClick={() => handleClose(false)}
                className="inline-flex h-11 cursor-pointer items-center justify-center rounded-[14px] bg-[#1f5f39] px-4 font-mono text-[11px] font-semibold uppercase tracking-[1px] text-white transition-colors hover:bg-[#1a5130] sm:flex-1"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* ---------- Form ---------- */
          <form
            ref={formRef}
            action={formAction}
            className="space-y-5 px-5 pb-5 pt-5 sm:px-6 sm:pb-6"
          >
            <div className="space-y-2">
              <Label
                htmlFor="key-name"
                className="font-mono text-[10px] uppercase tracking-[1px] text-black/45"
              >
                Key Name
              </Label>
              <Input
                id="key-name"
                name="name"
                placeholder="e.g. production-api"
                required
                className="rounded-[14px] border-[#dde5d8] bg-white/90 font-mono text-sm text-[#162319] placeholder:text-[#8a9385]"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-mono text-[10px] uppercase tracking-[1px] text-black/45">
                Environment
              </Label>
              <input type="hidden" name="environment" value={env} />
              <Select value={env} onValueChange={(v) => v && setEnv(v)}>
                <SelectTrigger className="w-full rounded-[14px] border-[#dde5d8] bg-white/90 font-mono text-sm text-[#162319]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border border-[#dde5d8] bg-white text-[#162319]">
                  {environments.map((e) => (
                    <SelectItem
                      key={e}
                      value={e}
                      className="cursor-pointer text-[#162319] focus:bg-[#f4f8f1] focus:text-[#162319]"
                    >
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="key-budget"
                className="font-mono text-[10px] uppercase tracking-[1px] text-black/45"
              >
                Monthly Budget (USD)
              </Label>
              <Input
                id="key-budget"
                name="monthlyBudget"
                type="number"
                min={0}
                step={0.01}
                defaultValue={0}
                className="rounded-[14px] border-[#dde5d8] bg-white/90 font-mono text-sm text-[#162319] placeholder:text-[#8a9385]"
              />
            </div>

            {state.error && (
              <p className="rounded-[14px] bg-[#fff4f1] px-3 py-2.5 font-mono text-xs text-[#c65342]">
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-[14px] bg-[#1f5f39] px-4 py-3 font-mono text-[11px] font-semibold uppercase tracking-[1px] text-white transition-colors hover:bg-[#1a5130] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <KeyRound className="h-4 w-4" />
              {isPending ? "Creating..." : "Create Key"}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
