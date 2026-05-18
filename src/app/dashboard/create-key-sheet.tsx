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

const environments = ["Production", "Development", "Server", "Partner"] as const;

export function CreateKeySheet({
  open,
  onOpenChange,
  labels = {
    title: "Create API Key",
    description: "Generate a new key for your workspace. The secret is shown only once.",
    createdToast: "API key created",
    createdTitle: "Key Created",
    createdHint: "Copy the secret now. It will not be shown again after you close this window.",
    prefix: "Prefix",
    secret: "Secret (copy now — it won't be shown again)",
    baseUrl: "Base URL",
    nextStep: "Next Step",
    nextStepHint: "Use the quickstart section on the dashboard to send your first request.",
    openQuickstart: "Open Quickstart",
    done: "Done",
    keyName: "Key Name",
    keyNamePlaceholder: "e.g. production-api",
    environment: "Environment",
    monthlyBudget: "Monthly Budget (USD)",
    creating: "Creating...",
    button: "Create Key",
    environments: {
      Production: "Production",
      Development: "Development",
      Server: "Server",
      Partner: "Partner",
    },
  },
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labels?: {
    title: string;
    description: string;
    createdToast: string;
    createdTitle: string;
    createdHint: string;
    prefix: string;
    secret: string;
    baseUrl: string;
    nextStep: string;
    nextStepHint: string;
    openQuickstart: string;
    done: string;
    keyName: string;
    keyNamePlaceholder: string;
    environment: string;
    monthlyBudget: string;
    creating: string;
    button: string;
    environments: Record<(typeof environments)[number], string>;
  };
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
      toast.success(labels.createdToast);
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [labels.createdToast, state]);

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
        className="max-h-[calc(100vh-2rem)] overflow-y-auto rounded-[28px] border border-black/[0.08] bg-[#F8FCFF] p-0 shadow-[0_30px_80px_rgba(17,24,39,0.12)] sm:max-w-xl"
      >
        <DialogHeader className="border-b border-black/[0.08] px-5 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
          <DialogTitle className="text-sm font-semibold uppercase tracking-[1px] text-[#111827]">
            {labels.title}
          </DialogTitle>
          <DialogDescription className="text-black/55">
            {labels.description}
          </DialogDescription>
        </DialogHeader>

        {state.success && state.data?.secret ? (
          /* ---------- Success: show secret ---------- */
          <div className="space-y-5 px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
            <div className="rounded-2xl border border-[#D7EAD9] bg-[#F2FBF4] p-4">
              <p className="text-[10px] uppercase tracking-[1px] text-[#167A3D]">
                {labels.createdTitle}
              </p>
              <p className="mt-1 text-sm leading-6 text-[#2D4A35]">
                {labels.createdHint}
              </p>
              <p className="mt-2 font-mono text-xs text-[#167A3D]">
                {labels.prefix}: {state.data.keyPrefix as string}
              </p>
            </div>

            <div>
              <Label className="text-[10px] uppercase tracking-[1px] text-black/45">
                {labels.secret}
              </Label>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 break-all rounded-2xl border border-black/[0.08] bg-white px-3 py-2.5 font-mono text-[11px] text-[#111827]">
                  {state.data.secret as string}
                </code>
                <button
                  type="button"
                  onClick={copySecret}
                  className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md border border-[#BAE6FD] bg-white transition-colors hover:bg-[#E0F2FE]"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-[#15803D]" />
                  ) : (
                    <Copy className="h-4 w-4 text-black/50" />
                  )}
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-black/[0.08] bg-white p-4">
                <p className="text-[10px] uppercase tracking-[1px] text-black/45">
                  {labels.baseUrl}
                </p>
                <code className="mt-2 block break-all font-mono text-[11px] text-[#111827]">
                  {PUBLIC_API_BASE_URL}
                </code>
              </div>
              <div className="rounded-2xl border border-black/[0.08] bg-white p-4">
                <p className="text-[10px] uppercase tracking-[1px] text-black/45">
                  {labels.nextStep}
                </p>
                <p className="mt-2 text-sm leading-6 text-black/60">
                  {labels.nextStepHint}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="#quickstart"
                onClick={() => handleClose(false)}
                className="inline-flex h-11 cursor-pointer items-center justify-center rounded-md border border-[#BAE6FD] bg-white px-4 text-[11px] font-semibold uppercase tracking-[1px] text-[#075985] transition-colors hover:bg-[#E0F2FE] sm:flex-1"
              >
                {labels.openQuickstart}
              </Link>
              <button
                type="button"
                onClick={() => handleClose(false)}
                className="inline-flex h-11 cursor-pointer items-center justify-center rounded-md bg-[#1F8A4C] px-4 text-[11px] font-semibold uppercase tracking-[1px] text-white transition-colors hover:bg-[#176D3D] sm:flex-1"
              >
                {labels.done}
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
                className="text-[10px] uppercase tracking-[1px] text-black/45"
              >
                {labels.keyName}
              </Label>
              <Input
                id="key-name"
                name="name"
                placeholder={labels.keyNamePlaceholder}
                required
                className="rounded-2xl border-black/[0.08] bg-white text-sm text-[#111827] placeholder:text-black/35"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-[1px] text-black/45">
                {labels.environment}
              </Label>
              <input type="hidden" name="environment" value={env} />
              <Select value={env} onValueChange={(v) => v && setEnv(v)}>
                <SelectTrigger className="w-full rounded-2xl border-black/[0.08] bg-white text-sm text-[#111827]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border border-black/[0.08] bg-white text-[#111827]">
                  {environments.map((e) => (
                    <SelectItem
                      key={e}
                      value={e}
                      className="cursor-pointer text-[#111827] focus:bg-[#E0F2FE] focus:text-[#111827]"
                    >
                      {labels.environments[e]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="key-budget"
                className="text-[10px] uppercase tracking-[1px] text-black/45"
              >
                {labels.monthlyBudget}
              </Label>
              <Input
                id="key-budget"
                name="monthlyBudget"
                type="number"
                min={0}
                step={0.01}
                defaultValue={0}
                className="rounded-2xl border-black/[0.08] bg-white text-sm text-[#111827] placeholder:text-black/35"
              />
            </div>

            {state.error && (
              <p className="rounded-2xl border border-[#F1D2CC] bg-[#FFF7F5] px-3 py-2.5 text-xs text-[#B54432]">
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-[#1F8A4C] px-4 py-3 text-[11px] font-semibold uppercase tracking-[1px] text-white transition-colors hover:bg-[#176D3D] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <KeyRound className="h-4 w-4" />
              {isPending ? labels.creating : labels.button}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
