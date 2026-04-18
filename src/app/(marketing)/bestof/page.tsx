const researchDate = "2026-04-18";

const competitorProfiles = [
  {
    name: "Kie.ai",
    domain: "kie.ai",
    logoUrl: "https://kie.ai/favicon.ico",
    type: "直接竞品 / 价格型 API 转售平台",
    summary:
      "Kie.ai 的平台定位与 OpenOctopus 最接近，核心卖点是低价、统一 API 接入和热门模型覆盖。",
    strengths: [
      {
        text: "公开文档明确强调价格通常比官方 API 低 30%–50%，部分模型可低到 80%。",
        refs: ["入门文档"],
      },
      {
        text: "公开文档说明默认限流为每 10 秒最多 20 个新生成请求，并通常支持 100+ 并发运行任务。",
        refs: ["入门文档"],
      },
      {
        text: "官网首页直接强调 99.9% uptime，以及视频、图片、音乐、chat 四类能力覆盖。",
        refs: ["官网"],
      },
    ],
    weaknesses: [
      {
        text: "官方文档同时提示整体稳定性可能略低于官方提供商，平台 trade-off 公开明确。",
        refs: ["入门文档"],
      },
      {
        text: "首页层面的定价比较不够直观，价格透明度更多依赖模型页或后台。",
        refs: ["定价页"],
      },
    ],
    links: [
      { label: "官网", href: "https://kie.ai/" },
      { label: "入门文档", href: "https://docs.kie.ai/index" },
      { label: "定价页", href: "https://kie.ai/pricing" },
    ],
    verification:
      "重点求证了其低价表述、默认限流 / 并发说明，以及首页公开的 uptime 与能力覆盖。",
  },
  {
    name: "WaveSpeedAI",
    domain: "wavespeed.ai",
    logoUrl: "https://wavespeed.ai/favicon.ico",
    type: "直接竞品 / 目录型 API 平台",
    summary:
      "WaveSpeedAI 的核心特点是大规模模型目录、账户等级体系和较高的规则透明度，更接近目录型平台。",
    strengths: [
      {
        text: "公开账户等级页列出 Bronze、Silver、Gold、Ultra 对应的图像 / 视频速率与并发上限。",
        refs: ["账户等级"],
      },
      {
        text: "定价文档说明开源模型价格与原提供方一致，闭源模型价格不高于市场平均值。",
        refs: ["定价说明"],
      },
      {
        text: "支持通过 API 查询单模型价格，便于成本程序化估算。",
        refs: ["定价说明"],
      },
    ],
    weaknesses: [
      {
        text: "更高账户等级依赖累计充值门槛，升级规则对小团队不一定友好。",
        refs: ["账户等级"],
      },
      {
        text: "平台心智更接近模型目录与工具市场，前台产品化表达相对弱一些。",
        refs: ["定价说明", "账户等级"],
      },
    ],
    links: [
      { label: "定价说明", href: "https://wavespeed.ai/docs/how-pricing-works" },
      { label: "账户等级", href: "https://wavespeed.ai/docs/account-levels" },
    ],
    verification:
      "重点求证了其账户等级、图像 / 视频速率、并发规则，以及价格与 credits 的公开表达方式。",
  },
  {
    name: "PiAPI",
    domain: "piapi.ai",
    logoUrl: "https://piapi.ai/favicon.ico",
    type: "直接竞品 / 生成式 AI API 聚合平台",
    summary:
      "PiAPI 也是典型的统一入口型平台，覆盖视频、图片、音频、3D 与 LLM，产品形态与 OpenOctopus 的 API 聚合售卖路径较为接近。",
    strengths: [
      {
        text: "官网公开列出 50+ AI models，并明确覆盖 video、image、audio、3D 与 LLM。",
        refs: ["官网"],
      },
      {
        text: "单模型页面通常直接附带定价，例如 Hunyuan Video API、Seedance 2.0 API、GPT-image API 等。",
        refs: ["GPT-image Pricing", "Seedance 2.0"],
      },
      {
        text: "整体平台既有 playground，也有 API docs，前台成交路径比较直接。",
        refs: ["官网", "GPT-image Pricing"],
      },
    ],
    weaknesses: [
      {
        text: "平台规模和模型覆盖比 WaveSpeedAI 更聚焦，但透明规则体系不如 WaveSpeedAI 那么结构化。",
        refs: ["官网"],
      },
      {
        text: "不同模型的定价和规则分散在各自页面，平台层统一比较入口相对有限。",
        refs: ["GPT-image Pricing", "Seedance 2.0"],
      },
    ],
    links: [
      { label: "官网", href: "https://piapi.ai/" },
      { label: "GPT-image Pricing", href: "https://piapi.ai/docs/gpt-image/gpt-image-api" },
      { label: "Seedance 2.0", href: "https://piapi.ai/seedance-2-0" },
    ],
    verification:
      "重点求证了 50+ 模型覆盖、多模态能力范围，以及单模型页面直接给出价格的做法。",
  },
  {
    name: "APICore.ai",
    domain: "apicore.ai",
    logoUrl: "https://page2.apicore.ai/favicon.ico",
    type: "直接竞品 / 低价聚合型 API 平台",
    summary:
      "APICore.ai 的前台表达非常接近价格导向型中转售卖平台：统一 API、低价、热门模型、直接比价。",
    strengths: [
      {
        text: "首页直接强调两个 API 可访问 300+ AI 模型，并宣传 30%–50% 甚至更低的成本节省。",
        refs: ["官网"],
      },
      {
        text: "官网首页直接展示与官方价格的对比示例，例如 veo3-fast、gpt-4o-image、suno。",
        refs: ["官网"],
      },
      {
        text: "平台叙事与 Kie.ai 类似，明显偏低价与统一入口成交逻辑。",
        refs: ["官网"],
      },
    ],
    weaknesses: [
      {
        text: "公开资料主要集中在营销页，规则、限流与文档体系的公开完备度目前不如 WaveSpeedAI。",
        refs: ["官网"],
      },
      {
        text: "品牌与产品成熟度、英文市场认知度仍有待进一步观察。",
        refs: ["官网"],
      },
    ],
    links: [
      { label: "官网", href: "https://page2.apicore.ai/" },
    ],
    verification:
      "重点求证了其首页公开的价格对比例子、300+ 模型表述和统一 API 的营销定位。",
  },
  {
    name: "fal.ai",
    domain: "fal.ai",
    logoUrl: "https://fal.ai/favicon.ico",
    type: "参照样本 / 媒体生成基础设施平台",
    summary:
      "fal.ai 更像生产级媒体生成基础设施平台，比较价值主要在能力深度、交付方式和开发者体验。",
    strengths: [
      {
        text: "官方文档说明 Model APIs 提供 1,000+ production-ready 模型，覆盖 image、video、audio、multimodal。",
        refs: ["Model APIs"],
      },
      {
        text: "定价文档明确 Model APIs 按成功输出计费，不对排队等待或服务端错误收费。",
        refs: ["定价说明"],
      },
      {
        text: "平台能力结构包括 Playground、模型级 pricing API 和更完整的平台能力叙事。",
        refs: ["Model APIs", "公开价格"],
      },
    ],
    weaknesses: [
      {
        text: "品牌表达更偏平台和基础设施，对非技术采购者的前台成交导向较弱。",
        refs: ["Model APIs"],
      },
      {
        text: "它更适合被当作能力上限参照，而不是前台转售体验的直接对手。",
        refs: ["Model APIs", "定价说明"],
      },
    ],
    links: [
      { label: "Model APIs", href: "https://fal.ai/docs/documentation/model-apis/overview" },
      { label: "定价说明", href: "https://fal.ai/docs/documentation/model-apis/pricing" },
      { label: "公开价格", href: "https://fal.ai/pricing" },
    ],
    verification:
      "重点求证了 Model APIs 的覆盖范围、成功输出计费规则，以及 Playground / pricing API 这类平台能力线索。",
  },
  {
    name: "Replicate",
    domain: "replicate.com",
    logoUrl: "https://replicate.com/apple-touch-icon.png",
    type: "参照样本 / 模型运行平台",
    summary:
      "Replicate 的重点在模型运行平台、社区生态、自定义模型与开发者工作流，而不是热门闭源媒体模型转售。",
    strengths: [
      {
        text: "官方文档强调既可以运行社区模型，也可以部署自定义模型与微调模型。",
        refs: ["Docs"],
      },
      {
        text: "公开 rate limit 文档说明 predictions 创建默认可达 600 请求/分钟，其余 endpoint 可达 3,000 请求/分钟。",
        refs: ["Rate limits"],
      },
      {
        text: "定价页以硬件与算力口径为核心，适合按底层资源成本理解平台计费方式。",
        refs: ["Pricing"],
      },
    ],
    weaknesses: [
      {
        text: "平台心智与统一售卖热门媒体模型 API 并不完全重合。",
        refs: ["Docs", "Pricing"],
      },
      {
        text: "对只采购热门 image/video API 的客户而言，学习路径通常更工程化。",
        refs: ["Docs"],
      },
    ],
    links: [
      { label: "Docs", href: "https://replicate.com/docs" },
      { label: "Pricing", href: "https://replicate.com/pricing" },
      { label: "Rate limits", href: "https://replicate.com/docs/topics/predictions/rate-limits/" },
    ],
    verification:
      "重点求证了其模型运行平台定位、自定义 / fine-tune 能力，以及公开 rate limit 与 pricing 口径。",
  },
  {
    name: "Segmind",
    domain: "segmind.com",
    logoUrl: "https://www.segmind.com/favicon.ico",
    type: "参照样本 / 模型推理与 serverless 平台",
    summary:
      "Segmind 更偏模型推理与 serverless 定价平台，但在模型级透明定价和开发者购买路径上，对比价值很高。",
    strengths: [
      {
        text: "大量模型页直接公开 pricing，例如 Kling 3.0、Wan 2.7、CogVideoX 等。",
        refs: ["Kling Pricing", "Wan Pricing"],
      },
      {
        text: "同一平台内既支持 serverless，也支持 dedicated cloud，价格结构较透明。",
        refs: ["Kling Pricing", "Wan Pricing"],
      },
      {
        text: "对具体模型能力、分辨率、时长和费用的表达很细，便于开发者快速核算成本。",
        refs: ["Kling Pricing", "Wan Pricing"],
      },
    ],
    weaknesses: [
      {
        text: "平台心智更偏推理平台与部署平台，不是最典型的媒体模型 API 转售首页形态。",
        refs: ["Kling Pricing", "Wan Pricing"],
      },
      {
        text: "整体前台表达更面向开发者，不像 Kie.ai 或 APICore.ai 那样直接围绕“统一卖热门模型”来组织。",
        refs: ["Kling Pricing", "Wan Pricing"],
      },
    ],
    links: [
      { label: "Kling Pricing", href: "https://www.segmind.com/models/kling-3-standard-image2video/pricing" },
      { label: "Wan Pricing", href: "https://www.segmind.com/models/wan2.7-i2v/pricing" },
    ],
    verification:
      "重点求证了其 serverless / dedicated cloud 定价方式，以及模型级 pricing 透明度。",
  },
  {
    name: "OpenRouter",
    domain: "openrouter.ai",
    logoUrl: "https://openrouter.ai/favicon.ico",
    type: "邻近样本 / LLM 聚合与路由平台",
    summary:
      "OpenRouter 不属于媒体 API 主战场，但作为聚合 / 路由平台，其平台形态与商业表达对邻近赛道具有代表性。",
    strengths: [
      {
        text: "公开定价页说明 pay-as-you-go 覆盖 300+ models、60+ providers，平台费为 5.5%。",
        refs: ["Pricing"],
      },
      {
        text: "平台能力围绕 provider 选择、自动路由、预算控制与 BYOK 组织。",
        refs: ["Pricing"],
      },
    ],
    weaknesses: [
      {
        text: "核心心智偏 LLM routing，不是 image/video/music 主导的平台。",
        refs: ["Pricing"],
      },
      {
        text: "与媒体 API 转售站点属于邻近关系，而非最直接竞争关系。",
        refs: ["Pricing"],
      },
    ],
    links: [{ label: "Pricing", href: "https://openrouter.ai/pricing" }],
    verification:
      "重点求证了 provider 聚合规模、平台费比例，以及自动路由 / BYOK 这一类平台表达。",
  },
] as const;

