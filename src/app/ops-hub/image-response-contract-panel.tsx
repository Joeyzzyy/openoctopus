"use client";

import { useMemo, useState } from "react";

type ContractCategoryKey = "image" | "video" | "text" | "coding";
type ContractChannelKey = "playground" | "api" | "cli";

type ContractCard = {
  title: string;
  note: string;
  payload: unknown;
};

const contractMatrix: Record<ContractCategoryKey, Record<ContractChannelKey, ContractCard>> = {
  image: {
    playground: {
      title: "图片 Playground",
      note: "内部 Playground 消费统一图片输出结构。界面只用 assets 预览，不展示 raw 或 sourceUrl。",
      payload: {
        format: "openoctopus.image.output.v1",
        assets: [
          {
            id: "0",
            index: 0,
            type: "image",
            url: "https://your-gateway.com/v1/files/{requestId}/assets/0?display=1",
            mimeType: "image/png",
          },
        ],
      },
    },
    api: {
      title: "图片 API",
      note: "图片 API 是异步任务。提交先返回 task id，之后通过 /v1/tasks/{id} 读取统一 output_payload。对外必须隐藏 raw/sourceUrl。",
      payload: {
        submit: {
          id: "request_id",
          status: "queued",
        },
        task: {
          id: "request_id",
          status: "succeeded",
          capability: "image_generation",
          output_payload: {
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
          },
        },
      },
    },
    cli: {
      title: "图片 CLI（ooct）",
      note: "ooct run 默认等待任务完成，并直接打印图片 asset URL；如果传 --json，则打印完整 task JSON。",
      payload: {
        defaultStdout: "https://your-gateway.com/v1/files/{requestId}/assets/0",
        withJsonFlag: {
          id: "request_id",
          status: "succeeded",
          output_payload: {
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
          },
        },
      },
    },
  },
  video: {
    playground: {
      title: "视频 Playground",
      note: "内部 Playground 消费统一视频输出结构。界面只用 assets 预览，不展示 raw 或 sourceUrl。",
      payload: {
        format: "openoctopus.video.output.v1",
        assets: [
          {
            id: "0",
            index: 0,
            type: "video",
            url: "https://your-gateway.com/v1/files/{requestId}/assets/0",
            mimeType: "video/mp4",
            durationSeconds: 5,
          },
        ],
        durationSeconds: 5,
      },
    },
    api: {
      title: "视频 API",
      note: "视频 API 也是异步任务。最终 output_payload 使用统一视频结构，对外不返回 raw/sourceUrl。",
      payload: {
        submit: {
          id: "request_id",
          status: "queued",
        },
        task: {
          id: "request_id",
          status: "succeeded",
          capability: "video_generation",
          output_payload: {
            format: "openoctopus.video.output.v1",
            assets: [
              {
                id: "0",
                index: 0,
                type: "video",
                url: "https://your-gateway.com/v1/files/{requestId}/assets/0",
                mimeType: "video/mp4",
                durationSeconds: 5,
              },
            ],
            durationSeconds: 5,
          },
        },
      },
    },
    cli: {
      title: "视频 CLI（ooct）",
      note: "ooct run 默认等待任务完成，并直接打印视频 asset URL；如果传 --json，则打印完整 task JSON。",
      payload: {
        defaultStdout: "https://your-gateway.com/v1/files/{requestId}/assets/0",
        withJsonFlag: {
          id: "request_id",
          status: "succeeded",
          output_payload: {
            format: "openoctopus.video.output.v1",
            assets: [
              {
                id: "0",
                index: 0,
                type: "video",
                url: "https://your-gateway.com/v1/files/{requestId}/assets/0",
                mimeType: "video/mp4",
                durationSeconds: 5,
              },
            ],
            durationSeconds: 5,
          },
        },
      },
    },
  },
  text: {
    playground: {
      title: "Text Playground",
      note: "普通 text playground 最终只渲染助手文本。raw 不在界面里直接显示。",
      payload: {
        format: "openoctopus.text.output.v1",
        text: "Assistant response text",
        message: {
          role: "assistant",
          content: "Assistant response text",
        },
      },
    },
    api: {
      title: "Text API",
      note: "普通 text_generation API 当前仍走异步任务：/v1/chat/completions 提交后拿 task id，再去 /v1/tasks/{id} 取统一 text output。",
      payload: {
        submit: {
          id: "request_id",
          status: "queued",
        },
        task: {
          id: "request_id",
          status: "succeeded",
          capability: "text_generation",
          output_payload: {
            format: "openoctopus.text.output.v1",
            text: "Assistant response text",
            message: {
              role: "assistant",
              content: "Assistant response text",
            },
          },
        },
      },
    },
    cli: {
      title: "Text CLI（ooct）",
      note: "ooct run 默认等待任务完成，并直接打印 output_payload.text；如果传 --json，则打印完整 task JSON。",
      payload: {
        defaultStdout: "Assistant response text",
        withJsonFlag: {
          id: "request_id",
          status: "succeeded",
          output_payload: {
            format: "openoctopus.text.output.v1",
            text: "Assistant response text",
            message: {
              role: "assistant",
              content: "Assistant response text",
            },
          },
        },
      },
    },
  },
  coding: {
    playground: {
      title: "Coding Playground",
      note: "目前没有单独的 coding playground 契约。后台模型页若直接调 text_generation，只按普通 text playground 渲染文本；真正的 coding 体验走 CLI 直通。",
      payload: {
        display: "render assistant text only",
        dedicatedCodingPlayground: false,
      },
    },
    api: {
      title: "Coding API",
      note: "coding agent 直通不是任务轮询。它走 OpenAI-compatible /chat/completions 或 /v1/code/chat/completions，直接同步/流式返回上游 chunk，不包 task envelope。",
      payload: {
        endpoint: "/chat/completions",
        mode: "sync_streaming",
        response: "text/event-stream",
        chunkExample: {
          id: "chatcmpl_xxx",
          object: "chat.completion.chunk",
          model: "deepseek-v4-pro",
          choices: [
            {
              index: 0,
              delta: {
                content: "Hello",
              },
            },
          ],
        },
      },
    },
    cli: {
      title: "Coding CLI（Deep Code / 兼容客户端）",
      note: "coding CLI 不走 ooct，也不走 task polling。它直接打 OpenAI-compatible /chat/completions，并消费流式 SSE chunk。",
      payload: {
        request: {
          endpoint: "/chat/completions",
          auth: "Authorization: Bearer ooq_xxx",
          model: "openoctopus/deepcode",
          stream: true,
        },
        response: "text/event-stream",
        doneSentinel: "data: [DONE]",
      },
    },
  },
};

