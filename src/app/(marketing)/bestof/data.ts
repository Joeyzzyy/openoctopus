export const researchDate = "2026-04-18";

/* ------------------------------------------------------------------ */
/*  Tier definitions                                                   */
/* ------------------------------------------------------------------ */

export type Tier = "focus" | "competitor" | "other";

export const tierMeta: Record<
  Tier,
  { label: string; eyebrow: string; description: string }
> = {
  focus: {
    label: "重点关注",
    eyebrow: "Key Competitors",
    description:
      "与 OpenOctopus 赛道最接近、最值得持续跟踪的直接竞品。以统一 API 转售热门媒体模型为核心，面向相似的开发者客户群体。",
  },
  competitor: {
    label: "是竞品，但不需要重点关注",
    eyebrow: "Also Competing",
    description:
      "在能力、客户或商业模式上有明确交集，但平台心智、赛道聚焦度或市场覆盖与 OpenOctopus 存在差异。",
  },
  other: {
    label: "参照 / 邻近 / 区域性平台",
    eyebrow: "Adjacent & Regional",
    description:
      "包括推理平台、LLM 路由、中国市场 API 中转等邻近生态，对比价值主要在能力参照或区域补充。",
  },
};

/* ------------------------------------------------------------------ */
/*  Comparison rows (table)                                            */
/* ------------------------------------------------------------------ */