type ComparisonRow = {
  name: string;
  domain: string;
  logoUrl: string;
  score: number;
  priority?: boolean;
  type: string;
  capability: string;
  pricing: string;
  pricingLink: { label: string; href: string };
  transparency: string;
  transparencyLink: { label: string; href: string };
  relationScore: string;
  relationLike: string;
  relationUnlike: string;
};

const comparisonRows = ([
  {
    name: "Kie.ai",
    domain: "kie.ai",
    logoUrl: "https://kie.ai/favicon.ico",
    score: 9.4,
    priority: true,
    type: "AI API 转售平台",
    capability: "多模态 API：视频、图片、音乐、chat",
    pricing:
      "公开文档直接强调通常比官方 API 低 30%–50%，部分模型最高可低到 80%。",
    pricingLink: { label: "Getting Started", href: "https://docs.kie.ai/index" },
    transparency:
      "公开说明默认限流为每 10 秒最多 20 个新生成请求，并通常支持 100+ 并发运行任务。",
    transparencyLink: { label: "Getting Started", href: "https://docs.kie.ai/index" },
    relationScore: "9.4 / 10",
    relationLike: "同样是以热门模型 API 转售为核心，强调统一接入、快速购买和更低价格。",
    relationUnlike:
      "Kie.ai 在公开文档里更直接强调低价与并发，而 OpenOctopus 当前前台价格与规则表达还更克制。",
  },
  {
    name: "WaveSpeedAI",
    domain: "wavespeed.ai",
    logoUrl: "https://wavespeed.ai/favicon.ico",
    score: 8.8,
    priority: true,
    type: "AI 模型目录平台",
    capability: "大规模多模型目录，覆盖图像、视频等生成能力",
    pricing:
      "定价文档说明开源模型价格与原提供方一致，闭源模型价格不高于市场平均值，并支持程序化查询单模型价格。",
    pricingLink: { label: "How pricing works", href: "https://wavespeed.ai/docs/how-pricing-works" },
    transparency:
      "账户等级页明确列出 Bronze、Silver、Gold、Ultra 的图像 / 视频速率与并发上限，是几家里规则最结构化的一家。",
    transparencyLink: { label: "Account levels", href: "https://wavespeed.ai/docs/account-levels" },
    relationScore: "8.8 / 10",
    relationLike: "同样面向开发者售卖聚合后的模型 API，覆盖图像 / 视频等媒体能力。",
    relationUnlike:
      "WaveSpeedAI 更偏“大目录 + 账户等级 + 规则公开”的平台形态，而 OpenOctopus 目前更接近精选式前台。",
  },
  {
    name: "PiAPI",
    domain: "piapi.ai",
    logoUrl: "https://piapi.ai/favicon.ico",
    score: 8.2,
    type: "生成式 AI API 聚合平台",
    capability: "多模态 API：video、image、audio、3D、LLM",
    pricing:
      "多个模型页直接公开价格示例，如 GPT-image、Seedance 2.0、Hunyuan Video 等，平台层强调 50+ AI models。",
    pricingLink: { label: "PiAPI docs", href: "https://piapi.ai/docs/gpt-image/gpt-image-api" },
    transparency:
      "价格公开度较高，但平台层规则、限流与统一等级说明的结构化程度不如 WaveSpeedAI。",
    transparencyLink: { label: "PiAPI home", href: "https://piapi.ai/" },
    relationScore: "8.2 / 10",
    relationLike: "同样是统一 API 入口，直接售卖多模态模型能力，并把热门模型单独做成前台入口。",
    relationUnlike:
      "PiAPI 的平台覆盖更广，包含 3D、LLM 等更杂的能力，OpenOctopus 赛道聚焦度更高。",
  },
  {
    name: "APICore.ai",
    domain: "apicore.ai",
    logoUrl: "https://page2.apicore.ai/favicon.ico",
    score: 7.9,
    type: "低价聚合型 API 平台",
    capability: "热门 AI 模型聚合，强调 image、video、audio 等多类生成能力",
    pricing:
      "首页直接宣传 30%–50% 成本节省，并给出 veo3-fast、gpt-4o-image、suno 的价格对比示例。",
    pricingLink: { label: "APICore home", href: "https://page2.apicore.ai/" },
    transparency:
      "营销页上的价格比较很直观，但平台层文档、限流和规则公开度目前不如 Kie.ai 或 WaveSpeedAI 完整。",
    transparencyLink: { label: "APICore home", href: "https://page2.apicore.ai/" },
    relationScore: "7.9 / 10",
    relationLike: "同样以 API 转售、统一入口、价格对比和热门模型获取为核心成交逻辑。",
    relationUnlike:
      "APICore.ai 当前更像强营销导向的低价聚合页，平台规则、文档与成熟度公开度还不够完整。",
  },
  {
    name: "fal.ai",
    domain: "fal.ai",
    logoUrl: "https://fal.ai/favicon.ico",
    score: 6.9,
    priority: true,
    type: "媒体生成基础设施平台",
    capability: "多模态媒体 API：image、video、audio、multimodal",
    pricing:
      "公开定价文档说明 Model APIs 按成功输出计费，不对排队等待或服务端错误收费。",
    pricingLink: { label: "Pricing", href: "https://fal.ai/docs/documentation/model-apis/pricing" },
    transparency:
      "平台规则公开清晰，但信息组织更偏专业开发者语境，重点是基础设施规则而不是前台销售型说明。",
    transparencyLink: { label: "Model APIs", href: "https://fal.ai/docs/documentation/model-apis/overview" },
    relationScore: "6.9 / 10",
    relationLike: "同样提供媒体模型 API，并覆盖图像、视频、音频等多模态能力。",
    relationUnlike:
      "fal.ai 更偏基础设施和生产级交付平台，不是以“转售热门模型 API”这类前台购买路径为主。",
  },
  {
    name: "Replicate",
    domain: "replicate.com",
    logoUrl: "https://replicate.com/apple-touch-icon.png",
    score: 5.8,
    type: "模型运行与托管平台",
    capability: "社区模型、自定义模型、多类型推理与部署",
    pricing:
      "价格体系以硬件与算力口径为核心，适合按底层资源成本理解，而不是按热门模型售卖口径理解。",
    pricingLink: { label: "Pricing", href: "https://replicate.com/pricing" },
    transparency:
      "公开 rate limits 文档明确说明 predictions 创建默认可达 600 请求/分钟，其余 endpoint 可达 3,000 请求/分钟。",
    transparencyLink: { label: "Rate limits", href: "https://replicate.com/docs/topics/predictions/rate-limits/" },
    relationScore: "5.8 / 10",
    relationLike: "也面向开发者提供统一的模型调用与计费入口。",
    relationUnlike: "Replicate 核心是模型运行、托管和社区生态，不是以热门闭源媒体模型 API 转售为主线。",
  },
  {
    name: "Segmind",
    domain: "segmind.com",
    logoUrl: "https://www.segmind.com/favicon.ico",
    score: 5.4,
    type: "模型推理与 serverless 平台",
    capability: "模型推理、serverless 部署、热门视频 / 图像模型 pricing",
    pricing:
      "多个模型页直接公开价格与计费方式，例如 Kling、Wan、CogVideoX 等。",
    pricingLink: { label: "Segmind Kling pricing", href: "https://www.segmind.com/models/kling-3-standard-image2video/pricing" },
    transparency:
      "模型级价格透明度较高，但平台整体心智更偏推理 / 部署平台，而不是媒体 API 转售门户。",
    transparencyLink: { label: "Segmind Wan pricing", href: "https://www.segmind.com/models/wan2.7-i2v/pricing" },
    relationScore: "5.4 / 10",
    relationLike: "也提供可直接购买和调用的热门模型能力，并且模型级定价透明。",
    relationUnlike: "Segmind 更偏推理 / 部署平台，不是典型的 API 转售门户。",
  },
  {
    name: "OpenRouter",
    domain: "openrouter.ai",
    logoUrl: "https://openrouter.ai/favicon.ico",
    score: 3.7,
    type: "LLM 聚合与路由平台",
    capability: "LLM 模型聚合、多 provider 路由与 BYOK 能力",
    pricing:
      "公开定价页说明 pay-as-you-go 覆盖 300+ models、60+ providers，并收取 5.5% 平台费。",
    pricingLink: { label: "Pricing", href: "https://openrouter.ai/pricing" },
    transparency:
      "平台费、provider 聚合与路由逻辑表达清晰，但核心场景偏 LLM，不是媒体 API 主战场。",
    transparencyLink: { label: "Pricing", href: "https://openrouter.ai/pricing" },
    relationScore: "3.7 / 10",
    relationLike: "同样是聚合平台，帮助用户通过统一入口访问不同模型。",
    relationUnlike: "OpenRouter 主战场是 LLM 路由与 provider 聚合，不是图像 / 视频 API 转售赛道的直接竞争者。",
  },
] satisfies ComparisonRow[]).sort((a, b) => b.score - a.score);

