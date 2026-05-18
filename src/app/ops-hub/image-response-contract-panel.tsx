"use client";

import { useMemo, useState } from "react";

type ContractTabKey = "playground" | "api";

const playgroundExample = {
  format: "openoctopus.image.output.v1",
  assets: [
    {
      id: "0",
      index: 0,
      type: "image",
      url: "https://your-gateway.com/v1/files/{requestId}/assets/0",
      mimeType: "image/png",
    },
  ],
};

const apiExample = {
  id: "request_id",
  status: "succeeded",
  capability: "image_generation",
  output_payload: {
    format: "openoctopus.image.output.v1",
    raw: null,
    assets: [
      {
        id: "0",
        index: 0,
        type: "image",
        url: "https://your-gateway.com/v1/files/{requestId}/assets/0",
        mimeType: "image/png",
      },
    ],
  },
};

export function ImageResponseContractPanel() {
  const [activeTab, setActiveTab] = useState<ContractTabKey>("playground");

  const content = useMemo(() => {
    if (activeTab === "playground") {
      return {
        title: "Playground 返回结构约定",
        note: "供 internal Playground 调试使用。返回统一输出结构，不返回 raw/sourceUrl。",
        payload: playgroundExample,
      };
    }
    return {
      title: "API 返回结构约定",
      note: "对外接口返回，必须隐藏上游细节：raw=null 且不返回 sourceUrl。",
      payload: apiExample,
    };
  }, [activeTab]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("playground")}
          className={`inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium transition-colors ${
            activeTab === "playground"
              ? "border-black bg-black text-white"
              : "border-[#BAE6FD] bg-white text-black/72 hover:bg-[#E0F2FE]"
          }`}
        >
          Playground 返回结构
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("api")}
          className={`inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium transition-colors ${
            activeTab === "api"
              ? "border-black bg-black text-white"
              : "border-[#BAE6FD] bg-white text-black/72 hover:bg-[#E0F2FE]"
          }`}
        >
          API 返回结构
        </button>
      </div>

      <div className="rounded-xl border border-[#BAE6FD] bg-[#F8FCFF] p-3">
        <p className="text-sm font-medium text-black">{content.title}</p>
        <p className="mt-1 text-xs leading-5 text-black/55">{content.note}</p>
        <pre className="mt-3 max-h-[460px] overflow-auto rounded-md border border-[#BAE6FD] bg-white p-3 text-xs leading-5 text-black/80">
          {JSON.stringify(content.payload, null, 2)}
        </pre>
      </div>
    </div>
  );
}
