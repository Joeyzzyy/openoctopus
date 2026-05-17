"use client";

import { Fragment, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RegisteredUserDeleteButton } from "./registered-user-delete-button";

type UserRequestRow = {
  id: string;
  workspace_id?: string | null;
  api_key_id?: string | null;
  status: string;
  capability: string;
  public_model_slug: string;
  sourceLabel: string;
  apiKeyName: string;
  apiKeyPrefix: string;
  apiKeyEnvironment: string;
  customerChargeLabel: string;
  providerCostLabel: string;
  profitLabel: string;
  createdLabel: string;
  completedLabel: string;
  created_at?: string;
  completed_at?: string | null;
  error_code: string | null;
  error_message: string | null;
  upstreamRawText: string;
  packagedOutputText: string;
};

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
  recentRequests?: UserRequestRow[];
};

type RequestPageState = {
  rows: UserRequestRow[];
  page: number;
  totalPages: number;
  totalCount: number;
  loading: boolean;
  error: string | null;
};

type UserPagination = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  search: string;
};

function requestStatusClassName(status: string) {
  if (status === "succeeded") {
    return "bg-[#E8F7ED] text-[#1F7A3D] border-[#CBEBD5]";
  }
  if (status === "failed") {
    return "bg-[#FFF0EC] text-[#B54432] border-[#F0C7BD]";
  }
  return "bg-black/[0.06] text-black/60 border-transparent";
}

function formatCustomerResponseText(request: UserRequestRow) {
  try {
    const parsed = JSON.parse(request.packagedOutputText) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      "output_payload" in parsed
    ) {
      return request.packagedOutputText;
    }

    return JSON.stringify(
      {
        id: request.id,
        workspace_id: request.workspace_id ?? null,
        api_key_id: request.api_key_id ?? null,
        status: request.status,
        capability: request.capability,
        public_model_slug: request.public_model_slug,
        output_payload: parsed,
        error_code: request.error_code,
        error_message: request.error_message,
        created_at: request.created_at,
        completed_at: request.completed_at ?? null,
      },
      null,
      2
    );
  } catch {
    return request.packagedOutputText;
  }
}

