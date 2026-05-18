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
  const [workspaceModalUserId, setWorkspaceModalUserId] = useState<string | null>(null);
  const [keysModalUserId, setKeysModalUserId] = useState<string | null>(null);
  const [balanceModalUserId, setBalanceModalUserId] = useState<string | null>(null);
  const [addBalanceModalUserId, setAddBalanceModalUserId] = useState<string | null>(null);
  const [query, setQuery] = useState(userSearch);
  const safeUserPage = Math.min(userPagination.page, userPagination.totalPages);
  const pageStart = userPagination.totalCount === 0
    ? 0
    : (safeUserPage - 1) * userPagination.pageSize + 1;
  const pageEnd = Math.min(safeUserPage * userPagination.pageSize, userPagination.totalCount);
  const workspaceModalUser = users.find((user) => user.id === workspaceModalUserId) ?? null;
  const keysModalUser = users.find((user) => user.id === keysModalUserId) ?? null;
  const balanceModalUser = users.find((user) => user.id === balanceModalUserId) ?? null;
  const addBalanceModalUser = users.find((user) => user.id === addBalanceModalUserId) ?? null;

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

  function closeModals() {
    setWorkspaceModalUserId(null);
    setKeysModalUserId(null);
    setBalanceModalUserId(null);
    setAddBalanceModalUserId(null);
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-[#DDF4FF] bg-[#F8FCFF] shadow-[0_20px_70px_rgba(17,24,39,0.04)]">
      <div className="flex flex-col gap-2 border-b border-[#DDF4FF] bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
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
            className="h-9 min-w-0 flex-1 rounded-full border border-[#BAE6FD] bg-[#F8FCFF] px-3 text-sm text-black outline-none transition-colors placeholder:text-black/35 focus:border-[#38BDF8] sm:w-80"
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
              className="h-9 rounded-full border border-[#BAE6FD] bg-white px-4 text-xs font-medium text-black/65 hover:border-[#38BDF8]"
            >
              Clear
            </button>
          ) : null}
        </form>
      </div>
      <table className="w-full min-w-[920px] border-collapse text-left">
        <thead className="bg-[#E0F2FE] text-[11px] uppercase tracking-[0.55px] text-black/45">
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
                <tr className={expanded ? "bg-white" : "bg-[#F8FCFF] hover:bg-white"}>
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
                    <div className="flex flex-wrap items-start gap-2">
                      <button
                        type="button"
                        onClick={() => expandUser(user.id)}
                        className="inline-flex h-8 items-center justify-center rounded-full border border-[#BAE6FD] bg-white px-3 text-xs font-medium text-black/68 transition-colors hover:border-[#38BDF8] hover:bg-[#E0F2FE]"
                      >
                        {expanded ? "收起请求" : "请求"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setWorkspaceModalUserId(user.id)}
                        className="inline-flex h-8 items-center justify-center rounded-full border border-[#BAE6FD] bg-white px-3 text-xs font-medium text-black/68 transition-colors hover:border-[#38BDF8] hover:bg-[#E0F2FE]"
                      >
                        Workspace
                      </button>
                      <button
                        type="button"
                        onClick={() => setKeysModalUserId(user.id)}
                        className="inline-flex h-8 items-center justify-center rounded-full border border-[#BAE6FD] bg-white px-3 text-xs font-medium text-black/68 transition-colors hover:border-[#38BDF8] hover:bg-[#E0F2FE]"
                      >
                        Keys
                      </button>
                      <button
                        type="button"
                        onClick={() => setBalanceModalUserId(user.id)}
                        className="inline-flex h-8 items-center justify-center rounded-full border border-[#BAE6FD] bg-white px-3 text-xs font-medium text-black/68 transition-colors hover:border-[#38BDF8] hover:bg-[#E0F2FE]"
                      >
                        余额
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddBalanceModalUserId(user.id)}
                        className="inline-flex h-8 items-center justify-center rounded-full bg-black px-3 text-xs font-medium text-white transition-colors hover:bg-black/85"
                      >
                        加余额
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
                      <div className="rounded-3xl border border-[#DDF4FF] bg-[#E0F2FE] p-4">
                        <section className="rounded-2xl border border-[#DDF4FF] bg-white p-4">
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
                                className="h-8 rounded-md border border-[#BAE6FD] bg-white px-3 text-xs font-medium text-black/65 hover:bg-[#E0F2FE] disabled:cursor-not-allowed disabled:opacity-40"
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
                            <div className="rounded-xl border border-[#DDF4FF] bg-white px-4 py-5 text-sm text-black/40">
                              正在加载请求记录...
                            </div>
                          ) : requests.length > 0 ? (
                            <div className="space-y-3">
                              {requests.map((request) => (
                                <article
                                  key={request.id}
                                  className="rounded-2xl border border-[#DDF4FF] bg-[#F8FCFF] p-3"
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
                                          <details className="rounded-lg border border-[#DDF4FF] bg-[#F8FCFF]">
                                            <summary className="cursor-pointer px-3 py-2 text-[11px] font-medium text-black/65">
                                              上游完整返回
                                            </summary>
                                            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all border-t border-[#DDF4FF] p-3 text-[11px] text-black/70">
                                              {request.upstreamRawText}
                                            </pre>
                                          </details>
                                          <details className="rounded-lg border border-[#DDF4FF] bg-[#F8FCFF]">
                                            <summary className="cursor-pointer px-3 py-2 text-[11px] font-medium text-black/65">
                                              对客返回 JSON
                                            </summary>
                                            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all border-t border-[#DDF4FF] p-3 text-[11px] text-black/70">
                                              {formatCustomerResponseText(request)}
                                            </pre>
                                          </details>
                                  </div>
                                </article>
                              ))}
                            </div>
                          ) : (
                            <div className="rounded-xl border border-[#DDF4FF] bg-white px-4 py-5 text-sm text-black/40">
                              暂无请求记录
                            </div>
                          )}
                          <div className="mt-3 flex justify-end gap-2">
                            <button
                              type="button"
                              disabled={requestPage.loading || requestPage.page <= 1}
                              onClick={() => loadUserRequests(user.id, Math.max(1, requestPage.page - 1))}
                              className="h-8 rounded-md border border-[#BAE6FD] bg-white px-3 text-xs text-black/65 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              上一页
                            </button>
                            <button
                              type="button"
                              disabled={requestPage.loading || requestPage.page >= requestPage.totalPages}
                              onClick={() => loadUserRequests(user.id, Math.min(requestPage.totalPages, requestPage.page + 1))}
                              className="h-8 rounded-md border border-[#BAE6FD] bg-white px-3 text-xs text-black/65 disabled:cursor-not-allowed disabled:opacity-40"
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
      <div className="flex items-center justify-between border-t border-[#DDF4FF] bg-white px-5 py-4">
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
            className="h-8 rounded-md border border-[#BAE6FD] bg-white px-3 text-xs text-black/65 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={safeUserPage >= userPagination.totalPages}
            onClick={() => navigateUsers(Math.min(userPagination.totalPages, safeUserPage + 1))}
            className="h-8 rounded-md border border-[#BAE6FD] bg-white px-3 text-xs text-black/65 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
      {workspaceModalUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-6" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-black">Workspace 信息</p>
                <p className="mt-1 text-xs text-black/45">{workspaceModalUser.email ?? workspaceModalUser.id}</p>
              </div>
              <button
                type="button"
                onClick={closeModals}
                className="size-8 rounded-full border border-[#BAE6FD] text-sm text-black/55 hover:bg-[#E0F2FE]"
              >
                ×
              </button>
            </div>
            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl border border-[#DDF4FF] bg-[#F8FCFF] p-4">
                <p className="text-[11px] uppercase tracking-[0.5px] text-black/35">Workspace</p>
                <p className="mt-2 font-medium text-black/80">{workspaceModalUser.workspaceName}</p>
                <p className="mt-2 break-all text-xs text-black/40">
                  {workspaceModalUser.workspaceId ?? "无 workspace"}
                </p>
              </div>
              <div className="rounded-2xl border border-[#DDF4FF] bg-[#F8FCFF] p-4">
                <p className="text-[11px] uppercase tracking-[0.5px] text-black/35">Workspace Slug</p>
                <p className="mt-2 break-all text-sm text-black/70">
                  {workspaceModalUser.workspaceSlug ?? "none"}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {keysModalUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-6" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-black">旗下 Key</p>
                <p className="mt-1 text-xs text-black/45">{keysModalUser.apiKeys.length} total · {keysModalUser.email ?? keysModalUser.id}</p>
              </div>
              <button
                type="button"
                onClick={closeModals}
                className="size-8 rounded-full border border-[#BAE6FD] text-sm text-black/55 hover:bg-[#E0F2FE]"
              >
                ×
              </button>
            </div>
            <div className="mt-5 max-h-[60vh] overflow-auto">
              {keysModalUser.apiKeys.length > 0 ? (
                <div className="grid gap-2 md:grid-cols-2">
                  {keysModalUser.apiKeys.map((apiKey) => (
                    <div
                      key={apiKey.id}
                      className="rounded-xl border border-[#DDF4FF] bg-[#F8FCFF] px-3 py-2.5"
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
                <div className="rounded-2xl border border-dashed border-[#7DD3FC]/45 bg-[#F8FCFF] px-4 py-6 text-sm text-black/40">
                  暂无 Key
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
      {balanceModalUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-6" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-black">余额构成</p>
                <p className="mt-1 text-xs text-black/45">{balanceModalUser.email ?? balanceModalUser.id}</p>
              </div>
              <button
                type="button"
                onClick={closeModals}
                className="size-8 rounded-full border border-[#BAE6FD] text-sm text-black/55 hover:bg-[#E0F2FE]"
              >
                ×
              </button>
            </div>
            <div className="mt-5 rounded-2xl border border-[#DDF4FF] bg-[#F8FCFF] p-4">
              <p className="text-[11px] uppercase tracking-[0.5px] text-black/35">当前余额</p>
              <p className="mt-2 text-2xl font-semibold text-black">{balanceModalUser.balanceLabel}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-black/55">
                <span className="rounded-xl bg-white px-3 py-2">充值 {balanceModalUser.walletBreakdown.topupLabel}</span>
                <span className="rounded-xl bg-white px-3 py-2">赠送 {balanceModalUser.walletBreakdown.systemCreditLabel}</span>
                <span className="rounded-xl bg-white px-3 py-2">消耗 {balanceModalUser.walletBreakdown.usageLabel}</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {addBalanceModalUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-6" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-black">后台加余额</p>
                <p className="mt-1 text-xs text-black/45">Manual adjustment to this workspace wallet.</p>
              </div>
              <button
                type="button"
                onClick={closeModals}
                className="size-8 rounded-full border border-[#BAE6FD] text-sm text-black/55 hover:bg-[#E0F2FE]"
              >
                ×
              </button>
            </div>
            {addBalanceModalUser.workspaceId ? (
              <form action={addUserBalanceAction} className="mt-5">
                <input type="hidden" name="userId" value={addBalanceModalUser.id} />
                <div className="grid gap-3">
                  <label className="grid gap-1.5 text-xs font-medium text-black/65">
                    金额 USD
                    <input
                      name="amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="例如 10.00"
                      className="h-10 rounded-md border border-[#BAE6FD] bg-white px-3 text-sm font-normal outline-none"
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-medium text-black/65">
                    备注
                    <input
                      name="description"
                      placeholder="可选"
                      className="h-10 min-w-0 rounded-md border border-[#BAE6FD] bg-white px-3 text-sm font-normal outline-none"
                    />
                  </label>
                  <button
                    type="submit"
                    className="h-10 rounded-md bg-black px-4 text-sm font-medium text-white hover:bg-black/85"
                  >
                    确认加款
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-[#7DD3FC]/45 bg-[#F8FCFF] px-4 py-6 text-sm text-black/40">
                无 workspace，不能加款
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