const sources = [
  {
    name: "Kie.ai 官网",
    href: "https://kie.ai/",
    note: "首页定位、能力范围、稳定性与支持卖点",
  },
  {
    name: "Kie.ai Getting Started",
    href: "https://docs.kie.ai/index",
    note: "低价声明、默认限流、稳定性 trade-off",
  },
  {
    name: "WaveSpeedAI Pricing",
    href: "https://wavespeed.ai/docs/how-pricing-works",
    note: "计费方式、credits、价格承诺、程序化查询价格",
  },
  {
    name: "WaveSpeedAI Account Levels",
    href: "https://wavespeed.ai/docs/account-levels",
    note: "Bronze / Silver / Gold / Ultra 速率与并发",
  },
  {
    name: "fal Model APIs Overview",
    href: "https://fal.ai/docs/documentation/model-apis/overview",
    note: "1,000+ 模型、media-native 平台定位",
  },
  {
    name: "fal Model API Pricing",
    href: "https://fal.ai/docs/documentation/model-apis/pricing",
    note: "成功输出计费、不收队列等待和服务端错误费用",
  },
  {
    name: "Replicate Pricing",
    href: "https://replicate.com/pricing",
    note: "硬件计费口径与基础价格",
  },
  {
    name: "Replicate Rate Limits",
    href: "https://replicate.com/docs/topics/predictions/rate-limits/",
    note: "600 RPM / 3000 RPM 默认速率限制",
  },
  {
    name: "PiAPI 官网",
    href: "https://piapi.ai/",
    note: "50+ AI models 与平台能力范围",
  },
  {
    name: "PiAPI GPT-image API",
    href: "https://piapi.ai/docs/gpt-image/gpt-image-api",
    note: "模型级价格与文档入口示例",
  },
  {
    name: "PiAPI Seedance 2.0",
    href: "https://piapi.ai/seedance-2-0",
    note: "热门视频模型单页入口示例",
  },
  {
    name: "APICore.ai 官网",
    href: "https://page2.apicore.ai/",
    note: "统一 API、低价表述与首页价格对比例子",
  },
  {
    name: "Segmind Kling Pricing",
    href: "https://www.segmind.com/models/kling-3-standard-image2video/pricing",
    note: "模型级 pricing 示例",
  },
  {
    name: "Segmind Wan Pricing",
    href: "https://www.segmind.com/models/wan2.7-i2v/pricing",
    note: "模型级 pricing 示例",
  },
  {
    name: "OpenRouter Pricing",
    href: "https://openrouter.ai/pricing",
    note: "300+ models、60+ providers、5.5% 平台费",
  },
] as const;

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-[11px] uppercase tracking-[1.2px] text-black/42">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-black md:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-sm leading-7 text-black/60 md:text-[15px]">{description}</p>
      ) : null}
    </div>
  );
}

function SourceLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-black/70 transition-colors hover:border-black/20 hover:bg-black/[0.03] hover:text-black"
    >
      {children}
    </a>
  );
}

function InlineRefs({
  refs,
  links,
}: {
  refs?: readonly string[];
  links: readonly { label: string; href: string }[];
}) {
  if (!refs?.length) return null;

  const resolved = refs
    .map((ref) => links.find((link) => link.label === ref))
    .filter((link): link is { label: string; href: string } => Boolean(link));

  if (!resolved.length) return null;

  return (
    <span className="ml-1 inline-flex flex-wrap gap-1 align-middle">
      {resolved.map((link) => (
        <a
          key={`${link.label}-${link.href}`}
          href={link.href}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-black/65 underline underline-offset-2"
        >
          [{link.label}]
        </a>
      ))}
    </span>
  );
}

function EvidenceLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="mt-2 inline-flex text-xs font-medium text-black underline underline-offset-2"
    >
      {label}
    </a>
  );
}

function ProductLogo({
  logoUrl,
  name,
}: {
  logoUrl: string;
  name: string;
}) {
  const fallback = name.replace(/[^A-Z]/g, "").slice(0, 2) || name.slice(0, 2).toUpperCase();
  return (
    <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-black/10 bg-white text-[10px] font-semibold text-black/55">
      <span
        aria-label={`${name} logo`}
        role="img"
        className="absolute inset-0 z-10 rounded-full bg-[length:65%] bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${logoUrl})`,
        }}
      />
      <span className="z-0">{fallback}</span>
    </div>
  );
}

