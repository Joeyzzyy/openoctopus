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
    title: "Cloud Architect at Freepik",
    company: "Freepik",
    avatar: "AP",
    quote:
      "Everyone wants faster, cheaper, and their way to use AI image and video generation services? Partnering with OpenOctopus has helped us stay competitive in AI media generation.",
  },
  {
    name: "Junyu Huang",
    title: "Novita AI COO",
    company: "Novita AI",
    avatar: "JH",
    quote:
      "OpenOctopus has significantly improved our inference efficiency and helped us cut video generation costs by up to 67%. With faster and more reliable video processing, we're able to deliver an exceptional user experience at scale.",
  },
  {
    name: "Chen",
    title: "CTO@SocialBook",
    company: "SocialBook",
    avatar: "CW",
    quote:
      "OpenOctopus lives up to its name — the model is fast, and their team's response time is even faster. We recently switched to OpenOctopus, and the difference is night and day.",
  },
  {
    name: "Yan Li",
    title: "Manager of MiniMax platform",
    company: "MiniMax",
    avatar: "YL",
    quote:
      "OpenOctopus demonstrates extremely powerful capabilities in reasoning and acceleration optimization. We deeply value our collaboration, as it enables more users to experience cutting-edge speech and video models.",
  },
  {
    name: "Liu Liu",
    title: "Draw Things",
    company: "Draw Things",
    avatar: "LL",
    quote:
      "Many of our users praise the OpenOctopus integration. 'The result is the same, but now it is under 3 seconds.' The integration allows us to do one-stop integration to catch up with the latest models — it is very important in this fast-moving space.",
  },
  {
    name: "QinQuan Gao",
    title: "CEO/Co-Founder of Imperial Vision",
    company: "Imperial Vision",
    avatar: "QG",
    quote:
      "OpenOctopus helped us strike the perfect balance between content generation speed and quality.",
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

/* ─── Explore / Models page ─── */

export const exploreCategories = [
  { name: "Object Detection and Segmentation", count: 5 },
  { name: "Content Detection Models", count: 5 },
  { name: "Motion Control Models", count: 10 },
  { name: "Best Video Models", count: 92 },
  { name: "Best Image Models", count: 123 },
  { name: "Swap Anything", count: 8 },
  { name: "Audio for Video", count: 41 },
  { name: "Video Edit", count: 32 },
  { name: "Ultra Selection", count: 15 },
  { name: "LoRA Generation", count: 52 },
  { name: "Generate Music", count: 12 },
  { name: "First and Last Frame Video", count: 15 },
  { name: "Remove Anything", count: 12 },
  { name: "3D Creation", count: 14 },
  { name: "Avatar Lipsync Models", count: 35 },
  { name: "Training Tools", count: 11 },
  { name: "Enhance Videos", count: 17 },
  { name: "Image Editing", count: 132 },
  { name: "Upscale Image", count: 17 },
  { name: "Speech Generation", count: 4 },
];

export const exploreCollections = [
  { name: "Wan 2.7 Models", count: 12 },
  { name: "Qwen Image 2 Models", count: 6 },
  { name: "Grok Models", count: 3 },
  { name: "Seedance 1.5 Pro Models", count: 4 },
  { name: "Wan 2.6 Models", count: 8 },
  { name: "Kling O3 Models", count: 5 },
  { name: "OpenAI Models", count: 4 },
  { name: "Wan 2.5 Models", count: 6 },
  { name: "Seedream Models", count: 5 },
  { name: "Wan 2.2 Models", count: 4 },
  { name: "Dreamina AI Models", count: 3 },
  { name: "Seedance Models", count: 4 },
  { name: "Flux Image Tools", count: 8 },
  { name: "Minimax Hailuo Models", count: 5 },
  { name: "Kling Models", count: 6 },
  { name: "Google Models", count: 4 },
  { name: "Flux Kontext Models", count: 3 },
  { name: "Runwayml AI Models", count: 2 },
];

export const modelStats = [
  { label: "text-to-video", count: 92 },
  { label: "text-to-image", count: 123 },
  { label: "lora-support", count: 52 },
  { label: "image-to-video", count: 177 },
  { label: "image-to-image", count: 132 },
  { label: "image-to-3d", count: 14 },
  { label: "video-dubbing", count: 6 },
  { label: "training", count: 11 },
  { label: "video-to-video", count: 32 },
  { label: "upscaler", count: 17 },
  { label: "video-effects", count: 70 },
  { label: "image-effects", count: 18 },
  { label: "portrait-transfer", count: 11 },
  { label: "text-to-audio", count: 41 },
  { label: "ai-remover", count: 12 },
  { label: "digital-human", count: 35 },
  { label: "motion-control", count: 10 },
  { label: "content-moderation", count: 5 },
  { label: "llm", count: 5 },
  { label: "video-to-text", count: 6 },
  { label: "image-to-text", count: 13 },
  { label: "speech-to-text", count: 4 },
  { label: "audio-to-audio", count: 8 },
  { label: "video-extend", count: 15 },
  { label: "text-to-3d", count: 4 },
  { label: "video-to-audio", count: 1 },
];

export const popularModels = [
  { id: "wan-2.7-t2v", name: "Wan 2.7 Text to Video", provider: "Alibaba", task: "text-to-video" },
  { id: "wan-2.7-i2v", name: "Wan 2.7 Image to Video", provider: "Alibaba", task: "image-to-video" },
  { id: "wan-2.7-ref2v", name: "Wan 2.7 Reference to Video", provider: "Alibaba", task: "reference-to-video" },
  { id: "wan-2.7-edit", name: "Wan 2.7 Video Edit", provider: "Alibaba", task: "video-edit" },
  { id: "nano-banana-pro-edit", name: "Nano Banana Pro Edit", provider: "Google", task: "image-edit" },
  { id: "nano-banana-2-edit", name: "Nano Banana 2 Edit", provider: "Google", task: "image-edit" },
  { id: "nano-banana-2-t2i", name: "Nano Banana 2 Text to Image", provider: "Google", task: "text-to-image" },
  { id: "nano-banana-pro-t2i", name: "Nano Banana Pro Text to Image", provider: "Google", task: "text-to-image" },
  { id: "seedream-v4.5-edit", name: "Seedream V4.5 Edit", provider: "ByteDance", task: "image-edit" },
  { id: "infinitetalk", name: "InfiniteTalk", provider: "Open Octopus", task: "digital-human" },
  { id: "wan-2.7-image-edit", name: "Wan 2.7 Image Edit", provider: "Alibaba", task: "image-edit" },
  { id: "wan-2.7-image-edit-pro", name: "Wan 2.7 Image Edit Pro", provider: "Alibaba", task: "image-edit" },
  { id: "wan-2.2-animate", name: "Wan 2.2 Animate", provider: "Open Octopus", task: "animation" },
  { id: "kling-v2.6-motion", name: "Kling V2.6 Pro Motion Control", provider: "Kuaishou", task: "motion-control" },
  { id: "wan-2.6-i2v-spicy", name: "Wan 2.6 I2V Spicy", provider: "Alibaba", task: "image-to-video" },
  { id: "wan-2.6-i2v", name: "Wan 2.6 Image to Video", provider: "Alibaba", task: "image-to-video" },
];

export const pricingFAQ = [
  {
    question: "How does pricing work?",
    answer:
      "OpenOctopus uses a pay-per-use model. You only pay for what you generate. There are no monthly fees or commitments.",
  },
  {
    question: "What payment methods are accepted?",
    answer:
      "We accept all major credit cards (Visa, Mastercard, American Express), PayPal, and wire transfers for enterprise customers. Cryptocurrency payments are also supported.",
  },
  {
    question: "Is there a free trial?",
    answer:
      "Yes! New accounts receive $1 in free credits to try out our platform. No credit card required to sign up.",
  },
  {
    question: "Can I get a refund?",
    answer:
      "Unused credits can be refunded within 30 days of purchase. Once credits are used for generation, they cannot be refunded.",
  },
  {
    question: "What are account levels?",
    answer:
      "OpenOctopus offers four account levels: Bronze (default), Silver ($100 top-up), Gold ($1,000 top-up), and Ultra ($10,000 top-up). Higher tiers unlock increased rate limits and priority queue access.",
  },
  {
    question: "Do you offer enterprise pricing?",
    answer:
      "Yes! For high-volume usage, we offer custom enterprise plans with volume discounts, dedicated support, and SLAs. Contact our sales team to learn more.",
  },
];

/* ─── Enterprise page ─── */

export const enterpriseCapabilities = [
  {
    title: "Image & Video Models",
    description:
      "State-of-the-art image and video generation with models like Kling O3, Seedream V4.5, Veo 3.1, and Wan 2.6.",
    models: ["Kling O3", "Seedream V4.5", "Veo 3.1", "Wan 2.6"],
  },
  {
    title: "Language Models",
    description:
      "Access leading LLMs including GPT-5.4, Claude Opus 4.6, Gemini 3.1 Pro, and Qwen3 Max with up to 200K context windows.",
    models: ["GPT-5.4", "Claude Opus 4.6", "Gemini 3.1 Pro", "Qwen3 Max"],
  },
  {
    title: "Serverless GPU",
    description:
      "Run your own models on enterprise-grade GPUs with auto-scaling, pay-per-second billing, and zero cold starts.",
    features: ["SOC 2 Type II", "End-to-end encryption", "Auto-scaling", "Pay-per-second", "Zero cold starts"],
  },
];

export const enterpriseBenefits = [
  {
    title: "Priority Support",
    description: "Fast-track your requests with priority access to our engineering team.",
    icon: "Headset",
  },
  {
    title: "Higher GPU Limits",
    description: "Scale without constraints with increased GPU allocation and concurrent processing.",
    icon: "Cpu",
  },
  {
    title: "Enterprise SLAs",
    description: "Guaranteed uptime and performance with enterprise-grade service level agreements.",
    icon: "ShieldCheck",
  },
  {
    title: "Custom Model Support",
    description: "Expert guidance to help you deploy custom models and optimize performance.",
    icon: "Wrench",
  },
  {
    title: "Dedicated Account Manager",
    description: "Get personalized support from a dedicated team member who understands your needs.",
    icon: "UserCheck",
  },
  {
    title: "Volume Discounts",
    description: "We offer volume discounts for large amounts of spend. Contact us to learn more.",
    icon: "BadgePercent",
  },
];

/* ─── About page ─── */

export const aboutMetrics = [
  { value: "1,000+", label: "AI Models" },
  { value: "<1s", label: "Inference Latency" },
  { value: "0", label: "Cold Starts" },
  { value: "1M+", label: "Trusted Users" },
];

export const whatWeDo = [
  {
    title: "AI Generators",
    description:
      "No-code tools for image, video, avatar, and audio generation — pick a model, enter a prompt, and create.",
    icon: "Sparkles",
  },
  {
    title: "REST API",
    description:
      "Integrate any of our 1,000+ models with a single API call. Python, Node, cURL — ship in minutes.",
    icon: "Code",
  },
  {
    title: "Desktop App",
    description:
      "The full power of our inference engine in a native desktop app. No code, no setup, just create.",
    icon: "Monitor",
  },
  {
    title: "Serverless GPU",
    description:
      "Deploy your own models on our infrastructure. Auto-scaling, no cold starts, pay per use.",
    icon: "Server",
  },
];

export const aboutPersonas = [
  {
    title: "Developers",
    description:
      "A single API key unlocks 1,000+ models. Comprehensive docs, client libraries for Python and JavaScript, and webhook support for async workflows.",
    icon: "Code",
  },
  {
    title: "Creators",
    description:
      "Generate stunning images, videos, and audio directly from the browser or desktop app. No code required — just describe what you want.",
    icon: "Palette",
  },
  {
    title: "Enterprises",
    description:
      "Dedicated support, custom SLAs, volume discounts, and help with model deployment. Scale your AI workloads with confidence.",
    icon: "Building",
  },
];

export const aboutValues = [
  {
    title: "Speed",
    description:
      "Every millisecond counts. Our infrastructure is engineered from the ground up to minimize latency and maximize throughput.",
  },
  {
    title: "Openness",
    description:
      "We believe the best AI should be accessible to everyone. That's why we support 1,000+ open-source and proprietary models.",
  },
  {
    title: "Simplicity",
    description:
      "Complex technology, simple interface. One API, one dashboard, one platform — whether you're a developer or a creator.",
  },
  {
    title: "Scale",
    description:
      "From a single image to millions of API calls. Our serverless infrastructure scales with you, with no cold starts and no limits.",
  },
];

export const trustedByCompanies = [
  "Freepik",
  "Novita AI",
  "SocialBook",
  "MiniMax",
  "Draw Things",
  "Imperial Vision",
  "AI-Mirror",
];

export const communityLinks = [
  { label: "Discord", href: "https://discord.com/invite/7WQTe7jMmY" },
  { label: "X / Twitter", href: "https://x.com/openoctopus" },
  { label: "GitHub", href: "https://github.com/OpenOctopus" },
  { label: "Blog", href: "https://openoctopus.ai/blog" },
];
