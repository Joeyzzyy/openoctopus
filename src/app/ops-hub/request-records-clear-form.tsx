"use client";

import { useId, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
export function RequestRecordsClearForm({
  action,
  apiKeyId,
  apiKeyName,
}: {
  action: (formData: FormData) => void | Promise<void>;
  apiKeyId: string;
  apiKeyName: string;
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const formId = useId();

  return (
    <>
      <form
        id={formId}
        ref={formRef}
        action={action}
        className="mb-4 rounded-2xl border border-[#F1D2CC] bg-[#FFF7F5] p-4 shadow-sm"
      >
        <input type="hidden" name="apiKeyId" value={apiKeyId} />
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-[#8d4336]">清除当前 API Key 的调用记录</p>
            <p className="mt-2 text-xs leading-5 text-[#8d4336]/78">
              将删除 API Key「{apiKeyName}」关联的 inference_requests、全部 usage_events，以及对应的
              usage 扣费流水，包括已找不到请求明细的历史孤儿用量。其余非 usage 钱包流水会保留，并自动重算剩余账本余额。
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[320px]">
            <label className="block">
              <span className="mb-1 block text-[11px] tracking-[0.35px] text-[#8d4336]/70">
                输入“清除”确认
              </span>
              <input
                name="confirmText"
                placeholder="清除"
                required
                className="h-10 w-full rounded-md border border-[#E6C1BB] bg-white px-3 text-sm text-black outline-none transition-colors placeholder:text-black/25 focus:border-[#D89B90]"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                if (formRef.current?.reportValidity()) {
                  setOpen(true);
                }
              }}
              className="inline-flex h-10 items-center justify-center rounded-md bg-[#B54432] px-3 text-xs font-medium text-white transition-colors hover:bg-[#9A3828]"
            >
              清除该 Key 的请求与扣费记录
            </button>
          </div>
        </div>
      </form>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="rounded-2xl border border-[#BAE6FD] bg-[#F8FCFF] p-0 shadow-[0_30px_80px_rgba(17,24,39,0.12)] sm:max-w-lg"
        >
          <DialogHeader className="border-b border-[#BAE6FD] px-5 pb-4 pt-5">
            <DialogTitle className="font-medium text-black">确认清除调用与扣费记录</DialogTitle>
            <DialogDescription className="text-black/55">
              API Key「{apiKeyName}」的请求明细、usage_events 和 usage 扣费流水会被删除。此操作不可撤销。
            </DialogDescription>
          </DialogHeader>

          <div className="px-5 py-5 text-sm leading-6 text-black/68">
            其余非 usage 钱包流水会保留，系统会自动重算剩余账本余额。确认无误后再继续执行。
          </div>

          <DialogFooter className="rounded-none border-t border-[#BAE6FD] bg-transparent p-5 sm:justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-10 items-center justify-center rounded-md border border-[#BAE6FD] bg-white px-3 text-xs font-medium text-black/72 transition-colors hover:bg-[#E0F2FE]"
            >
              取消
            </button>
            <div className="sm:min-w-[180px]">
              <button
                type="submit"
                form={formId}
                className="inline-flex h-10 w-full items-center justify-center rounded-md bg-[#B54432] px-3 text-xs font-medium text-white transition-colors hover:bg-[#9A3828]"
              >
                确认清除
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
