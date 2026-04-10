"use client";

import { useState } from "react";
import { LoaderCircle, Send } from "lucide-react";
import { PUBLIC_API_BASE_URL } from "@/lib/api-docs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PlaygroundCardProps = {
  models: string[];
};

type PlaygroundResult = {
  status: "idle" | "success" | "error";
  httpStatus?: number;
  body?: string;
};

export function PlaygroundCard({ models }: PlaygroundCardProps) {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(models[0] ?? "");
  const [prompt, setPrompt] = useState("A clean orange octopus mascot on a white background");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<PlaygroundResult>({ status: "idle" });

  const submit = async () => {
    if (!apiKey.trim() || !model || !prompt.trim()) {
      setResult({
        status: "error",
        body: "API key, model, and prompt are required.",
      });
      return;
    }

    setIsSubmitting(true);
    setResult({ status: "idle" });

    try {
      const response = await fetch(`${PUBLIC_API_BASE_URL}/v1/images/generations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model,
          prompt: prompt.trim(),
        }),
      });

      const text = await response.text();

      setResult({
        status: response.ok ? "success" : "error",
        httpStatus: response.status,
        body: text,
      });
    } catch (error) {
      setResult({
        status: "error",
        body: error instanceof Error ? error.message : "Request failed",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-sm border border-black/10 bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-black">Playground</h2>
          <p className="mt-1 max-w-2xl text-sm text-black/55">
            Test one real request with your own API key. This sends a live request to the gateway.
          </p>
        </div>
        <div className="rounded-sm border border-black/10 bg-[#f7f7f4] px-3 py-2 text-xs text-black/60">
          POST {PUBLIC_API_BASE_URL}/v1/images/generations
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-[11px] tracking-[0.35px] text-black/60">API Key</label>
            <Input
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="ooq_your_api_key"
              className="h-10 rounded-[14px] border-[#dde5d8] bg-white/90 font-mono text-sm text-[#162319] placeholder:text-[#8a9385]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] tracking-[0.35px] text-black/60">Model</label>
            <Select value={model} onValueChange={(value) => value && setModel(value)}>
              <SelectTrigger className="h-10 w-full rounded-[14px] border-[#dde5d8] bg-white/90 font-mono text-sm text-[#162319]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border border-[#dde5d8] bg-white text-[#162319]">
                {models.map((item) => (
                  <SelectItem
                    key={item}
                    value={item}
                    className="cursor-pointer text-[#162319] focus:bg-[#f4f8f1] focus:text-[#162319]"
                  >
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] tracking-[0.35px] text-black/60">Prompt</label>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={5}
              className="flex w-full rounded-[14px] border border-[#dde5d8] bg-white/90 px-3 py-2.5 text-sm text-[#162319] outline-none transition-colors placeholder:text-[#8a9385] focus:border-black/20"
              placeholder="Describe the image you want to generate"
            />
          </div>

          <button
            type="button"
            onClick={submit}
            disabled={isSubmitting}
            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[14px] bg-[#111111] px-4 font-mono text-[11px] font-semibold uppercase tracking-[1px] text-white transition-colors hover:bg-[#222222] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {isSubmitting ? "Sending..." : "Send Test Request"}
          </button>
        </div>

        <div className="rounded-[18px] border border-[#dde5d8] bg-[#f7f7f4] p-4">
          <div className="flex items-center justify-between gap-3 border-b border-black/8 pb-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[1px] text-black/50">Response</p>
              <p className="mt-1 text-sm text-black/60">
                A successful request should return a queued task id.
              </p>
            </div>
            {result.httpStatus ? (
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium uppercase ${
                result.status === "success"
                  ? "bg-[#e4f7e8] text-[#1b7a41]"
                  : "bg-[#ffe7e3] text-[#b54432]"
              }`}>
                {result.httpStatus}
              </span>
            ) : null}
          </div>

          <pre className="mt-3 min-h-[260px] overflow-x-auto rounded-[16px] bg-[#17211b] p-4 font-mono text-[11px] leading-6 text-[#f6fbf4]">
            <code>
              {result.body ?? '{\n  "id": "task_uuid",\n  "status": "queued"\n}'}
            </code>
          </pre>
        </div>
      </div>
    </section>
  );
}