export type ComparisonRow = {
  name: string;
  domain: string;
  logoUrl: string;
  score: number;
  tier: Tier;
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

export const comparisonRows: ComparisonRow[] = ([
  /* ============================================================== */
  /*  Tier: focus — 重点关注                                         */
  /* ============================================================== */
  {
    name: "Kie.ai",
    domain: "kie.ai",
    logoUrl: "https://kie.ai/favicon.ico",
    score: 9.4,
    tier: "focus" as Tier,
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
    name: "PoYo.ai",
    domain: "poyo.ai",
    logoUrl: "https://poyo.ai/favicon.ico",
    score: 9.2,
    tier: "focus" as Tier,
    type: "多模态 API 转售平台",
    capability: "图像、视频、音乐、chat（Sora-2、Veo 3.1、Suno、ElevenLabs 等）",
    pricing:
      "Credit 制定价，官网宣称比官方便宜最多 80%，直接对标 PiAPI。",
    pricingLink: { label: "PoYo.ai", href: "https://poyo.ai/" },
    transparency:
      "前台价格对比比较直观，但平台层文档与规则公开体系尚处早期。",
    transparencyLink: { label: "PoYo.ai", href: "https://poyo.ai/" },
    relationScore: "9.2 / 10",
    relationLike: "覆盖图像/视频/音乐/chat，统一 API 入口转售，定价逻辑与 OpenOctopus 几乎一致。",
    relationUnlike:
      "品牌较新，市场认知度与产品成熟度尚待观察。",
  },
  {
    name: "WaveSpeedAI",
    domain: "wavespeed.ai",
    logoUrl: "https://wavespeed.ai/favicon.ico",
    score: 8.8,
    tier: "focus" as Tier,
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
      "WaveSpeedAI 更偏「大目录 + 账户等级 + 规则公开」的平台形态，而 OpenOctopus 目前更接近精选式前台。",
  },
  {
    name: "APIMart",
    domain: "apimart.ai",
    logoUrl: "https://apimart.ai/favicon.ico",
    score: 8.6,
    tier: "focus" as Tier,
    type: "统一 AI API 聚合平台",
    capability: "500+ 模型：GPT-5、Sora 2、Veo 3.1、Seedream 4.5 等",
    pricing:
      "OpenAI 兼容接口，官网宣称最高节省 70%，直接对标 WaveSpeed 和 PiAPI。",
    pricingLink: { label: "APIMart", href: "https://apimart.ai/" },
    transparency:
      "平台层面规则公开度仍需进一步验证，目前以营销页为主。",
    transparencyLink: { label: "APIMart", href: "https://apimart.ai/" },
    relationScore: "8.6 / 10",
    relationLike: "统一 API、低价转售、热门媒体模型覆盖，几乎完全重合。",
    relationUnlike:
      "品牌更新，文档与规则体系的公开完备度有待追踪。",
  },
  {
    name: "PiAPI",
    domain: "piapi.ai",
    logoUrl: "https://piapi.ai/favicon.ico",
    score: 8.2,
    tier: "focus" as Tier,
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
    tier: "focus" as Tier,
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
    name: "Atlas Cloud",
    domain: "atlascloud.ai",
    logoUrl: "https://atlascloud.ai/favicon.ico",
    score: 8.4,
    tier: "focus" as Tier,
    type: "全模态推理 API 平台",
    capability: "chat、reasoning、image、audio、video 统一 API，300+ 模型，OpenAI 兼容",
    pricing:
      "官网宣称比 fal.ai 便宜 50%，支持 Kling、Seedance、Vidu、Wan、Hailuo 等视频模型。",
    pricingLink: { label: "Atlas Cloud", href: "https://atlascloud.ai/" },
    transparency:
      "平台定位清晰，但规则与文档完备度需持续跟进。",
    transparencyLink: { label: "Atlas Cloud", href: "https://atlascloud.ai/" },
    relationScore: "8.4 / 10",
    relationLike: "全模态统一 API、低价定位、热门媒体模型覆盖，竞争关系非常直接。",
    relationUnlike:
      "更强调 reasoning 与 chat 能力线，媒体转售可能不是唯一主线。",
  },
  {
    name: "Pixazo",
    domain: "pixazo.ai",
    logoUrl: "https://pixazo.ai/favicon.ico",
    score: 8.3,
    tier: "focus" as Tier,
    type: "统一视觉 AI API 平台",
    capability: "600+ 视觉生成模型：Flux、SDXL、WAN、Sora 类、Veo 3、虚拟试穿、口型同步等",
    pricing:
      "统一 API key 接入，单次调用计费，覆盖主流图像与视频生成模型。",
    pricingLink: { label: "Pixazo", href: "https://pixazo.ai/" },
    transparency:
      "平台聚焦视觉生成，模型覆盖面很广但定价结构需进一步验证。",
    transparencyLink: { label: "Pixazo", href: "https://pixazo.ai/" },
    relationScore: "8.3 / 10",
    relationLike: "统一 API、多模型覆盖、聚焦视觉生成，定位高度重合。",
    relationUnlike:
      "偏视觉方向，不覆盖音乐/chat 等非视觉能力线。",
  },

  /* ============================================================== */
  /*  Tier: competitor — 是竞品但不需要重点关注                       */
  /* ============================================================== */
  {
    name: "Runware",
    domain: "runware.ai",
    logoUrl: "https://runware.ai/favicon.ico",
    score: 7.5,
    tier: "competitor" as Tier,
    type: "AI 推理基础设施平台",
    capability: "300,000+ 模型变体，覆盖图像、视频、音频、3D，自研推理引擎",
    pricing:
      "宣称开源模型 10x 性价比优势，$50M A 轮融资，客户包括 Wix、Quora、Freepik。",
    pricingLink: { label: "Runware", href: "https://runware.ai/" },
    transparency:
      "更偏企业级基础设施，文档和规则公开较完整，但产品形态不是典型的转售前台。",
    transparencyLink: { label: "Runware", href: "https://runware.ai/" },
    relationScore: "7.5 / 10",
    relationLike: "统一 API、多模态覆盖、价格竞争力强，客户群有交集。",
    relationUnlike:
      "更偏基础设施平台 + 企业大客户路线，融资体量和产品形态差异较大。",
  },
  {
    name: "Pollo AI",
    domain: "pollo.ai",
    logoUrl: "https://pollo.ai/favicon.ico",
    score: 7.4,
    tier: "competitor" as Tier,
    type: "图像与视频 API 平台",
    capability: "图像和视频生成 API：Kling、Runway、Veo 3、Hailuo 等",
    pricing:
      "宣称比 fal.ai 更便宜，同时提供消费端 App 和开发者 API。",
    pricingLink: { label: "Pollo AI API", href: "https://pollo.ai/api-platform" },
    transparency:
      "兼顾 C 端和 B 端，API 平台信息公开度中等。",
    transparencyLink: { label: "Pollo AI", href: "https://pollo.ai/" },
    relationScore: "7.4 / 10",
    relationLike: "提供热门视频模型 API，低价定位。",
    relationUnlike:
      "同时做 C 端应用，平台心智不完全在开发者 API 转售上。",
  },
  {
    name: "AIML API",
    domain: "aimlapi.com",
    logoUrl: "https://aimlapi.com/favicon.ico",
    score: 7.3,
    tier: "competitor" as Tier,
    type: "多模态 AI API 聚合平台",
    capability: "400+ 模型，覆盖 text、image、video、audio、multimodal",
    pricing:
      "统一 OpenAI 兼容 API，被评为 PiAPI 流量最相似竞品。",
    pricingLink: { label: "AIML API", href: "https://aimlapi.com/" },
    transparency:
      "平台覆盖面广，文档体系较完整，但品牌知名度相对有限。",
    transparencyLink: { label: "AIML API", href: "https://aimlapi.com/" },
    relationScore: "7.3 / 10",
    relationLike: "统一 API 入口、多模态覆盖、面向开发者。",
    relationUnlike:
      "模型覆盖更杂更广，赛道聚焦度不如 OpenOctopus。",
  },
  {
    name: "CometAPI",
    domain: "cometapi.com",
    logoUrl: "https://cometapi.com/favicon.ico",
    score: 7.2,
    tier: "competitor" as Tier,
    type: "多模态 API 聚合平台",
    capability: "500+ AI 模型，覆盖文字、音乐、图像、视频生成",
    pricing:
      "统一 API 访问，开发者中心定位，价格竞争力为核心卖点。",
    pricingLink: { label: "CometAPI", href: "https://cometapi.com/" },
    transparency:
      "平台处于成长期，文档和规则公开体系尚在完善。",
    transparencyLink: { label: "CometAPI", href: "https://cometapi.com/" },
    relationScore: "7.2 / 10",
    relationLike: "多模态 API 聚合，统一入口售卖逻辑相同。",
    relationUnlike:
      "品牌成熟度和市场认知度较低。",
  },
  {
    name: "EvoLink",
    domain: "evolink.ai",
    logoUrl: "https://evolink.ai/favicon.ico",
    score: 7.1,
    tier: "competitor" as Tier,
    type: "AI API 网关平台",
    capability: "40+ AI 模型，覆盖 chat、video、image、music，智能路由",
    pricing:
      "实时路由到最便宜的 provider，宣称节省 20–70%。",
    pricingLink: { label: "EvoLink", href: "https://evolink.ai/" },
    transparency:
      "平台规模较小，但智能路由和实时比价是差异化卖点。",
    transparencyLink: { label: "EvoLink", href: "https://evolink.ai/" },
    relationScore: "7.1 / 10",
    relationLike: "统一 API、低价路由、多模态覆盖，产品逻辑高度相似。",
    relationUnlike:
      "模型数量和覆盖面相对有限。",
  },
  {
    name: "AI Video API",
    domain: "aivideoapi.com",
    logoUrl: "https://aivideoapi.com/favicon.ico",
    score: 7.0,
    tier: "competitor" as Tier,
    type: "视频生成 API 专注平台",
    capability: "专注视频生成：Veo 3.1、Sora 2、Kling 3.0、Seedance 2.0、WAN 2.6",
    pricing:
      "Credit 制，宣称比官方价格最高便宜 50%。",
    pricingLink: { label: "AI Video API", href: "https://aivideoapi.com/" },
    transparency:
      "聚焦视频单一赛道，规则简单直接。",
    transparencyLink: { label: "AI Video API", href: "https://aivideoapi.com/" },
    relationScore: "7.0 / 10",
    relationLike: "视频模型 API 转售，低价定位。",
    relationUnlike:
      "只覆盖视频，不涉及图像/音乐/chat。",
  },
  {
    name: "fal.ai",
    domain: "fal.ai",
    logoUrl: "https://fal.ai/favicon.ico",
    score: 6.9,
    tier: "competitor" as Tier,
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
      "fal.ai 更偏基础设施和生产级交付平台，不是以「转售热门模型 API」这类前台购买路径为主。",
  },
  {
    name: "Eden AI",
    domain: "edenai.co",
    logoUrl: "https://edenai.co/favicon.ico",
    score: 6.5,
    tier: "competitor" as Tier,
    type: "统一 AI API 聚合平台",
    capability: "500+ LLM 及 AI 模型，覆盖 vision、text、speech、generative",
    pricing:
      "纯用量计费（无订阅），平台费 5.5%，巴黎总部，较成熟。",
    pricingLink: { label: "Eden AI", href: "https://www.edenai.co/" },
    transparency:
      "平台文档和规则体系相对完善，但核心场景偏 NLP/vision 而非媒体生成。",
    transparencyLink: { label: "Eden AI", href: "https://www.edenai.co/" },
    relationScore: "6.5 / 10",
    relationLike: "统一 API 聚合、用量计费、面向开发者。",
    relationUnlike:
      "核心场景偏传统 AI（NLP/OCR/语音），不是以媒体生成转售为主线。",
  },
  {
    name: "Novita AI",
    domain: "novita.ai",
    logoUrl: "https://novita.ai/favicon.ico",
    score: 6.4,
    tier: "competitor" as Tier,
    type: "模型 API + GPU 云平台",
    capability: "200+ 模型 API + GPU 云，10,000+ SD checkpoints，覆盖 image/video/LLM/TTS",
    pricing:
      "图像生成低至 $0.0015/张，同时提供 GPU 租赁服务。",
    pricingLink: { label: "Novita AI", href: "https://novita.ai/" },
    transparency:
      "图像生成价格极具竞争力，但平台心智更偏 GPU 云 + 推理服务。",
    transparencyLink: { label: "Novita AI", href: "https://novita.ai/" },
    relationScore: "6.4 / 10",
    relationLike: "提供多模态模型 API，图像生成有极强价格竞争力。",
    relationUnlike:
      "同时做 GPU 云租赁，平台形态更杂。",
  },
  {
    name: "Zenmux",
    domain: "zenmux.ai",
    logoUrl: "https://zenmux.ai/favicon.ico",
    score: 6.2,
    tier: "competitor" as Tier,
    type: "企业级 LLM 聚合平台",
    capability: "主流 LLM 聚合，自动路由，独特的幻觉/延迟保险补偿机制",
    pricing:
      "自动路由到最优质最低价 provider，提供质量保障机制。",
    pricingLink: { label: "Zenmux", href: "https://zenmux.ai/" },
    transparency:
      "差异化在保险/补偿机制，但核心偏 LLM 而非媒体生成。",
    transparencyLink: { label: "Zenmux", href: "https://zenmux.ai/" },
    relationScore: "6.2 / 10",
    relationLike: "聚合平台，自动路由，成本优化。",
    relationUnlike:
      "偏 LLM 聚合与企业合规场景，不覆盖媒体生成。",
  },

  /* ============================================================== */
  /*  Tier: other — 参照 / 邻近 / 区域性                             */
  /* ============================================================== */
  {
    name: "Replicate",
    domain: "replicate.com",
    logoUrl: "https://replicate.com/apple-touch-icon.png",
    score: 5.8,
    tier: "other" as Tier,
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
    name: "Together AI",
    domain: "together.ai",
    logoUrl: "https://together.ai/favicon.ico",
    score: 5.7,
    tier: "other" as Tier,
    type: "开源模型推理平台",
    capability: "200+ 开源模型，sub-100ms 延迟，主要覆盖 LLM，逐步拓展图像",
    pricing:
      "按推理用量计费，知名度高，融资充足。",
    pricingLink: { label: "Together AI", href: "https://www.together.ai/" },
    transparency:
      "文档与开发者体验成熟，但核心场景偏 LLM 推理。",
    transparencyLink: { label: "Together AI", href: "https://www.together.ai/" },
    relationScore: "5.7 / 10",
    relationLike: "统一推理 API，面向开发者，价格有竞争力。",
    relationUnlike:
      "以 LLM 推理为核心，不是媒体模型转售平台。",
  },
  {
    name: "Fireworks AI",
    domain: "fireworks.ai",
    logoUrl: "https://fireworks.ai/favicon.ico",
    score: 5.5,
    tier: "other" as Tier,
    type: "推理优化平台",
    capability: "自研 FireAttention 推理引擎，覆盖文本、图像、音频",
    pricing:
      "以推理速度和吞吐量为核心卖点，按用量计费。",
    pricingLink: { label: "Fireworks AI", href: "https://fireworks.ai/" },
    transparency:
      "技术导向，文档完善，但定位偏推理基础设施。",
    transparencyLink: { label: "Fireworks AI", href: "https://fireworks.ai/" },
    relationScore: "5.5 / 10",
    relationLike: "提供多模态推理 API，面向开发者。",
    relationUnlike:
      "核心卖点是推理速度而非模型覆盖或低价转售。",
  },
  {
    name: "Segmind",
    domain: "segmind.com",
    logoUrl: "https://www.segmind.com/favicon.ico",
    score: 5.4,
    tier: "other" as Tier,
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
    name: "DeepInfra",
    domain: "deepinfra.com",
    logoUrl: "https://deepinfra.com/favicon.ico",
    score: 5.3,
    tier: "other" as Tier,
    type: "低成本推理 API 平台",
    capability: "OpenAI 兼容推理 API，支持多模态模型",
    pricing:
      "部分模型比 Replicate 便宜 97–99%，极致成本优化。",
    pricingLink: { label: "DeepInfra", href: "https://deepinfra.com/" },
    transparency:
      "文档简洁，定价透明，但平台偏底层推理。",
    transparencyLink: { label: "DeepInfra", href: "https://deepinfra.com/" },
    relationScore: "5.3 / 10",
    relationLike: "低价推理 API，OpenAI 兼容。",
    relationUnlike:
      "偏底层推理服务，不做模型聚合转售。",
  },
  {
    name: "TokenMix",
    domain: "tokenmix.ai",
    logoUrl: "https://tokenmix.ai/favicon.ico",
    score: 5.2,
    tier: "other" as Tier,
    type: "LLM 成本套利平台",
    capability: "300+ 模型，自动 failover，路由到最便宜 provider",
    pricing:
      "低于官方定价，自动 failover，主要覆盖 LLM，部分覆盖图像。",
    pricingLink: { label: "TokenMix", href: "https://tokenmix.ai/" },
    transparency:
      "以成本套利为核心卖点，规则公开度中等。",
    transparencyLink: { label: "TokenMix", href: "https://tokenmix.ai/" },
    relationScore: "5.2 / 10",
    relationLike: "聚合路由、成本优化逻辑相似。",
    relationUnlike:
      "偏 LLM，图像覆盖有限。",
  },
  {
    name: "AI.cc",
    domain: "ai.cc",
    logoUrl: "https://ai.cc/favicon.ico",
    score: 5.0,
    tier: "other" as Tier,
    type: "统一 AI API 平台",
    capability: "300+ 模型，OpenAI 兼容，新加坡总部",
    pricing:
      "宣称批量采购节省最多 80%，无限 TPM/RPM。",
    pricingLink: { label: "AI.cc", href: "https://www.ai.cc/" },
    transparency:
      "Serverless 架构，但市场可见度与品牌成熟度有限。",
    transparencyLink: { label: "AI.cc", href: "https://www.ai.cc/" },
    relationScore: "5.0 / 10",
    relationLike: "统一 API、低价、多模型覆盖。",
    relationUnlike:
      "品牌认知度较低，区域性更强。",
  },
  {
    name: "Requesty",
    domain: "requesty.ai",
    logoUrl: "https://requesty.ai/favicon.ico",
    score: 4.5,
    tier: "other" as Tier,
    type: "AI 网关平台",
    capability: "400+ LLM provider，智能路由、缓存、failover、治理",
    pricing:
      "欧洲版 OpenRouter 定位，$3M 种子轮，企业安全特性。",
    pricingLink: { label: "Requesty", href: "https://www.requesty.ai/" },
    transparency:
      "企业治理与安全为核心，偏网关而非转售。",
    transparencyLink: { label: "Requesty", href: "https://www.requesty.ai/" },
    relationScore: "4.5 / 10",
    relationLike: "AI 聚合网关，多 provider 路由。",
    relationUnlike:
      "偏 LLM 网关与企业治理，不涉及媒体模型。",
  },
  {
    name: "OpenRouter",
    domain: "openrouter.ai",
    logoUrl: "https://openrouter.ai/favicon.ico",
    score: 3.7,
    tier: "other" as Tier,
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
  {
    name: "DMXAPI",
    domain: "dmxapi.com",
    logoUrl: "https://dmxapi.com/favicon.ico",
    score: 4.8,
    tier: "other" as Tier,
    type: "中国市场 AI API 中转平台",
    capability: "300+ AI 模型聚合中转，覆盖 OpenAI/Claude/Gemini，面向中国开发者",
    pricing:
      "中转定价，为中国开发者提供海外模型访问通道。",
    pricingLink: { label: "DMXAPI", href: "https://dmxapi.com/" },
    transparency:
      "国内主流中转平台之一，但公开文档体系与国际平台有差异。",
    transparencyLink: { label: "DMXAPI", href: "https://dmxapi.com/" },
    relationScore: "4.8 / 10",
    relationLike: "API 中转聚合，面向开发者，多模型覆盖。",
    relationUnlike:
      "核心场景是帮中国开发者访问海外模型，不是全球市场的媒体 API 转售。",
  },
  {
    name: "UIUIAPI",
    domain: "uiuiapi.com",
    logoUrl: "https://uiuiapi.com/favicon.ico",
    score: 4.7,
    tier: "other" as Tier,
    type: "中国市场一站式 AI 聚合平台",
    capability: "300+ 大模型，含 Midjourney、Suno、视频模型等",
    pricing:
      "一站式聚合，覆盖文生图/音乐/视频等多种生成能力。",
    pricingLink: { label: "UIUIAPI", href: "https://uiuiapi.com/" },
    transparency:
      "中文市场覆盖面广，但国际化程度有限。",
    transparencyLink: { label: "UIUIAPI", href: "https://uiuiapi.com/" },
    relationScore: "4.7 / 10",
    relationLike: "多模态聚合，覆盖 Midjourney/Suno/视频模型。",
    relationUnlike:
      "面向中文市场，平台形态与国际竞品差异较大。",
  },
  {
    name: "DeerAPI (小鹿 API)",
    domain: "deerapi.com",
    logoUrl: "https://deerapi.com/favicon.ico",
    score: 4.5,
    tier: "other" as Tier,
    type: "中国市场 AI API 聚合中转",
    capability: "聚合 OpenAI/Claude/Gemini + Midjourney/Suno/Luma",
    pricing:
      "中转聚合，支持图像/视频/音乐 API 访问。",
    pricingLink: { label: "DeerAPI", href: "https://deerapi.com/" },
    transparency:
      "覆盖面较广但以中文市场为主。",
    transparencyLink: { label: "DeerAPI", href: "https://deerapi.com/" },
    relationScore: "4.5 / 10",
    relationLike: "多模态 API 聚合，含媒体生成模型。",
    relationUnlike:
      "区域性平台，面向中国开发者。",
  },
  {
    name: "UniAPI",
    domain: "uniapi.ai",
    logoUrl: "https://uniapi.ai/favicon.ico",
    score: 4.4,
    tier: "other" as Tier,
    type: "中国市场全模型聚合中转",
    capability: "全模型聚合：OpenAI/Claude/Midjourney/Suno，企业级中转",
    pricing:
      "企业级中转服务，统一计费。",
    pricingLink: { label: "UniAPI", href: "https://uniapi.ai/" },
    transparency:
      "偏企业级中转服务，国际化程度有限。",
    transparencyLink: { label: "UniAPI", href: "https://uniapi.ai/" },
    relationScore: "4.4 / 10",
    relationLike: "全模型聚合中转，统一入口。",
    relationUnlike:
      "中国市场定位，企业级服务为主。",
  },
  {
    name: "Apiyi",
    domain: "apiyi.com",
    logoUrl: "https://apiyi.com/favicon.ico",
    score: 4.3,
    tier: "other" as Tier,
    type: "亚太区 AI API 聚合平台",
    capability: "GPT-5、Claude、Gemini、Grok、DeepSeek、Qwen、ERNIE 等",
    pricing:
      "宣称节省 45–85%，支持国产与海外模型混合调用。",
    pricingLink: { label: "Apiyi", href: "https://apiyi.com/" },
    transparency:
      "亚太优化，中英双语支持。",
    transparencyLink: { label: "Apiyi", href: "https://apiyi.com/" },
    relationScore: "4.3 / 10",
    relationLike: "聚合平台，低价，多模型。",
    relationUnlike:
      "偏亚太区域，核心场景偏 LLM 而非媒体生成。",
  },
  {
    name: "PPIO",
    domain: "ppio.com",
    logoUrl: "https://ppio.com/favicon.ico",
    score: 4.0,
    tier: "other" as Tier,
    type: "分布式云计算 + 多模态 API",
    capability: "分布式云 + 图像、视频、音频、LLM 等多模态 API",
    pricing:
      "基于分布式云基础设施提供 API 服务。",
    pricingLink: { label: "PPIO", href: "https://ppio.com/" },
    transparency:
      "云计算为主线，API 服务为衍生能力。",
    transparencyLink: { label: "PPIO", href: "https://ppio.com/" },
    relationScore: "4.0 / 10",
    relationLike: "提供多模态 API 服务。",
    relationUnlike:
      "核心是分布式云计算基础设施，API 是附加业务线。",
  },
] satisfies ComparisonRow[]).sort((a, b) => b.score - a.score);

/* ------------------------------------------------------------------ */
/*  Detailed profiles                                                  */
/* ------------------------------------------------------------------ */

export type CompetitorProfile = {
  name: string;
  domain: string;
  logoUrl: string;
  type: string;
  summary: string;
  strengths: { text: string; refs: readonly string[] }[];
  weaknesses: { text: string; refs: readonly string[] }[];
  links: { label: string; href: string }[];
  verification: string;
};

export const competitorProfiles: CompetitorProfile[] = [
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
        text: "整体前台表达更面向开发者，不像 Kie.ai 或 APICore.ai 那样直接围绕\u201c统一卖热门模型\u201d来组织。",
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
  {
    name: "PoYo.ai",
    domain: "poyo.ai",
    logoUrl: "https://poyo.ai/favicon.ico",
    type: "直接竞品 / 多模态 API 转售平台",
    summary:
      "PoYo.ai 是统一 AI API 平台，聚合 500+ 模型覆盖图像、视频、音乐与 chat，采用 credit 制按量付费，宣称最高比官方 API 便宜 80%，定位与 OpenOctopus 高度重合。",
    strengths: [
      {
        text: "多模态覆盖广：500+ 模型，涵盖图像（GPT Image 1.5、Seedream 4.5）、视频（Sora 2、Veo 3.1、Runway Gen-4.5、Wan 系列）、音乐（Suno v4/v4.5/v5、ElevenLabs、Mureka）及 chat（Claude Sonnet 4.5、Gemini 3、GPT-5）。",
        refs: ["官网", "模型列表"],
      },
      {
        text: "定价激进：Sora 2 低至 $0.05/视频，GPT Image 1.5 低至 $0.01/张，Seedream 4.5 低至 $0.05/张。",
        refs: ["官网", "Sora 2 定价对比"],
      },
      {
        text: "Credit 制按量付费，无订阅，credits 不过期，降低开发者承诺门槛。",
        refs: ["官网", "文档"],
      },
      {
        text: "所有模型均提供免费 Playground 测试，无需信用卡。",
        refs: ["官网"],
      },
    ],
    weaknesses: [
      {
        text: "第三方评价极少，主流评测平台无评分，平台较新，可靠性难以独立验证。",
        refs: ["TAAFT 页面"],
      },
      {
        text: "使用自定义异步 task_id 轮询/webhook 模式，非 OpenAI 兼容格式，对从 OpenAI SDK 迁移的开发者有额外接入成本。",
        refs: ["API 文档"],
      },
      {
        text: "Rate limit 和配额未公开文档化，仅描述为按 key 设置，具体数值需登录后查看。",
        refs: ["API 文档"],
      },
    ],
    links: [
      { label: "官网", href: "https://poyo.ai/" },
      { label: "文档", href: "https://docs.poyo.ai/" },
      { label: "API 文档", href: "https://docs.poyo.ai/api-manual/overview" },
      { label: "模型列表", href: "https://poyo.ai/ai-image-api" },
      { label: "Sora 2 定价对比", href: "https://poyo.ai/comparison/sora-2-api-pricing" },
      { label: "TAAFT 页面", href: "https://theresanaiforthat.com/ai/poyo-ai/" },
    ],
    verification:
      "求证了首页 80% 低价声明与四类能力覆盖；docs.poyo.ai 确认 task_id 异步模式、webhook 支持和按 key 限流；模型定价页确认 Sora 2 $0.05、GPT Image 1.5 $0.01。99.9% uptime 和 500+ 模型数量为自述，未独立验证。",
  },
  {
    name: "APIMart",
    domain: "apimart.ai",
    logoUrl: "https://apimart.ai/favicon.ico",
    type: "直接竞品 / 统一 AI API 聚合平台",
    summary:
      "APIMart 提供 500+ 模型的统一 OpenAI 兼容 API，覆盖 chat、图像、视频与音乐生成，宣称最高节省 70%，按量付费无月费门槛，智能多 provider 路由与自动 failover。",
    strengths: [
      {
        text: "500+ 模型覆盖 chat、图像、视频、音乐，包括 GPT-5、Claude Sonnet 4.5、Gemini 2.0 Flash、Sora 2、VEO3、Flux.1 等。",
        refs: ["官网", "Documentation"],
      },
      {
        text: "OpenAI 兼容 API 格式，只需更换 base URL 即可迁移，支持 streaming、function calling、JSON mode、vision 和最高 1M tokens 上下文。",
        refs: ["Documentation"],
      },
      {
        text: "按量付费无月费门槛，宣称最高节省 70%，支持自动阶梯折扣。",
        refs: ["官网"],
      },
    ],
    weaknesses: [
      {
        text: "官网和文档均未公开发布逐模型的 per-token 定价表，成本验证困难。",
        refs: ["官网", "Documentation"],
      },
      {
        text: "独立开发者反馈极少；Trustpilot 上至少有一条报告购买 credits 后无法使用、怀疑是 scam 的负面评价。",
        refs: ["Trustpilot"],
      },
      {
        text: "Rate limit 和用量配额未在公开文档中说明，需登录 dashboard 查看。",
        refs: ["Documentation"],
      },
    ],
    links: [
      { label: "官网", href: "https://apimart.ai/" },
      { label: "Documentation", href: "https://docs.apimart.ai/" },
      { label: "Quick Start", href: "https://docs.apimart.ai/en/quickstart" },
      { label: "Trustpilot", href: "https://www.trustpilot.com/review/apimart.ai" },
    ],
    verification:
      "求证了 OpenAI 兼容端点 api.apimart.ai/v1；500+ 模型在多个第三方列表中确认；按量付费无订阅确认；70% 节省为自述未独立验证；per-token 定价未在公开文档中找到；Trustpilot 页面存在负面评价。",
  },
  {
    name: "Atlas Cloud",
    domain: "atlascloud.ai",
    logoUrl: "https://atlascloud.ai/favicon.ico",
    type: "直接竞品 / 全模态推理 API 平台",
    summary:
      "Atlas Cloud 定位为全球首个全模态推理平台，通过单一 OpenAI 兼容 API 提供 300+ 模型，覆盖 chat、reasoning、图像、视频与音频，按量付费，视频模型含原生音频生成不额外收费。",
    strengths: [
      {
        text: "真正的全模态覆盖：text/chat、图像生成（Flux、GPT Image 2）、视频生成（Wan 2.7、Seedance 2.0、Kling 3.0、Vidu Q3）及音频，视频内置原生音频不额外收费。",
        refs: ["官网", "视频模型博客"],
      },
      {
        text: "300+ 模型来自 10+ provider（OpenAI、Anthropic、Google、Qwen、MiniMax、ByteDance 等），单 API key 接入，OpenAI 兼容。",
        refs: ["官网", "模型目录"],
      },
      {
        text: "透明的逐模型定价与实时比价工具，最低 $0.10/1M tokens；新用户 $5 免费额度 + 首充 20% 奖励。",
        refs: ["定价页", "订阅方案"],
      },
    ],
    weaknesses: [
      {
        text: "模型目录约 350 个，相比 fal.ai（600–1,000+）覆盖面较窄，聚焦生产级模型，缺少实验性和社区模型。",
        refs: ["fal.ai 对比博客"],
      },
      {
        text: "公开评价极少，Trustpilot 仅 1 条评价（3.7 分），有用户报告账单与支持响应慢的问题，对生产环境依赖构成风险。",
        refs: ["Trustpilot"],
      },
    ],
    links: [
      { label: "官网", href: "https://www.atlascloud.ai/" },
      { label: "模型目录", href: "https://www.atlascloud.ai/models/list" },
      { label: "定价页", href: "https://www.atlascloud.ai/pricing/models" },
      { label: "订阅方案", href: "https://www.atlascloud.ai/pricing/subscription-plan" },
      { label: "视频模型博客", href: "https://www.atlascloud.ai/blog/guides/ai-video-models-native-audio-compared" },
      { label: "fal.ai 对比博客", href: "https://www.atlascloud.ai/blog/guides/best-fal-aI-alternative-in-2026-why-teams-switch-to-atlas-cloud" },
      { label: "Trustpilot", href: "https://www.trustpilot.com/review/atlascloud.ai" },
    ],
    verification:
      "求证了 OpenAI 兼容 API（api.atlascloud.ai/v1）；300+ 模型在多处确认；$5 免费额度和首充 20% 奖励在订阅页确认；逐模型定价示例已验证（Qwen3.6 Plus $0.325/1M、GPT OSS 120b $0.10/1M）；全模态覆盖含具体模型名已确认；Trustpilot 3.7 分 / 1 条评价已确认。",
  },
  {
    name: "Pixazo",
    domain: "pixazo.ai",
    logoUrl: "https://pixazo.ai/favicon.ico",
    type: "直接竞品 / 统一视觉 AI API 平台",
    summary:
      "Pixazo（前身 Appy Pie Design，2025 年 9 月品牌重塑）聚合 600+ 视觉生成模型，覆盖图像、视频、音频、Avatar、口型同步与虚拟试穿，单一 API key 接入，按量付费起步价低至 $0.0012/张。",
    strengths: [
      {
        text: "600+ 模型覆盖图像（Flux、SDXL、Qwen Image）、视频（WAN 2.5、Veo 3）、音频、Avatar、口型同步（Sync/Kling/LatentSync/OmniHuman）与虚拟试穿（IDM-VTON），模态覆盖在同类平台中最广。",
        refs: ["API 页面", "OpenPR 新闻稿"],
      },
      {
        text: "免费层：100 次 API 调用，无需信用卡；Flux Schnell 和 SDXL 可在免费层以全质量 1024x1024 使用。",
        refs: ["免费 API 页面", "API 定价页面"],
      },
      {
        text: "按量付费极低价：Flux Schnell $0.0012/张，4K 图像 $0.12/张。",
        refs: ["Flux Schnell 定价博客", "API 定价页面"],
      },
    ],
    weaknesses: [
      {
        text: "前身为 Appy Pie Design（无代码设计工具），2025 年 9 月才品牌重塑为 API 平台；Scamadviser 信任分 71/100（中低风险），Google Play 评价提到界面混乱与 credit 限制。",
        refs: ["Scamadviser", "Appy Pie 品牌重塑新闻"],
      },
      {
        text: "Rate limit、定价分层与超额费用未以结构化方式公开，无 SLA、无公开延迟保证；免费层每日生成上限「因模型和系统容量而异」，具体数值未公布。",
        refs: ["API 文档", "API 定价页面"],
      },
    ],
    links: [
      { label: "官网", href: "https://www.pixazo.ai/" },
      { label: "API 页面", href: "https://www.pixazo.ai/api" },
      { label: "模型中心", href: "https://www.pixazo.ai/models" },
      { label: "API 定价页面", href: "https://www.pixazo.ai/api/pricing-plan" },
      { label: "免费 API 页面", href: "https://www.pixazo.ai/api/free" },
      { label: "Flux Schnell 定价博客", href: "https://www.pixazo.ai/blog/flux-schnell-api-cheapest-pricing" },
      { label: "OpenPR 新闻稿", href: "https://www.openpr.com/news/4271869/pixazo-launches-unified-visual-ai-api-platform-one-api-key" },
      { label: "Appy Pie 品牌重塑新闻", href: "https://www.cbs42.com/business/press-releases/ein-presswire/852067866/appy-pie-design-rebrands-as-pixazo-free-unlimited-ai-image-video-generation-during-launch-week/" },
      { label: "Scamadviser", href: "https://www.scamadviser.com/check-website/pixazo.ai" },
      { label: "API 文档", href: "https://www.pixazo.ai/api" },
    ],
    verification:
      "求证了 600+ 模型声明（API 页面与新闻稿）；Flux Schnell $0.0012/张定价（博客确认）；100 次免费调用（免费 API 页面确认）；Appy Pie Design 品牌重塑（多条新闻稿确认，2025 年 9 月）；Scamadviser 信任分 71 已确认。600+ 模型是否包含变体/配置未独立验证。",
  },
];

/* ------------------------------------------------------------------ */
/*  Sources                                                            */
/* ------------------------------------------------------------------ */

export type Source = { name: string; href: string; note: string };

export const sources: Source[] = [
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
  {
    name: "PoYo.ai",
    href: "https://poyo.ai/",
    note: "图像/视频/音乐/chat API 转售，对标 PiAPI",
  },
  {
    name: "APIMart",
    href: "https://apimart.ai/",
    note: "500+ 模型，OpenAI 兼容，对标 WaveSpeed 与 PiAPI",
  },
  {
    name: "Atlas Cloud",
    href: "https://atlascloud.ai/",
    note: "全模态推理 API，300+ 模型",
  },
  {
    name: "Pixazo",
    href: "https://pixazo.ai/",
    note: "600+ 视觉生成模型，统一 API",
  },
  {
    name: "Runware",
    href: "https://runware.ai/",
    note: "$50M A 轮，300K+ 模型变体",
  },
  {
    name: "Pollo AI",
    href: "https://pollo.ai/",
    note: "图像与视频 API + 消费端应用",
  },
  {
    name: "AIML API",
    href: "https://aimlapi.com/",
    note: "400+ 模型，PiAPI 流量最相似竞品",
  },
  {
    name: "CometAPI",
    href: "https://cometapi.com/",
    note: "500+ 模型多模态聚合",
  },
  {
    name: "EvoLink",
    href: "https://evolink.ai/",
    note: "智能路由 AI API 网关",
  },
  {
    name: "AI Video API",
    href: "https://aivideoapi.com/",
    note: "视频生成 API 专注平台",
  },
  {
    name: "Eden AI",
    href: "https://www.edenai.co/",
    note: "500+ 模型，5.5% 平台费",
  },
  {
    name: "Novita AI",
    href: "https://novita.ai/",
    note: "模型 API + GPU 云",
  },
  {
    name: "Zenmux",
    href: "https://zenmux.ai/",
    note: "企业级 LLM 聚合 + 保险机制",
  },
  {
    name: "Together AI",
    href: "https://www.together.ai/",
    note: "开源模型推理平台",
  },
  {
    name: "Fireworks AI",
    href: "https://fireworks.ai/",
    note: "自研推理引擎",
  },
  {
    name: "DeepInfra",
    href: "https://deepinfra.com/",
    note: "低成本推理 API",
  },
  {
    name: "TokenMix",
    href: "https://tokenmix.ai/",
    note: "LLM 成本套利与路由",
  },
  {
    name: "AI.cc",
    href: "https://www.ai.cc/",
    note: "新加坡，300+ 模型",
  },
  {
    name: "Requesty",
    href: "https://www.requesty.ai/",
    note: "欧洲 AI 网关",
  },
  {
    name: "DMXAPI",
    href: "https://dmxapi.com/",
    note: "中国主流 API 中转平台",
  },
  {
    name: "UIUIAPI",
    href: "https://uiuiapi.com/",
    note: "一站式 AI 聚合（中国市场）",
  },
  {
    name: "DeerAPI",
    href: "https://deerapi.com/",
    note: "中国市场 AI API 聚合中转",
  },
  {
    name: "UniAPI",
    href: "https://uniapi.ai/",
    note: "全模型企业级中转（中国市场）",
  },
  {
    name: "Apiyi",
    href: "https://apiyi.com/",
    note: "亚太区 AI API 聚合",
  },
  {
    name: "PPIO",
    href: "https://ppio.com/",
    note: "分布式云 + 多模态 API",
  },
  {
    name: "PoYo.ai 文档",
    href: "https://docs.poyo.ai/",
    note: "API 文档、异步 task_id 模式、webhook 支持",
  },
  {
    name: "PoYo.ai Sora 2 定价对比",
    href: "https://poyo.ai/comparison/sora-2-api-pricing",
    note: "Sora 2 $0.05/视频、GPT Image 1.5 $0.01/张",
  },
  {
    name: "APIMart 文档",
    href: "https://docs.apimart.ai/",
    note: "OpenAI 兼容端点、Quick Start、API 格式",
  },
  {
    name: "APIMart Trustpilot",
    href: "https://www.trustpilot.com/review/apimart.ai",
    note: "用户评价与信任度参考",
  },
  {
    name: "Atlas Cloud 模型目录",
    href: "https://www.atlascloud.ai/models/list",
    note: "300+ 模型清单与分类",
  },
  {
    name: "Atlas Cloud 定价",
    href: "https://www.atlascloud.ai/pricing/models",
    note: "逐模型定价与实时比价工具",
  },
  {
    name: "Atlas Cloud 视频模型博客",
    href: "https://www.atlascloud.ai/blog/guides/ai-video-models-native-audio-compared",
    note: "Wan 2.7、Seedance 2.0、Kling 3.0 视频模型对比",
  },
  {
    name: "Atlas Cloud Trustpilot",
    href: "https://www.trustpilot.com/review/atlascloud.ai",
    note: "3.7 分 / 1 条评价",
  },
  {
    name: "Pixazo API",
    href: "https://www.pixazo.ai/api",
    note: "600+ 模型、统一 API key、REST 接口",
  },
  {
    name: "Pixazo 定价",
    href: "https://www.pixazo.ai/api/pricing-plan",
    note: "Flux Schnell $0.0012/张、4K $0.12/张",
  },
  {
    name: "Pixazo 品牌重塑新闻",
    href: "https://www.openpr.com/news/4271869/pixazo-launches-unified-visual-ai-api-platform-one-api-key",
    note: "前身 Appy Pie Design、2025 年 9 月品牌重塑",
  },
];
