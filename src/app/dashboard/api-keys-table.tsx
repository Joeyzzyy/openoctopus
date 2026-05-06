"use client";

import { useState, useTransition } from "react";
import { deleteApiKey, updateApiKey, toggleApiKeyStatus } from "./actions";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pencil, Trash2, Pause, Play, Check, X } from "lucide-react";
import { toast } from "sonner";

type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  environment: string;
  budget: string;
  spent: string;
  requests: string;
  lastUsed: string;
  status: "active" | "warning" | "paused";
  rawStatus: string;
  monthlyBudget: number;
};

const keyToneStyles = {
  active: "border-[#D7EADB] bg-[#EDF8F0] text-[#167A3D]",
  warning: "border-[#F2DEC0] bg-[#FFF3E2] text-[#9B6A00]",
  paused: "border-black/[0.08] bg-[#F3F4F6] text-[#666666]",
};

const inputClassName =
  "h-8 rounded-md border-black/[0.08] bg-white font-mono text-sm text-[#111827]";

const secondaryButtonClassName =
  "inline-flex cursor-pointer items-center gap-1 rounded-md border border-black/[0.08] bg-white text-[#4B5563] transition-colors hover:bg-black/[0.03]";

export function ApiKeysTable({ apiKeys }: { apiKeys: ApiKey[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editBudget, setEditBudget] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const startEdit = (key: ApiKey) => {
    setEditingId(key.id);
    setEditName(key.name);
    setEditBudget(String(key.monthlyBudget));
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = (keyId: string) => {
    startTransition(async () => {
      const result = await updateApiKey({
        keyId,
        name: editName,
        monthlyBudget: Number(editBudget),
      });
      if (result.success) {
        toast.success("Key updated");
        setEditingId(null);
      } else {
        toast.error(result.error ?? "Failed to update");
      }
    });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;

    startTransition(async () => {
      const result = await deleteApiKey(deleteTarget.id);
      if (result.success) {
        toast.success("Key deleted");
        setDeleteTarget(null);
      } else {
        toast.error(result.error ?? "Failed to delete");
      }
    });
  };

  const handleToggle = (keyId: string, currentRawStatus: string) => {
    const newStatus = currentRawStatus === "paused" ? "active" : "paused";
    startTransition(async () => {
      const result = await toggleApiKeyStatus(keyId, newStatus);
      if (result.success) {
        toast.success(newStatus === "paused" ? "Key paused" : "Key resumed");
      } else {
        toast.error(result.error ?? "Failed to toggle");
      }
    });
  };

  if (apiKeys.length === 0) {
    return (
      <div className="rounded-2xl border border-black/[0.08] bg-[#FCFCFA] px-4 py-8 text-center text-sm text-[#6B7280]">
        No API keys have been created yet.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {apiKeys.map((key) => {
          const isEditing = editingId === key.id;
          return (
            <div
              key={key.id}
              className="rounded-2xl border border-black/[0.08] bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  {isEditing ? (
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className={`${inputClassName} text-[13px] font-semibold`}
                    />
                  ) : (
                    <p className="truncate font-mono text-[14px] font-semibold text-[#162319]">
                      {key.name}
                    </p>
                  )}
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[1px] text-[#6B7280]">
                    {key.prefix} · {key.environment}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[1px]",
                    keyToneStyles[key.status]
                  )}
                >
                  {key.status}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-xl border border-black/[0.06] bg-[#FCFCFA] px-3 py-2.5">
                  <p className="font-mono text-[9px] uppercase tracking-[0.5px] text-[#7b8778]">
                    Budget
                  </p>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editBudget}
                      onChange={(e) => setEditBudget(e.target.value)}
                      className="mt-1 h-7 rounded-md border-black/[0.08] bg-white text-center font-mono text-[11px] text-[#111827]"
                    />
                  ) : (
                    <p className="mt-1 font-mono text-[12px] font-semibold text-[#162319]">
                      {key.budget}
                    </p>
                  )}
                </div>
                <div className="rounded-xl border border-black/[0.06] bg-[#FCFCFA] px-3 py-2.5">
                  <p className="font-mono text-[9px] uppercase tracking-[0.5px] text-[#7b8778]">
                    Spent
                  </p>
                  <p className="mt-1 font-mono text-[12px] font-semibold text-[#162319]">
                    {key.spent}
                  </p>
                </div>
                <div className="rounded-xl border border-black/[0.06] bg-[#FCFCFA] px-3 py-2.5">
                  <p className="font-mono text-[9px] uppercase tracking-[0.5px] text-[#7b8778]">
                    Requests
                  </p>
                  <p className="mt-1 font-mono text-[12px] font-semibold text-[#162319]">
                    {key.requests}
                  </p>
                </div>
                <div className="rounded-xl border border-black/[0.06] bg-[#FCFCFA] px-3 py-2.5">
                  <p className="font-mono text-[9px] uppercase tracking-[0.5px] text-[#7b8778]">
                    Last Used
                  </p>
                  <p className="mt-1 font-mono text-[12px] font-semibold text-[#162319]">
                    {key.lastUsed}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-black/[0.06] pt-4">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => saveEdit(key.id)}
                      disabled={isPending}
                      className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center gap-1 rounded-md bg-[#111827] px-3 text-[10px] uppercase tracking-[0.5px] text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Check className="h-3 w-3" /> Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className={`${secondaryButtonClassName} h-9 flex-1 justify-center px-3 text-[10px] uppercase tracking-[0.5px]`}
                    >
                      <X className="h-3 w-3" /> Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => startEdit(key)}
                      className={`${secondaryButtonClassName} h-9 flex-1 justify-center px-3 text-[10px] uppercase tracking-[0.5px]`}
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                    <button
                      onClick={() => handleToggle(key.id, key.rawStatus)}
                      disabled={isPending}
                      className={`${secondaryButtonClassName} h-9 flex-1 justify-center px-3 text-[10px] uppercase tracking-[0.5px] disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      {key.rawStatus === "paused" ? (
                        <>
                          <Play className="h-3 w-3" /> Resume
                        </>
                      ) : (
                        <>
                          <Pause className="h-3 w-3" /> Pause
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setDeleteTarget({ id: key.id, name: key.name })}
                      disabled={isPending}
                      className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-1 rounded-md border border-[#F1D2CC] bg-white px-3 text-[10px] uppercase tracking-[0.5px] text-[#B54432] transition-colors hover:bg-[#FFF7F5] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:flex-none"
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full border-separate border-spacing-y-3">
          <thead>
            <tr className="text-left">
              {[
                "Key",
                "Environment",
                "Monthly Budget",
                "Spent",
                "Requests",
                "Last Used",
                "State",
                "Actions",
              ].map((heading) => (
                <th
                  key={heading}
                  className="px-3 py-2.5 font-mono text-[10px] uppercase tracking-[1px] text-[#6B7280]"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {apiKeys.map((key) => {
              const isEditing = editingId === key.id;
              return (
                <tr
                  key={key.id}
                  className="rounded-2xl bg-white shadow-[0_10px_24px_rgba(17,24,39,0.04)]"
                >
                  <td className="rounded-l-[16px] border-y border-l border-black/[0.08] px-3 py-3.5">
                    {isEditing ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className={`${inputClassName} w-36 font-semibold`}
                      />
                    ) : (
                      <p className="font-mono text-sm font-semibold text-[#162319]">
                        {key.name}
                      </p>
                    )}
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[1px] text-[#7b8778]">
                      {key.prefix}
                    </p>
                  </td>
                  <td className="border-y border-black/[0.08] px-3 py-3.5 text-sm text-[#4B5563]">
                    {key.environment}
                  </td>
                  <td className="border-y border-black/[0.08] px-3 py-3.5 font-mono text-sm text-[#111827]">
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editBudget}
                        onChange={(e) => setEditBudget(e.target.value)}
                        className={`${inputClassName} w-24`}
                      />
                    ) : (
                      key.budget
                    )}
                  </td>
                  <td className="border-y border-black/[0.08] px-3 py-3.5 font-mono text-sm text-[#111827]">
                    {key.spent}
                  </td>
                  <td className="border-y border-black/[0.08] px-3 py-3.5 text-sm text-[#4B5563]">
                    {key.requests}
                  </td>
                  <td className="border-y border-black/[0.08] px-3 py-3.5 text-sm text-[#4B5563]">
                    {key.lastUsed}
                  </td>
                  <td className="border-y border-black/[0.08] px-3 py-3.5">
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[1px]",
                        keyToneStyles[key.status]
                      )}
                    >
                      {key.status}
                    </span>
                  </td>
                  <td className="rounded-r-[16px] border-y border-r border-black/[0.08] px-3 py-3.5">
                    <div className="flex items-center gap-1.5">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => saveEdit(key.id)}
                            disabled={isPending}
                            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md bg-[#111827] text-white disabled:cursor-not-allowed disabled:opacity-50"
                            title="Save"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-black/[0.08] bg-white text-[#4B5563] transition-colors hover:bg-black/[0.03]"
                            title="Cancel"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(key)}
                            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-black/[0.08] bg-white text-[#4B5563] transition-colors hover:bg-black/[0.03]"
                            title="Edit name & budget"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggle(key.id, key.rawStatus)}
                            disabled={isPending}
                            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-black/[0.08] bg-white text-[#4B5563] transition-colors hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-50"
                            title={key.rawStatus === "paused" ? "Resume key" : "Pause key"}
                          >
                            {key.rawStatus === "paused" ? (
                              <Play className="h-3.5 w-3.5" />
                            ) : (
                              <Pause className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ id: key.id, name: key.name })}
                            disabled={isPending}
                            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-[#F1D2CC] bg-white text-[#B54432] transition-colors hover:bg-[#FFF7F5] disabled:cursor-not-allowed disabled:opacity-50"
                            title="Delete key"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent
          showCloseButton={false}
          className="rounded-[24px] border border-black/[0.08] bg-[#FCFCFA] p-0 shadow-[0_30px_80px_rgba(17,24,39,0.12)] sm:max-w-md"
        >
          <DialogHeader className="border-b border-black/[0.08] px-5 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
            <DialogTitle className="text-sm font-semibold uppercase tracking-[1px] text-[#111827]">
              Delete API Key
            </DialogTitle>
            <DialogDescription className="text-black/55">
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
            <div className="rounded-2xl border border-[#F1D2CC] bg-[#FFF7F5] p-4">
              <p className="text-sm leading-6 text-[#8F3F33]">
                Delete <span className="font-mono font-semibold">{deleteTarget?.name}</span>? Any apps using this key will stop working immediately.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="inline-flex h-11 cursor-pointer items-center justify-center rounded-md border border-black/[0.08] bg-white px-4 text-[11px] font-semibold uppercase tracking-[1px] text-[#111827] transition-colors hover:bg-black/[0.03]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isPending}
                className="inline-flex h-11 cursor-pointer items-center justify-center rounded-md bg-[#B54432] px-4 text-[11px] font-semibold uppercase tracking-[1px] text-white transition-colors hover:bg-[#9F3B2C] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Deleting..." : "Delete Key"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
