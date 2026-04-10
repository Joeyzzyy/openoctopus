"use client";

import { useState, useTransition } from "react";
import { deleteApiKey, updateApiKey, toggleApiKeyStatus } from "./actions";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Pencil,
  Trash2,
  Pause,
  Play,
  Check,
  X,
} from "lucide-react";
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
  active: "bg-[#dff6e6] text-[#167a3d]",
  warning: "bg-[#fff2d9] text-[#9b6a00]",
  paused: "bg-[#ececec] text-[#666666]",
};

export function ApiKeysTable({ apiKeys }: { apiKeys: ApiKey[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editBudget, setEditBudget] = useState("");
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

  const handleDelete = (keyId: string, keyName: string) => {
    if (!confirm(`Delete key "${keyName}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteApiKey(keyId);
      if (result.success) {
        toast.success("Key deleted");
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
      <div className="rounded-[16px] border border-[#dde5d8] bg-[#f8fbf6] px-4 py-8 text-center text-sm text-[#697567] sm:rounded-[18px]">
        No API keys have been created yet.
      </div>
    );
  }

  return (
    <>
      {/* Mobile: card layout */}
      <div className="space-y-3 md:hidden">
        {apiKeys.map((key) => {
          const isEditing = editingId === key.id;
          return (
            <div
              key={key.id}
              className="rounded-[18px] border border-[#dde5d8] bg-[#f9fcf7] p-4 shadow-[0_12px_30px_rgba(68,85,56,0.04)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  {isEditing ? (
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8 rounded-[10px] border-[#d7ddd4] bg-white font-mono text-[13px] font-semibold"
                    />
                  ) : (
                    <p className="truncate font-mono text-[14px] font-semibold text-[#162319]">
                      {key.name}
                    </p>
                  )}
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[1px] text-[#7b8778]">
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
                <div className="rounded-[14px] border border-[#e3e8de] bg-white px-3 py-2.5">
                  <p className="font-mono text-[9px] uppercase tracking-[0.5px] text-[#7b8778]">
                    Budget
                  </p>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editBudget}
                      onChange={(e) => setEditBudget(e.target.value)}
                      className="mt-1 h-7 rounded-[8px] border-[#d7ddd4] bg-white text-center font-mono text-[11px]"
                    />
                  ) : (
                    <p className="mt-1 font-mono text-[12px] font-semibold text-[#162319]">
                      {key.budget}
                    </p>
                  )}
                </div>
                <div className="rounded-[14px] border border-[#e3e8de] bg-white px-3 py-2.5">
                  <p className="font-mono text-[9px] uppercase tracking-[0.5px] text-[#7b8778]">
                    Spent
                  </p>
                  <p className="mt-1 font-mono text-[12px] font-semibold text-[#162319]">
                    {key.spent}
                  </p>
                </div>
                <div className="rounded-[14px] border border-[#e3e8de] bg-white px-3 py-2.5">
                  <p className="font-mono text-[9px] uppercase tracking-[0.5px] text-[#7b8778]">
                    Requests
                  </p>
                  <p className="mt-1 font-mono text-[12px] font-semibold text-[#162319]">
                    {key.requests}
                  </p>
                </div>
                <div className="rounded-[14px] border border-[#e3e8de] bg-white px-3 py-2.5">
                  <p className="font-mono text-[9px] uppercase tracking-[0.5px] text-[#7b8778]">
                    Last Used
                  </p>
                  <p className="mt-1 font-mono text-[12px] font-semibold text-[#162319]">
                    {key.lastUsed}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#e3e8de] pt-4">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => saveEdit(key.id)}
                      disabled={isPending}
                      className="inline-flex h-9 items-center gap-1 rounded-[12px] bg-[#1f5f39] px-3 font-mono text-[10px] uppercase tracking-[0.5px] text-white disabled:opacity-50"
                    >
                      <Check className="h-3 w-3" /> Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="inline-flex h-9 items-center gap-1 rounded-[12px] border border-[#d7ddd4] bg-white px-3 font-mono text-[10px] uppercase tracking-[0.5px] text-[#556153]"
                    >
                      <X className="h-3 w-3" /> Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => startEdit(key)}
                      className="inline-flex h-9 items-center gap-1 rounded-[12px] border border-[#d7ddd4] bg-white px-3 font-mono text-[10px] uppercase tracking-[0.5px] text-[#556153] hover:bg-[#f4f8f1]"
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                    <button
                      onClick={() => handleToggle(key.id, key.rawStatus)}
                      disabled={isPending}
                      className="inline-flex h-9 items-center gap-1 rounded-[12px] border border-[#d7ddd4] bg-white px-3 font-mono text-[10px] uppercase tracking-[0.5px] text-[#556153] hover:bg-[#f4f8f1] disabled:opacity-50"
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
                      onClick={() => handleDelete(key.id, key.name)}
                      disabled={isPending}
                      className="inline-flex h-9 items-center gap-1 rounded-[12px] border border-[#f2cdc7] bg-white px-3 font-mono text-[10px] uppercase tracking-[0.5px] text-[#c65342] hover:bg-[#fff5f2] disabled:opacity-50"
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

      {/* Desktop: table layout */}
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full border-separate border-spacing-y-2">
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
                  className="px-3 py-2 font-mono text-[10px] uppercase tracking-[1px] text-[#6b7868]"
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
                  className="rounded-[18px] bg-[#f9fcf7] shadow-[0_12px_30px_rgba(68,85,56,0.04)]"
                >
                  <td className="rounded-l-[16px] border-y border-l border-[#dde5d8] px-3 py-3">
                    {isEditing ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8 w-36 rounded-[10px] border-[#d7ddd4] bg-white font-mono text-sm font-semibold"
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
                  <td className="border-y border-[#dde5d8] px-3 py-3 text-sm text-[#556153]">
                    {key.environment}
                  </td>
                  <td className="border-y border-[#dde5d8] px-3 py-3 font-mono text-sm text-[#162319]">
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editBudget}
                        onChange={(e) => setEditBudget(e.target.value)}
                        className="h-8 w-24 rounded-[10px] border-[#d7ddd4] bg-white font-mono text-sm"
                      />
                    ) : (
                      key.budget
                    )}
                  </td>
                  <td className="border-y border-[#dde5d8] px-3 py-3 font-mono text-sm text-[#162319]">
                    {key.spent}
                  </td>
                  <td className="border-y border-[#dde5d8] px-3 py-3 text-sm text-[#556153]">
                    {key.requests}
                  </td>
                  <td className="border-y border-[#dde5d8] px-3 py-3 text-sm text-[#556153]">
                    {key.lastUsed}
                  </td>
                  <td className="border-y border-[#dde5d8] px-3 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[1px]",
                        keyToneStyles[key.status]
                      )}
                    >
                      {key.status}
                    </span>
                  </td>
                  <td className="rounded-r-[16px] border-y border-r border-[#dde5d8] px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => saveEdit(key.id)}
                            disabled={isPending}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#1f5f39] text-white disabled:opacity-50"
                            title="Save"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-[#d7ddd4] bg-white text-[#556153] hover:bg-[#f4f8f1]"
                            title="Cancel"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(key)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-[#d7ddd4] bg-white text-[#556153] hover:bg-[#f4f8f1]"
                            title="Edit name & budget"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              handleToggle(key.id, key.rawStatus)
                            }
                            disabled={isPending}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-[#d7ddd4] bg-white text-[#556153] hover:bg-[#f4f8f1] disabled:opacity-50"
                            title={
                              key.rawStatus === "paused"
                                ? "Resume key"
                                : "Pause key"
                            }
                          >
                            {key.rawStatus === "paused" ? (
                              <Play className="h-3.5 w-3.5" />
                            ) : (
                              <Pause className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(key.id, key.name)}
                            disabled={isPending}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-[#f2cdc7] bg-white text-[#c65342] hover:bg-[#fff5f2] disabled:opacity-50"
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
    </>
  );
}
