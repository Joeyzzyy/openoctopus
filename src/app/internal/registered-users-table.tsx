"use client";

import { Fragment, useState } from "react";
import { RegisteredUserDeleteButton } from "./registered-user-delete-button";

type RegisteredUser = {
  id: string;
  name: string;
  email: string | null;
  workspaceId: string | null;
  workspaceName: string;
  workspaceSlug: string | null;
  role: string;
  balanceLabel: string;
  walletBreakdown: {
    topupLabel: string;
    systemCreditLabel: string;
    usageLabel: string;
  };
  apiKeys: Array<{
    id: string;
    name: string;
    keyPrefix: string;
    environment: string;
    status: string;
    createdLabel: string;
  }>;
};

export function RegisteredUsersTable({
  users,
  addUserBalanceAction,
  deleteRegisteredUserAction,
}: {
  users: RegisteredUser[];
  addUserBalanceAction: (formData: FormData) => void | Promise<void>;
  deleteRegisteredUserAction: (formData: FormData) => void | Promise<void>;
}) {
  const [expandedUserIds, setExpandedUserIds] = useState<Set<string>>(new Set());

  function toggleUser(userId: string) {
    setExpandedUserIds((current) => {
      const next = new Set(current);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-[#FCFCFA]">
      <table className="w-full min-w-[920px] border-collapse text-left">
        <thead className="bg-black/[0.025] text-[11px] uppercase tracking-[0.35px] text-black/45">
          <tr>
            <th className="px-4 py-3 font-medium">用户</th>
            <th className="px-4 py-3 font-medium">角色</th>
            <th className="px-4 py-3 font-medium">余额</th>
            <th className="px-4 py-3 font-medium">Key 数量</th>
            <th className="px-4 py-3 font-medium">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/[0.06] text-sm">
          {users.map((user) => {
            const expanded = expandedUserIds.has(user.id);

            return (
              <Fragment key={user.id}>
                <tr className={expanded ? "bg-white" : undefined}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-black">{user.name}</p>
                    <p className="mt-1 text-xs text-black/50">{user.email ?? user.id}</p>
                  </td>
                  <td className="px-4 py-3 text-black/65">{user.role}</td>
                  <td className="px-4 py-3 font-medium text-black">{user.balanceLabel}</td>
                  <td className="px-4 py-3 text-black/65">{user.apiKeys.length}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <button
                        type="button"
                        onClick={() => toggleUser(user.id)}
                        className="inline-flex h-8 items-center justify-center rounded-md border border-black/[0.08] bg-white px-3 text-xs font-medium text-black/68 transition-colors hover:bg-black/[0.03]"
                      >
                        {expanded ? "收起明细" : "展开明细"}
                      </button>
                      <div>
                        <RegisteredUserDeleteButton
                          action={deleteRegisteredUserAction}
                          userId={user.id}
                          email={user.email ?? user.id}
                        />
                      </div>
                    </div>
                  </td>
                </tr>

                {expanded ? (
                  <tr className="bg-white">
                    <td colSpan={5} className="px-4 pb-5 pt-0">
                      <div className="rounded-2xl border border-black/[0.06] bg-[#FCFCFA] p-4">
                        <div className="grid gap-3 text-xs text-black/55 md:grid-cols-3">
                          <div>
                            <p className="text-[11px] text-black/35">Workspace</p>
                            <p className="mt-1 font-medium text-black/75">{user.workspaceName}</p>
                            <p className="mt-1 break-all text-black/40">
                              {user.workspaceId ?? "无 workspace"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] text-black/35">Workspace Slug</p>
                            <p className="mt-1 break-all text-black/70">
                              {user.workspaceSlug ?? "none"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] text-black/35">当前余额</p>
                            <p className="mt-1 font-medium text-black">{user.balanceLabel}</p>
                          </div>
                          <div>
                            <p className="text-[11px] text-black/35">用户充值入账</p>
                            <p className="mt-1 text-black/70">{user.walletBreakdown.topupLabel}</p>
                          </div>
                          <div>
                            <p className="text-[11px] text-black/35">系统赠送入账</p>
                            <p className="mt-1 text-black/70">
                              {user.walletBreakdown.systemCreditLabel}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] text-black/35">已消耗</p>
                            <p className="mt-1 text-black/70">{user.walletBreakdown.usageLabel}</p>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_420px]">
                          <div>
                            <p className="mb-2 text-[11px] text-black/35">旗下 Key</p>
                            {user.apiKeys.length > 0 ? (
                              <div className="grid gap-2 md:grid-cols-2">
                                {user.apiKeys.map((apiKey) => (
                                  <div
                                    key={apiKey.id}
                                    className="rounded-lg border border-black/[0.06] bg-white px-3 py-2"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="truncate text-xs font-medium text-black">
                                        {apiKey.name || "未命名 Key"}
                                      </span>
                                      <span className="shrink-0 rounded-full bg-black/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-[0.25px] text-black/55">
                                        {apiKey.status}
                                      </span>
                                    </div>
                                    <p className="mt-1 text-[11px] text-black/45">
                                      {apiKey.keyPrefix} · {apiKey.environment} · {apiKey.createdLabel}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-black/35">暂无 Key</span>
                            )}
                          </div>

                          <div>
                            <p className="mb-2 text-[11px] text-black/35">后台加余额</p>
                            {user.workspaceId ? (
                              <form
                                action={addUserBalanceAction}
                                className="rounded-xl border border-black/[0.06] bg-white p-3"
                              >
                                <input type="hidden" name="userId" value={user.id} />
                                <div className="flex gap-2">
                                  <input
                                    name="amount"
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    placeholder="金额 USD"
                                    className="h-8 w-24 rounded-md border border-black/10 bg-white px-2 text-xs outline-none"
                                  />
                                  <input
                                    name="description"
                                    placeholder="备注（可选）"
                                    className="h-8 min-w-0 flex-1 rounded-md border border-black/10 bg-white px-2 text-xs outline-none"
                                  />
                                  <button
                                    type="submit"
                                    className="h-8 shrink-0 rounded-md bg-black px-3 text-xs font-medium text-white hover:bg-black/85"
                                  >
                                    加款
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <span className="text-xs text-black/40">无 workspace，不能加款</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
