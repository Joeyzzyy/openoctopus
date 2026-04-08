export const featuredModels = [
  {
    id: "wan-2.1-text-to-video",
    name: "Wan 2.1 Text to Video",
    provider: "Alibaba",
    task: "text-to-video",
    image: "/models/wan.jpg",
    price: "$0.30",
    originalPrice: "$0.35",
    discount: "15% off",
    badge: "hot",
  },
  {
    id: "nano-banana-2",
    name: "Nano Banana 2",
    provider: "Open Octopus",
    task: "text-to-image",
    image: "/models/banana.jpg",
    price: "$0.02",
    originalPrice: "$0.03",
    discount: "15% off",
    badge: "new",
  },
  {
    id: "seedream-v4",
    name: "Seedream V4",
    provider: "ByteDance",
    task: "text-to-image",
    image: "/models/seedream.jpg",
    price: "$0.04",
    originalPrice: "$0.05",
    discount: "15% off",
    badge: "feature",
  },
  {
    id: "gemini-3-pro",
    name: "Gemini 3 Pro High",
    provider: "Google",
    task: "text-to-image",
    image: "/models/gemini.jpg",
    price: "$0.05",
    originalPrice: "$0.06",
    badge: null,
  },
  {
    id: "kling-o3",
    name: "Kling O3",
    provider: "Kuaishou",
    task: "text-to-video",
    image: "/models/kling.jpg",
    price: "$0.25",
    originalPrice: "$0.30",
    discount: "15% off",
    badge: "hot",
  },
  {
    id: "flux-schnell",
    name: "Flux Schnell",
    provider: "Black Forest",
    task: "text-to-image",
    image: "/models/flux.jpg",
    price: "$0.01",
    originalPrice: "$0.02",
    badge: null,
  },
  {
    id: "wan-2.1-image-to-video",
    name: "Wan 2.1 Image to Video",
    provider: "Alibaba",
    task: "image-to-video",
    image: "/models/wan-i2v.jpg",
    price: "$0.28",
    originalPrice: "$0.33",
    discount: "15% off",
    badge: null,
  },
  {
    id: "infinitetalk",
    name: "InfiniteTalk",
    provider: "Open Octopus",
    task: "audio-to-video",
    image: "/models/infinitetalk.jpg",
    price: "$0.15",
    originalPrice: "$0.18",
    badge: "new",
  },
];

export const collections = [
  { name: "Wan 2.1", count: 6, icon: "🌊" },
  { name: "Flux", count: 8, icon: "⚡" },
  { name: "Kling", count: 4, icon: "🎬" },
  { name: "Seedream", count: 3, icon: "🌱" },
  { name: "Gemini", count: 5, icon: "♊" },
  { name: "OpenAI", count: 4, icon: "🤖" },
  { name: "Minimax", count: 3, icon: "🎭" },
  { name: "Qwen", count: 4, icon: "🔮" },
];

export const categories = [
  { name: "Best Video Models", count: 12 },
  { name: "Image Generation", count: 18 },
  { name: "Image Editing", count: 8 },
  { name: "Motion Control", count: 6 },
  { name: "Object Detection", count: 4 },
  { name: "Audio for Video", count: 5 },
  { name: "3D Creation", count: 3 },
  { name: "Face Animation", count: 7 },
];

export const testimonials = [
  {
    name: "Alejandro Palma",
    title: "VP of Engineering, Freepik",
    avatar: "AP",
    quote:
      "Open Octopus inference speed is remarkable. We integrated the API into our creative suite and saw a 3x improvement in generation time compared to our previous provider.",
  },
  {
    name: "Junyu Huang",
    title: "CTO, Novita AI",
    avatar: "JH",
    quote:
      "The unified API approach saves us significant engineering time. Instead of maintaining integrations with multiple model providers, we use a single Open Octopus endpoint.",
  },
  {
    name: "Chen Wei",
    title: "Head of AI, SocialBook",
    avatar: "CW",
    quote:
      "Moving to Open Octopus cut our inference costs by 40% while actually improving output quality. The support team is incredibly responsive and technically competent.",
  },
  {
    name: "Yan Li",
    title: "Product Lead, MiniMax",
    avatar: "YL",
    quote:
      "Open Octopus makes it easy to experiment with different models. We can quickly switch between providers and find the best fit for each use case without rewriting code.",
  },
  {
    name: "Liu Liu",
    title: "Creator, Draw Things",
    avatar: "LL",
    quote:
      "As an indie developer, I appreciate Open Octopus straightforward pricing and documentation. I had my first API call working within 15 minutes of signing up.",
  },
  {
    name: "QinQuan Gao",
    title: "CEO, Imperial Vision",
    avatar: "QG",
    quote:
      "The reliability and uptime of Open Octopus infrastructure is what sets them apart. We process millions of requests daily and have never experienced a significant outage.",
  },
];

export const techFeatures = [
  {
    title: "Vast Model Library",
    description:
      "Access the entire HuggingFace hub and top proprietary models with a single unified API key.",
    icon: "Library",
  },
  {
    title: "Blazing Fast Inference",
    description:
      "Optimized GPU clusters deliver up to 4x faster token generation for LLMs and sub-second rendering for image models.",
    icon: "Zap",
  },
  {
    title: "Built for Scale",
    description:
      "Enterprise-grade reliability with 99.99% uptime guarantees and dedicated throughput for high-volume applications.",
    icon: "Server",
  },
  {
    title: "Security",
    description:
      "SOC 2 Type II compliant with end-to-end encryption and private VPC deployment options.",
    icon: "Shield",
  },
];