const categoryTabs: Array<{ key: ContractCategoryKey; label: string }> = [
  { key: "image", label: "图片" },
  { key: "video", label: "视频" },
  { key: "text", label: "Text" },
  { key: "coding", label: "Coding" },
];

const channelTabs: Array<{ key: ContractChannelKey; label: string }> = [
  { key: "playground", label: "Playground" },
  { key: "api", label: "API" },
  { key: "cli", label: "CLI" },
];

export function ImageResponseContractPanel() {
  const [activeCategory, setActiveCategory] = useState<ContractCategoryKey>("image");
  const [activeChannel, setActiveChannel] = useState<ContractChannelKey>("playground");

  const content = useMemo(
    () => contractMatrix[activeCategory][activeChannel],
    [activeCategory, activeChannel]
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {categoryTabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setActiveCategory(item.key)}
            className={`inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium transition-colors ${
              activeCategory === item.key
                ? "border-black bg-black text-white"
                : "border-[#BAE6FD] bg-white text-black/72 hover:bg-[#E0F2FE]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {channelTabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setActiveChannel(item.key)}
            className={`inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium transition-colors ${
              activeChannel === item.key
                ? "border-[#0F172A] bg-[#0F172A] text-white"
                : "border-black/10 bg-[#F8FAFC] text-black/65 hover:bg-[#EEF6FF]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-[#BAE6FD] bg-white p-3">
        <p className="text-sm font-medium text-black">{content.title}</p>
        <p className="mt-1 text-xs leading-5 text-black/55">{content.note}</p>
        <pre className="mt-3 max-h-[360px] overflow-auto rounded-md border border-[#BAE6FD] bg-[#F8FAFC] p-3 text-xs leading-5 text-black/80">
          {JSON.stringify(content.payload, null, 2)}
        </pre>
      </div>
    </div>
  );
}
