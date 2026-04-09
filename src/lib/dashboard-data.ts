export type DashboardNavItem = {
  label: string;
  value: string;
  active?: boolean;
};

export type OverviewMetric = {
  label: string;
  value: string;
  change: string;
  tone: "neutral" | "positive" | "warning";
};

export type SpendPoint = {
  day: string;
  spend: number;
};

export type ModelSpend = {
  model: string;
  provider: string;
  spend: string;
  share: number;
  requests: string;
};

export type BudgetRule = {
  scope: string;
  limit: string;
  used: string;
  progress: number;
  state: "healthy" | "watch" | "critical";
};

export type ApiKeyRow = {
  name: string;
  prefix: string;
  environment: string;
  budget: string;
  spent: string;
  requests: string;
  lastUsed: string;
  status: "active" | "warning" | "paused";
};

export type UsageRow = {
  time: string;
  apiKey: string;
  model: string;
  endpoint: string;
  units: string;
  cost: string;
  status: string;
};

export type LedgerRow = {
  title: string;
  detail: string;
  amount: string;
  tone: "positive" | "negative" | "neutral";
};

export type ProviderStatus = "healthy" | "degraded" | "offline";

export type ProviderSummary = {
  name: string;
  kind: string;
  regions: string;
  models: number;
  queue: string;
  status: ProviderStatus;
};

export type RoutingRule = {
  capability: string;
  publicModel: string;
  primary: string;
  fallback: string;
  strategy: string;
};

export type RequestQueueRow = {
  requestId: string;
  capability: string;
  model: string;
  provider: string;
  status: "queued" | "processing" | "succeeded" | "failed";
  latency: string;
  cost: string;
};

export const dashboardNav: DashboardNavItem[] = [
  { label: "Overview", value: "overview", active: true },
  { label: "Wallet", value: "wallet" },
  { label: "API Keys", value: "keys" },
  { label: "Budgets", value: "budgets" },
  { label: "Usage", value: "usage" },
  { label: "Audit Logs", value: "logs" },
];

export const overviewMetrics: OverviewMetric[] = [
  { label: "Available Credit", value: "$12,480.00", change: "+$2,000 top-up today", tone: "positive" },
  { label: "Month Spend", value: "$3,284.71", change: "+18.4% vs last month", tone: "warning" },
  { label: "Active API Keys", value: "12", change: "3 keys created this week", tone: "neutral" },
  { label: "Budget Remaining", value: "$6,715.29", change: "67.2% of workspace cap left", tone: "positive" },
];

export const spendTrend: SpendPoint[] = [
  { day: "Mon", spend: 180 },
  { day: "Tue", spend: 220 },
  { day: "Wed", spend: 195 },
  { day: "Thu", spend: 280 },
  { day: "Fri", spend: 310 },
  { day: "Sat", spend: 205 },
  { day: "Sun", spend: 248 },
];

export const modelSpend: ModelSpend[] = [
  { model: "Seedream 4.5", provider: "ByteDance", spend: "$1,145.20", share: 35, requests: "42.8k req" },
  { model: "Kling V3 Motion", provider: "Kuaishou", spend: "$864.41", share: 26, requests: "18.2k req" },
  { model: "Nano Banana 2", provider: "Google", spend: "$597.08", share: 18, requests: "66.1k req" },
  { model: "InfiniteTalk", provider: "OpenOctopus", spend: "$362.73", share: 11, requests: "9.4k req" },
  { model: "Flux Kontext", provider: "Black Forest", spend: "$315.29", share: 10, requests: "12.0k req" },
];

export const budgetRules: BudgetRule[] = [
  { scope: "Workspace Monthly Cap", limit: "$10,000", used: "$3,284.71", progress: 32.8, state: "healthy" },
  { scope: "Prod Key / openoct-prod", limit: "$4,500", used: "$2,980.40", progress: 66.2, state: "watch" },
  { scope: "Studio Team / image batch", limit: "$1,200", used: "$1,041.12", progress: 86.8, state: "critical" },
];

export const apiKeys: ApiKeyRow[] = [
  {
    name: "openoct-prod",
    prefix: "ooq_prod_8hK3",
    environment: "Production",
    budget: "$4,500",
    spent: "$2,980.40",
    requests: "128.4k",
    lastUsed: "2 min ago",
    status: "active",
  },
  {
    name: "studio-batch",
    prefix: "ooq_srv_2Pn9",
    environment: "Server",
    budget: "$1,200",
    spent: "$1,041.12",
    requests: "48.9k",
    lastUsed: "12 min ago",
    status: "warning",
  },
  {
    name: "mobile-sandbox",
    prefix: "ooq_dev_1Ts1",
    environment: "Development",
    budget: "$300",
    spent: "$84.62",
    requests: "9.1k",
    lastUsed: "43 min ago",
    status: "active",
  },
  {
    name: "agency-partner",
    prefix: "ooq_ext_6Qm4",
    environment: "Partner",
    budget: "$850",
    spent: "$0.00",
    requests: "0",
    lastUsed: "never",
    status: "paused",
  },
];

