"use client";

import { useActionState, useState, useEffect, useRef } from "react";
import { createApiKey } from "./actions";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle className="font-mono text-sm uppercase tracking-[1px]">
            Create API Key
          </SheetTitle>
          <SheetDescription>
            Generate a new key for your workspace. The secret is shown only
            once.
          </SheetDescription>
        </SheetHeader>

        {state.success && state.data?.secret ? (
          /* ---------- Success: show secret ---------- */
          <div className="px-4 pb-4 space-y-4">
            <div className="rounded-[14px] border border-[#168a42]/20 bg-[#dff6e6] p-4">
              <p className="font-mono text-[10px] uppercase tracking-[1px] text-[#167a3d]">
                Key Created
              </p>
              <p className="mt-1 font-mono text-xs text-[#167a3d]">
                Prefix: {state.data.keyPrefix as string}
              </p>
            </div>

            <div>
              <Label className="font-mono text-[10px] uppercase tracking-[1px] text-black/45">
                Secret (copy now — it won&apos;t be shown again)
              </Label>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 rounded-[12px] border border-black/8 bg-[#faf9f6] px-3 py-2 font-mono text-[11px] break-all text-[#111111]">
                  {state.data.secret as string}
                </code>
                <button
                  type="button"
                  onClick={copySecret}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border border-black/8 bg-white transition-colors hover:bg-black/[0.04]"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-[#168a42]" />
                  ) : (
                    <Copy className="h-4 w-4 text-black/50" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleClose(false)}
              className="w-full rounded-[14px] bg-[#111111] px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[1px] text-white"
            >
              Done
            </button>
          </div>
        ) : (
          /* ---------- Form ---------- */
          <form ref={formRef} action={formAction} className="px-4 pb-4 space-y-5">
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
                className="rounded-[12px] border-black/8 bg-[#faf9f6] font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-mono text-[10px] uppercase tracking-[1px] text-black/45">
                Environment
              </Label>
              <input type="hidden" name="environment" value={env} />
              <Select value={env} onValueChange={(v) => v && setEnv(v)}>
                <SelectTrigger className="w-full rounded-[12px] border-black/8 bg-[#faf9f6] font-mono text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {environments.map((e) => (
                    <SelectItem key={e} value={e}>
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
                className="rounded-[12px] border-black/8 bg-[#faf9f6] font-mono text-sm"
              />
            </div>

            {state.error && (
              <p className="rounded-[12px] bg-red-50 px-3 py-2 font-mono text-xs text-red-600">
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-[14px] bg-[#111111] px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[1px] text-white disabled:opacity-50"
            >
              <KeyRound className="h-4 w-4" />
              {isPending ? "Creating..." : "Create Key"}
            </button>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