export function RegisteredUsersTable({
  users,
  userPagination,
  userSearch,
  addUserBalanceAction,
  deleteRegisteredUserAction,
}: {
  users: RegisteredUser[];
  userPagination: UserPagination;
  userSearch: string;
  addUserBalanceAction: (formData: FormData) => void | Promise<void>;
  deleteRegisteredUserAction: (formData: FormData) => void | Promise<void>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [expandedUserIds, setExpandedUserIds] = useState<Set<string>>(new Set());
  const [requestPagesByUserId, setRequestPagesByUserId] = useState<Record<string, RequestPageState>>({});
  const [query, setQuery] = useState(userSearch);
  const safeUserPage = Math.min(userPagination.page, userPagination.totalPages);
  const pageStart = userPagination.totalCount === 0
    ? 0
    : (safeUserPage - 1) * userPagination.pageSize + 1;
  const pageEnd = Math.min(safeUserPage * userPagination.pageSize, userPagination.totalCount);

  useEffect(() => {
    setQuery(userSearch);
  }, [userSearch]);

  function navigateUsers(page: number, nextSearch = query) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "monitoring-requests");
    params.set("userPage", String(Math.max(1, page)));
    const trimmedSearch = nextSearch.trim();
    if (trimmedSearch) {
      params.set("userSearch", trimmedSearch);
    } else {
      params.delete("userSearch");
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

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

  async function loadUserRequests(userId: string, page = 1) {
    setRequestPagesByUserId((current) => ({
      ...current,
      [userId]: {
        rows: current[userId]?.rows ?? [],
        page,
        totalPages: current[userId]?.totalPages ?? 1,
        totalCount: current[userId]?.totalCount ?? 0,
        loading: true,
        error: null,
      },
    }));

    try {
      const response = await fetch(
        `/api/ops-hub/user-requests?userId=${encodeURIComponent(userId)}&page=${page}`,
        { cache: "no-store" }
      );
      const payload = (await response.json()) as {
        rows?: UserRequestRow[];
        pagination?: { page?: number; totalPages?: number; totalCount?: number };
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load requests");
      }

      setRequestPagesByUserId((current) => ({
        ...current,
        [userId]: {
          rows: payload.rows ?? [],
          page: payload.pagination?.page ?? page,
          totalPages: payload.pagination?.totalPages ?? 1,
          totalCount: payload.pagination?.totalCount ?? payload.rows?.length ?? 0,
          loading: false,
          error: null,
        },
      }));
    } catch (error) {
      setRequestPagesByUserId((current) => ({
        ...current,
        [userId]: {
          rows: current[userId]?.rows ?? [],
          page,
          totalPages: current[userId]?.totalPages ?? 1,
          totalCount: current[userId]?.totalCount ?? 0,
          loading: false,
          error: error instanceof Error ? error.message : "Failed to load requests",
        },
      }));
    }
  }

  function expandUser(userId: string) {
    const shouldLoad = !expandedUserIds.has(userId) && !requestPagesByUserId[userId];
    toggleUser(userId);
    if (shouldLoad) {
      void loadUserRequests(userId, 1);
    }
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-black/[0.06] bg-[#FCFCFA] shadow-[0_20px_70px_rgba(17,24,39,0.04)]">
      <div className="flex flex-col gap-2 border-b border-black/[0.06] bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-black">用户管理</p>
          <p className="mt-1 text-xs text-black/45">
            {userPagination.totalCount} users · page {safeUserPage} of {userPagination.totalPages}
          </p>
        </div>
        <form
          className="flex w-full gap-2 sm:w-auto"
          onSubmit={(event) => {
            event.preventDefault();
            navigateUsers(1);
          }}
        >
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or email"
            className="h-9 min-w-0 flex-1 rounded-full border border-black/[0.08] bg-[#FCFCFA] px-3 text-sm text-black outline-none transition-colors placeholder:text-black/35 focus:border-black/25 sm:w-80"
          />
          <button
            type="submit"
            className="h-9 rounded-full bg-black px-4 text-xs font-medium text-white hover:bg-black/85"
          >
            Search
          </button>
          {userSearch ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                navigateUsers(1, "");
              }}
              className="h-9 rounded-full border border-black/[0.08] bg-white px-4 text-xs font-medium text-black/65 hover:border-black/20"
            >
              Clear
            </button>
          ) : null}
        </form>
      </div>
      <table className="w-full min-w-[920px] border-collapse text-left">
        <thead className="bg-[#F4F0E8] text-[11px] uppercase tracking-[0.55px] text-black/45">
          <tr>
            <th className="px-5 py-3 font-medium">用户</th>
            <th className="px-5 py-3 font-medium">角色</th>
            <th className="px-5 py-3 font-medium">余额</th>
            <th className="px-5 py-3 font-medium">Key 数量</th>
            <th className="px-5 py-3 font-medium">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/[0.06] text-sm">
          {users.length === 0 ? (
            <tr>
              <td colSpan={5} className="bg-white px-5 py-10 text-center text-sm text-black/40">
                {userSearch ? "No users match this search." : "No registered users yet."}
              </td>
            </tr>
          ) : null}
          {users.map((user) => {
            const expanded = expandedUserIds.has(user.id);

            return (
              <Fragment key={user.id}>
                <tr className={expanded ? "bg-white" : "bg-[#FCFCFA] hover:bg-white"}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#111827] text-xs font-semibold uppercase text-white">
                        {(user.email ?? user.name).slice(0, 1)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-black">{user.name}</p>
                        <p className="mt-1 truncate text-xs text-black/50">{user.email ?? user.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-black/[0.04] px-2.5 py-1 text-xs text-black/60">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-medium text-black">{user.balanceLabel}</td>
                  <td className="px-5 py-4 text-black/65">{user.apiKeys.length}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-start gap-2">
                      <button
                        type="button"
                        onClick={() => expandUser(user.id)}
                        className="inline-flex h-8 items-center justify-center rounded-full border border-black/[0.08] bg-white px-3 text-xs font-medium text-black/68 transition-colors hover:border-black/20 hover:bg-[#F7F3EA]"
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
                    <td colSpan={5} className="px-5 pb-6 pt-3">
                      <div className="rounded-3xl border border-black/[0.06] bg-[#F7F3EA] p-4">
                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="rounded-2xl border border-black/[0.06] bg-white p-4">
                            <p className="text-[11px] uppercase tracking-[0.5px] text-black/35">Workspace</p>
                            <p className="mt-2 font-medium text-black/80">{user.workspaceName}</p>
                            <p className="mt-2 break-all text-xs text-black/40">
                              {user.workspaceId ?? "无 workspace"}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-black/[0.06] bg-white p-4">
                            <p className="text-[11px] uppercase tracking-[0.5px] text-black/35">Workspace Slug</p>
                            <p className="mt-2 break-all text-sm text-black/70">
                              {user.workspaceSlug ?? "none"}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-black/[0.06] bg-white p-4">
                            <p className="text-[11px] uppercase tracking-[0.5px] text-black/35">余额构成</p>
                            <p className="mt-2 text-lg font-semibold text-black">{user.balanceLabel}</p>
                            <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-black/55">
                              <span>充值 {user.walletBreakdown.topupLabel}</span>
                              <span>赠送 {user.walletBreakdown.systemCreditLabel}</span>
                              <span>消耗 {user.walletBreakdown.usageLabel}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
                          <section className="rounded-2xl border border-black/[0.06] bg-white p-4">
                            <div className="mb-3 flex items-center justify-between">
                              <p className="text-xs font-medium text-black/70">旗下 Key</p>
                              <span className="text-[11px] text-black/35">{user.apiKeys.length} total</span>
                            </div>
                            {user.apiKeys.length > 0 ? (
                              <div className="grid gap-2 md:grid-cols-2">
                                {user.apiKeys.map((apiKey) => (
                                  <div
                                    key={apiKey.id}
                                    className="rounded-xl border border-black/[0.06] bg-[#FCFCFA] px-3 py-2.5"
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
                          </section>

                          <section className="rounded-2xl border border-black/[0.06] bg-white p-4">
                            <p className="text-xs font-medium text-black/70">后台加余额</p>
                            <p className="mt-1 text-[11px] text-black/40">Manual adjustment to this workspace wallet.</p>
                            {user.workspaceId ? (
                              <form
                                action={addUserBalanceAction}
                                className="mt-3"
                              >
                                <input type="hidden" name="userId" value={user.id} />
                                <div className="grid gap-2">
                                  <input
                                    name="amount"
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    placeholder="金额 USD"
                                    className="h-9 rounded-md border border-black/10 bg-white px-2 text-xs outline-none"
                                  />
                                  <input
                                    name="description"
                                    placeholder="备注（可选）"
                                    className="h-9 min-w-0 rounded-md border border-black/10 bg-white px-2 text-xs outline-none"
                                  />
                                  <button
                                    type="submit"
                                    className="h-9 shrink-0 rounded-md bg-black px-3 text-xs font-medium text-white hover:bg-black/85"
                                  >
                                    加款
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <span className="text-xs text-black/40">无 workspace，不能加款</span>
                            )}
                          </section>
                        </div>

                        <section className="mt-4 rounded-2xl border border-black/[0.06] bg-white p-4">
                          {(() => {
                            const requestPage = requestPagesByUserId[user.id] ?? {
                              rows: user.recentRequests ?? [],
                              page: 1,
                              totalPages: 1,
                              totalCount: user.recentRequests?.length ?? 0,
                              loading: false,
                              error: null,
                            };
                            const requests = requestPage.rows;
                            return (
                              <>
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-medium text-black/70">请求排障记录</p>
                              <p className="mt-1 text-[11px] text-black/40">上游返回和对客 JSON 默认折叠。</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-[11px] text-black/35">
                                第 {requestPage.page} / {requestPage.totalPages} 页 · 共 {requestPage.totalCount} 条
                              </p>
                              <button
                                type="button"
                                disabled={requestPage.loading}
                                onClick={() => loadUserRequests(user.id, requestPage.page)}
                                className="h-8 rounded-md border border-black/[0.08] bg-white px-3 text-xs font-medium text-black/65 hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                {requestPage.loading ? "刷新中..." : "刷新"}
                              </button>
                            </div>
                          </div>
                          {requestPage.error ? (
                            <div className="rounded-xl border border-[#F1D2CC] bg-[#FFF7F5] px-4 py-5 text-sm text-[#8F3F33]">
                              {requestPage.error}
                            </div>
                          ) : requestPage.loading ? (
                            <div className="rounded-xl border border-black/[0.06] bg-white px-4 py-5 text-sm text-black/40">
                              正在加载请求记录...
                            </div>
                          ) : requests.length > 0 ? (
                            <div className="space-y-3">
                              {requests.map((request) => (
                                <article
                                  key={request.id}
                                  className="rounded-2xl border border-black/[0.06] bg-[#FCFCFA] p-3"
                                >
                                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_200px]">
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span
                                          className={`rounded-full border px-2 py-1 text-[11px] ${requestStatusClassName(request.status)}`}
                                        >
                                          {request.status}
                                        </span>
                                        <span className="rounded-full bg-white px-2 py-1 text-[11px] text-black/45">
                                          {request.sourceLabel}
                                        </span>
                                      </div>
                                      <p className="mt-2 truncate text-xs font-medium text-black">
                                        {request.public_model_slug}
                                      </p>
                                      <p className="mt-1 text-[11px] text-black/40">{request.capability}</p>
                                      <p className="mt-1 break-all font-mono text-[11px] text-black/35">
                                        {request.id}
                                      </p>
                                      {request.error_message ? (
                                        <p className="mt-2 break-all rounded-lg bg-[#FFF7F5] px-2 py-1.5 text-[11px] text-[#B54432]">
                                          {request.error_code ? `${request.error_code}: ` : ""}
                                          {request.error_message}
                                        </p>
                                      ) : null}
                                    </div>
                                    <div className="text-[11px] text-black/55">
                                      <p className="font-medium text-black/70">{request.apiKeyName}</p>
                                      <p className="mt-1">{request.apiKeyPrefix}</p>
                                      <p className="mt-1">{request.apiKeyEnvironment}</p>
                                      <p className="mt-3">创建 {request.createdLabel}</p>
                                      <p className="mt-1">完成 {request.completedLabel}</p>
                                    </div>
                                    <div className="rounded-xl bg-white p-3 text-[11px] text-black/55">
                                      <p>客户收费 {request.customerChargeLabel}</p>
                                      <p className="mt-1">上游成本 {request.providerCostLabel}</p>
                                      <p className="mt-1 font-medium text-black/70">利润 {request.profitLabel}</p>
                                    </div>
                                  </div>
                                  <div className="mt-3 grid gap-2 lg:grid-cols-2">
                                          <details className="rounded-lg border border-black/[0.06] bg-[#FCFCFA]">
                                            <summary className="cursor-pointer px-3 py-2 text-[11px] font-medium text-black/65">
                                              上游完整返回
                                            </summary>
                                            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all border-t border-black/[0.06] p-3 text-[11px] text-black/70">
                                              {request.upstreamRawText}
                                            </pre>
                                          </details>
                                          <details className="rounded-lg border border-black/[0.06] bg-[#FCFCFA]">
                                            <summary className="cursor-pointer px-3 py-2 text-[11px] font-medium text-black/65">
                                              对客返回 JSON
                                            </summary>
                                            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all border-t border-black/[0.06] p-3 text-[11px] text-black/70">
                                              {formatCustomerResponseText(request)}
                                            </pre>
                                          </details>
                                  </div>
                                </article>
                              ))}
                            </div>
                          ) : (
                            <div className="rounded-xl border border-black/[0.06] bg-white px-4 py-5 text-sm text-black/40">
                              暂无请求记录
                            </div>
                          )}
                          <div className="mt-3 flex justify-end gap-2">
                            <button
                              type="button"
                              disabled={requestPage.loading || requestPage.page <= 1}
                              onClick={() => loadUserRequests(user.id, Math.max(1, requestPage.page - 1))}
                              className="h-8 rounded-md border border-black/[0.08] bg-white px-3 text-xs text-black/65 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              上一页
                            </button>
                            <button
                              type="button"
                              disabled={requestPage.loading || requestPage.page >= requestPage.totalPages}
                              onClick={() => loadUserRequests(user.id, Math.min(requestPage.totalPages, requestPage.page + 1))}
                              className="h-8 rounded-md border border-black/[0.08] bg-white px-3 text-xs text-black/65 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              下一页
                            </button>
                          </div>
                              </>
                            );
                          })()}
                        </section>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      <div className="flex items-center justify-between border-t border-black/[0.06] bg-white px-5 py-4">
        <p className="text-xs text-black/45">
          Showing {pageStart}
          -
          {pageEnd} of {userPagination.totalCount}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={safeUserPage <= 1}
            onClick={() => navigateUsers(Math.max(1, safeUserPage - 1))}
            className="h-8 rounded-md border border-black/[0.08] bg-white px-3 text-xs text-black/65 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={safeUserPage >= userPagination.totalPages}
            onClick={() => navigateUsers(Math.min(userPagination.totalPages, safeUserPage + 1))}
            className="h-8 rounded-md border border-black/[0.08] bg-white px-3 text-xs text-black/65 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