export const usageRows: UsageRow[] = [
  {
    time: "2026-04-08 14:32",
    apiKey: "openoct-prod",
    model: "Seedream 4.5",
    endpoint: "/v1/images/generate",
    units: "48 images",
    cost: "$18.24",
    status: "200 OK",
  },
  {
    time: "2026-04-08 14:25",
    apiKey: "studio-batch",
    model: "Kling V3 Motion",
    endpoint: "/v1/video/generate",
    units: "7 jobs",
    cost: "$26.11",
    status: "200 OK",
  },
  {
    time: "2026-04-08 14:11",
    apiKey: "mobile-sandbox",
    model: "Nano Banana 2",
    endpoint: "/v1/images/edit",
    units: "96 images",
    cost: "$4.90",
    status: "200 OK",
  },
  {
    time: "2026-04-08 13:48",
    apiKey: "openoct-prod",
    model: "InfiniteTalk",
    endpoint: "/v1/video/talk",
    units: "3 jobs",
    cost: "$12.60",
    status: "200 OK",
  },
  {
    time: "2026-04-08 13:31",
    apiKey: "studio-batch",
    model: "Flux Kontext",
    endpoint: "/v1/images/generate",
    units: "64 images",
    cost: "$6.72",
    status: "429 retry",
  },
];

export const ledgerRows: LedgerRow[] = [
  { title: "Manual top-up", detail: "Finance team recharged workspace balance", amount: "+$2,000.00", tone: "positive" },
  { title: "Usage settlement", detail: "Seedream 4.5 generation charges", amount: "-$18.24", tone: "negative" },
  { title: "Usage settlement", detail: "Kling V3 Motion generation charges", amount: "-$26.11", tone: "negative" },
  { title: "Budget alert", detail: "studio-batch crossed 80% monthly cap", amount: "Watch", tone: "neutral" },
];

export const providerSummaries: ProviderSummary[] = [
  {
    name: "WaveSpeed Images",
    kind: "Primary upstream",
    regions: "sgp1 · us-west",
    models: 1,
    queue: "11 queued",
    status: "healthy",
  },
  {
    name: "WaveSpeed Video",
    kind: "Primary upstream",
    regions: "sgp1",
    models: 1,
    queue: "4 queued",
    status: "healthy",
  },
  {
    name: "Partner Provider A",
    kind: "Fallback upstream",
    regions: "us-east",
    models: 1,
    queue: "0 queued",
    status: "degraded",
  },
];

export const routingRules: RoutingRule[] = [
  {
    capability: "Image generation",
    publicModel: "openoctopus/seedream-4.5",
    primary: "WaveSpeed Images / seedream-v4.5",
    fallback: "Partner Provider A / flux-kontext",
    strategy: "Primary, then fallback on 5xx or timeout",
  },
  {
    capability: "Video generation",
    publicModel: "openoctopus/kling-v3-motion",
    primary: "WaveSpeed Video / kling-v3-motion",
    fallback: "manual failover only",
    strategy: "Primary only for MVP",
  },
  {
    capability: "Image editing",
    publicModel: "openoctopus/flux-kontext-edit",
    primary: "Partner Provider A / flux-edit",
    fallback: "WaveSpeed Images / seedream-edit",
    strategy: "Route by capability tag",
  },
];

export const requestQueueRows: RequestQueueRow[] = [
  {
    requestId: "req_01JQ9W0M33J4",
    capability: "image",
    model: "openoctopus/seedream-4.5",
    provider: "WaveSpeed Images",
    status: "processing",
    latency: "12s",
    cost: "$0.38",
  },
  {
    requestId: "req_01JQ9VY5P9AM",
    capability: "video",
    model: "openoctopus/kling-v3-motion",
    provider: "WaveSpeed Video",
    status: "queued",
    latency: "queueing",
    cost: "pending",
  },
  {
    requestId: "req_01JQ9VX0M2CY",
    capability: "image-edit",
    model: "openoctopus/flux-kontext-edit",
    provider: "Partner Provider A",
    status: "succeeded",
    latency: "8s",
    cost: "$0.09",
  },
];
