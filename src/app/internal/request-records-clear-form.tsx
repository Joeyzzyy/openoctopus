"use client";

import { SubmitButton } from "./submit-button";

export function RequestRecordsClearForm({
  action,
  apiKeyId,
  apiKeyName,
}: {
  action: (formData: FormData) => void | Promise<void>;
  apiKeyId: string;
  apiKeyName: string;
}) {
  return (
    <form
      action={action}
      className="mb-4 rounded-sm border border-[#f0d5d0] bg-[#fff5f3] p-4"
      onSubmit={(event) => {
        const confirmed = window.confirm(
          `确认清除 API Key「${apiKeyName}」的请求记录、usage_events 和 usage 扣费流水？此操作不可撤销。`
        );

        if (!confirmed) {
          event.preventDefault();
        }
      }}
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
              className="h-9 w-full rounded-sm border border-[#f0d5d0] bg-white px-3 text-sm text-black outline-none placeholder:text-black/25 focus:border-[#d89b90]"
            />
          </label>
          <SubmitButton
            label="清除该 Key 的请求与扣费记录"
            pendingLabel="正在清除..."
            tone="danger"
          />
        </div>
      </div>
    </form>
  );
}
