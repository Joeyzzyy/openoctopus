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

export function RegisteredUserDeleteButton({
  action,
  userId,
  email,
  disabled,
}: {
  action: (formData: FormData) => void | Promise<void>;
  userId: string;
  email: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const formId = useId();

  return (
    <>
      <form id={formId} ref={formRef} action={action}>
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="email" value={email} />
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className="inline-flex h-8 items-center justify-center rounded-md border border-[#E6C1BB] bg-[#FFF7F5] px-3 text-xs font-medium text-[#9A3828] transition-colors hover:bg-[#FFEDE9] disabled:cursor-not-allowed disabled:border-black/[0.06] disabled:bg-black/[0.03] disabled:text-black/35"
        >
          删除用户
        </button>
      </form>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="rounded-2xl border border-black/[0.08] bg-[#FCFCFA] p-0 shadow-[0_30px_80px_rgba(17,24,39,0.12)] sm:max-w-lg"
        >
          <DialogHeader className="border-b border-black/[0.08] px-5 pb-4 pt-5">
            <DialogTitle className="font-medium text-black">确认删除用户</DialogTitle>
            <DialogDescription className="text-black/55">
              将删除注册用户「{email}」。只有无 workspace 归属的用户允许删除。
            </DialogDescription>
          </DialogHeader>

          <div className="px-5 py-5 text-sm leading-6 text-black/68">
            这个操作会从 auth 用户表删除该用户，并级联删除对应 profile。操作不可撤销。
          </div>

          <DialogFooter className="rounded-none border-t border-black/[0.08] bg-transparent p-5 sm:justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-10 items-center justify-center rounded-md border border-black/[0.08] bg-white px-3 text-xs font-medium text-black/72 transition-colors hover:bg-black/[0.03]"
            >
              取消
            </button>
            <button
              type="submit"
              form={formId}
              className="inline-flex h-10 min-w-[140px] items-center justify-center rounded-md bg-[#B54432] px-3 text-xs font-medium text-white transition-colors hover:bg-[#9A3828]"
            >
              确认删除
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
