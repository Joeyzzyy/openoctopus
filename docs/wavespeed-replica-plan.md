# WaveSpeed.ai 骨灰级复刻方案

## 一、设计 Token 系统

### 颜色
```typescript
// tailwind.config.ts 扩展
colors: {
  ws: {
    bg: '#0a0a0a',           // 主背景
    'bg-card': '#111111',    // 卡片背景
    orange: '#FF9500',       // Banner/强调
    green: '#22C55E',        // 在线状态
    'text-primary': '#FFFFFF',
    'text-secondary': 'rgba(255,255,255,0.6)',
    'text-muted': 'rgba(255,255,255,0.4)',
    border: 'rgba(255,255,255,0.1)',
  }
}
```

### 字体
- **Display**: System font stack (头部大标题)
- **Mono**: 等宽字体 (代码块、标签)
- **Base**: Inter / system-ui

### 间距系统
- Page padding: `px-4 sm:px-6 lg:px-20`
- Max-width: `max-w-7xl` (1280px) / `max-w-[1160px]`
- Section gap: `py-20`

---

## 二、组件架构

```
src/
├── app/
│   ├── page.tsx                 # 组装页面
│   ├── layout.tsx               # RootLayout + 字体
│   └── globals.css              # 全局样式 + Token
│
├── components/
│   ├── layout/
│   │   ├── Header.tsx           # 顶部导航
│   │   ├── Banner.tsx           # 橙色通知条
│   │   ├── Footer.tsx           # 页脚
│   │   └── MobileNav.tsx        # 移动端菜单
│   │
│   ├── hero/
│   │   ├── HeroSlideshow.tsx    # 主轮播
│   │   ├── HeroSlide.tsx        # 单张幻灯片
│   │   ├── ThumbnailNav.tsx     # 缩略图导航
│   │   └── ProgressBar.tsx      # 播放进度条
│   │
│   ├── models/
│   │   ├── FeaturedModels.tsx   # 精选模型区块
│   │   ├── ProviderCard.tsx     # 供应商卡片
│   │   ├── CategoryCard.tsx     # 分类卡片
│   │   └── StatusDots.tsx       # 状态指示器
│   │
│   ├── features/
│   │   ├── FeaturesSection.tsx  # 功能特性区块
│   │   ├── FeatureTabs.tsx      # 标签切换
│   │   ├── CodeEditorCard.tsx   # 代码编辑器
│   │   └── UserVoices.tsx       # 用户评价
│   │
│   └── creators/
│       └── ForCreators.tsx      # 创作者区块
│
├── hooks/
│   ├── useScrollPosition.ts     # 滚动位置
│   ├── useInterval.ts           # 轮播定时器
│   └── useMediaQuery.ts         # 响应式
│
└── lib/
    ├── utils.ts
    └── constants.ts             # 数据/配置
```

---

## 三、关键实现细节

### 1. Header 滚动效果
```typescript
// 滚动时背景从透明变为半透明黑
const [scrolled, setScrolled] = useState(false);
useEffect(() => {
  const handleScroll = () => setScrolled(window.scrollY > 50);
  window.addEventListener('scroll', handleScroll);
}, []);

// className
`fixed top-0 z-50 w-full transition-all duration-300
 ${scrolled ? 'bg-black/80 backdrop-blur-md' : 'bg-transparent'}`
```

### 2. HeroSlideshow 轮播
```typescript
// 5 张图自动轮播，间隔 5000ms
// 缩略图点击可跳转
// 底部有进度条动画 (animate-[progress-fill_5000ms])
const slides = [
  { image: '/hero/1.jpg', title: '...', desc: '...' },
  // ...
];
```

### 3. FeaturedModels 立体堆叠
- 左右两侧各 18 个 ProviderCard
- 使用 `overflow-hidden` + `opacity: 0.6` 营造堆叠感
- 中间内容区定位 `absolute` 居中

### 4. CodeEditorCard
- Tab 切换: Image/Video/Speech/Chat
- 代码语法高亮 (可用 prism-react-renderer)
- 打字机效果或静态展示

---

## 四、数据常量

```typescript
// lib/constants.ts

export const HERO_SLIDES = [
  {
    id: 1,
    image: 'https://static.wavespeed.ai/media/images/xxxxx.jpg',
    title: 'Nano Banana 2 - Best Image Generation',
    description: 'Unleash the power of Nano Banana 2 for stunning image generation',
    cta: { text: 'Try Nano Banana 2', href: '/models/nano-banana-2' }
  },
  // ... 5 张
];

export const PROVIDERS = [
  { id: 'wan', name: 'Wan', icon: '/icons/wan.svg', status: 'online' },
  { id: 'kling', name: 'Kling', icon: '/icons/kling.svg', status: 'online' },
  // ... 36 个
];

export const CATEGORIES = [
  { name: 'Text to Image', count: 150, icon: '🎨' },
  { name: 'Image to Video', count: 89, icon: '🎬' },
  // ... 20 个
];

export const FEATURE_TABS = [
  { id: 'image', label: 'Image', icon: TabIconImage, code: '...' },
  { id: 'video', label: 'Video', icon: TabIconVideo, code: '...' },
  { id: 'speech', label: 'Speech', icon: TabIconSpeech, code: '...' },
  { id: 'chat', label: 'Chat', icon: TabIconChat, code: '...' },
];
```

---

## 五、动效清单

| 元素 | 动效 | 实现方式 |
|------|------|----------|
| Hero 轮播 | 淡入淡出 (700ms) | opacity + transition |
| 进度条 | 宽度从 0→100% | animate-[progress-fill_5s] |
| Header 滚动 | 背景透明度变化 | scroll event + state |
| Provider Card | hover 放大 + 边框高亮 | group-hover |
| 代码编辑器 | Tab 切换 slide | transform translateX |
| 按钮 | hover 亮度提升 | hover:brightness-110 |
| Banner | 关闭动画 | opacity + height collapse |

---

## 六、响应式断点

```
sm: 640px   - 手机横屏
md: 768px   - 平板
lg: 1024px  - 小桌面
xl: 1280px  - 标准桌面
2xl: 1536px - 大屏
```

关键变化点:
- Hero 高度: 420px → 480px → 560px → 640px
- 导航: lg 以下显示汉堡菜单
- FeaturedModels 两侧堆叠: xl 以下隐藏
- Grid 列数: 1 → 2 → 3 → 4

---

## 七、图片资源

原始网站图片存储在:
- `https://static.wavespeed.ai/media/images/`
- `https://static.wavespeed.ai/media/icons/`

复刻方案:
1. 下载关键图片到 `/public/images/`
2. 使用 Next.js Image 组件优化
3. 使用 placeholder="blur" 提升体验

---

## 八、开始实施

### Step 1: 基础搭建
```bash
# 已完成的可以保持
# 需要安装的额外依赖
npm install framer-motion lucide-react
```

### Step 2: 按顺序实现
1. Header + Banner (固定顶部)
2. HeroSlideshow (视觉焦点)
3. FeaturedModels (核心展示)
4. FeaturesSection (功能介绍)
5. CategoryGrid (导航)
6. ForCreators + Footer (收尾)

### Step 3: 精调
- 像素级对比原站
- 动效时间曲线调整
- 性能优化 (Lighthouse)

---

**需要我立即开始实现哪个部分？推荐顺序：Header → Hero → FeaturedModels**