export const metadata = {
  title: "Competitor Analysis — OpenOctopus",
  description:
    "Objective competitor analysis for AI API resale and media generation platforms.",
};

export default function BestOfPage() {
  return (
    <div className="bg-[#F7F4EE] px-6 pb-12 pt-24 md:px-10 md:pb-16 md:pt-32 lg:px-16 xl:px-20">
      <div className="mx-auto max-w-7xl space-y-16">
        <section className="rounded-[32px] border border-black/10 bg-[#11100E] px-8 py-10 text-white shadow-[0_24px_80px_rgba(17,16,14,0.16)] md:px-10 md:py-12">
          <p className="text-[11px] uppercase tracking-[1.3px] text-white/42">
            Competitor Analysis / {researchDate}
          </p>
          <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-[-0.05em] md:text-6xl">
            AI API 中转售卖平台
            <br />
            竞品分析
          </h1>
          <p className="mt-6 max-w-3xl text-sm leading-8 text-white/68 md:text-[15px]">
            基于公开官方资料，对 Kie.ai、WaveSpeedAI、PiAPI、APICore.ai、fal.ai、Replicate、Segmind 和 OpenRouter 进行结构化对比，聚焦平台定位、能力覆盖、价格表达与规则透明度。
          </p>
        </section>

        <section className="rounded-[30px] border border-black/10 bg-white p-6 md:p-8">
          <SectionHeader
            eyebrow="Core Comparison"
            title="核心对比"
            description="评分口径聚焦在 API 转售赛道相似度：是否同样通过统一入口转售热门模型 API、是否面向相似开发者客户、是否以价格 / 模型覆盖 / 调用规则影响购买决策。"
          />

          <div className="mt-8 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="border-b border-black/10 px-4 py-4 text-left text-[11px] uppercase tracking-[1.1px] text-black/42">
                    产品
                  </th>
                  <th className="border-b border-black/10 px-4 py-4 text-left text-[11px] uppercase tracking-[1.1px] text-black/42">
                    平台类型
                  </th>
                  <th className="border-b border-black/10 px-4 py-4 text-left text-[11px] uppercase tracking-[1.1px] text-black/42">
                    能力覆盖
                  </th>
                  <th className="border-b border-black/10 px-4 py-4 text-left text-[11px] uppercase tracking-[1.1px] text-black/42">
                    价格表达
                  </th>
                  <th className="border-b border-black/10 px-4 py-4 text-left text-[11px] uppercase tracking-[1.1px] text-black/42">
                    规则透明度
                  </th>
                  <th className="border-b border-black/10 px-4 py-4 text-left text-[11px] uppercase tracking-[1.1px] text-black/42">
                    API 转售相似度
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.name} className="align-top">
                    <td className="border-b border-black/8 px-4 py-5">
                      <div className="flex min-w-[180px] items-center gap-3">
                        <ProductLogo logoUrl={row.logoUrl} name={row.name} />
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-black">
                              {row.priority ? "★ " : ""}
                              {row.name}
                            </p>
                            {row.priority ? (
                              <span className="rounded-full bg-[#F3E7D8] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.8px] text-[#8A5A28]">
                                重点调研
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-black/45">{row.domain}</p>
                        </div>
                      </div>
                    </td>
                    <td className="border-b border-black/8 px-4 py-5 text-sm leading-7 text-black/62">
                      {row.type}
                    </td>
                    <td className="border-b border-black/8 px-4 py-5 text-sm leading-7 text-black/62">
                      {row.capability}
                    </td>
                    <td className="border-b border-black/8 px-4 py-5 text-sm leading-7 text-black/62">
                      <p>{row.pricing}</p>
                      <EvidenceLink href={row.pricingLink.href} label={row.pricingLink.label} />
                    </td>
                    <td className="border-b border-black/8 px-4 py-5 text-sm leading-7 text-black/62">
                      <p>{row.transparency}</p>
                      <EvidenceLink
                        href={row.transparencyLink.href}
                        label={row.transparencyLink.label}
                      />
                    </td>
                    <td className="border-b border-black/8 px-4 py-5 text-sm leading-7 text-black/62">
                      <p className="mb-2 font-semibold text-black">{row.relationScore}</p>
                      <p>
                        <span className="font-bold text-emerald-700">像：</span>
                        {row.relationLike}
                      </p>
                      <p className="mt-2">
                        <span className="font-bold text-amber-700">不像：</span>
                        {row.relationUnlike}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <SectionHeader
            eyebrow="Detailed Analysis"
            title="详细剖析"
          />

          <div className="mt-8 space-y-6">
            {competitorProfiles.map((profile) => (
              <article
                key={profile.name}
                className="rounded-[30px] border border-black/10 bg-white p-6 shadow-[0_14px_40px_rgba(28,25,23,0.04)] md:p-8"
              >
                <div>
                    <div className="flex flex-col gap-5 border-b border-black/8 pb-6 lg:flex-row lg:items-start lg:justify-between">
                      <div className="max-w-2xl">
                        <p className="text-[11px] uppercase tracking-[1.2px] text-black/40">
                          {profile.type}
                        </p>
                        <div className="mt-3 flex items-center gap-3">
                          <ProductLogo logoUrl={profile.logoUrl} name={profile.name} />
                          <div>
                            <h3 className="text-3xl font-semibold tracking-[-0.05em] text-black md:text-[34px]">
                              {profile.name}
                            </h3>
                            <p className="mt-0.5 text-xs text-black/45">{profile.domain}</p>
                          </div>
                        </div>
                        <p className="mt-4 text-sm leading-8 text-black/62 md:text-[15px]">
                          {profile.summary}
                          <InlineRefs refs={profile.links.map((link) => link.label)} links={profile.links} />
                        </p>
                        <p className="mt-4 text-sm leading-7 text-black/58">
                          <span className="font-medium text-black/72">求证重点：</span>
                          {profile.verification}
                          <InlineRefs refs={profile.links.map((link) => link.label)} links={profile.links} />
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 lg:max-w-[280px] lg:justify-end">
                        {profile.links.map((link) => (
                          <SourceLink
                            key={`${profile.name}-${link.label}-${link.href}`}
                            href={link.href}
                          >
                            {link.label}
                          </SourceLink>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 grid gap-5 md:grid-cols-2">
                      <div className="rounded-[22px] border border-black/8 bg-[#FBFAF7] p-5">
                        <p className="text-[11px] uppercase tracking-[1.1px] text-black/40">
                          已求证信息
                        </p>
                        <ul className="mt-4 space-y-3">
                          {profile.strengths.map((item) => (
                            <li key={item.text} className="text-sm leading-7 text-black/64">
                              {item.text}
                              <InlineRefs refs={item.refs} links={profile.links} />
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-[22px] border border-black/8 bg-[#FBFAF7] p-5">
                        <p className="text-[11px] uppercase tracking-[1.1px] text-black/40">
                          劣势
                        </p>
                        <ul className="mt-4 space-y-3">
                          {profile.weaknesses.map((item) => (
                            <li key={item.text} className="text-sm leading-7 text-black/64">
                              {item.text}
                              <InlineRefs refs={item.refs} links={profile.links} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[30px] border border-black/10 bg-white p-6 md:p-8">
          <SectionHeader
            eyebrow="Sources"
            title="官方来源"
          />

          <ol className="mt-8 space-y-4">
            {sources.map((source, index) => (
              <li key={source.href} className="border-b border-black/8 pb-4 last:border-b-0 last:pb-0">
                <p className="text-sm leading-7 text-black/70">
                  [{index + 1}] {source.name}.{" "}
                  <a
                    href={source.href}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-black underline underline-offset-2"
                  >
                    {source.href}
                  </a>
                  . {source.note}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
