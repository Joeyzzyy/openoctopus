"use client";

import { Image, Video, Mic, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export type TabType = "image" | "video" | "speech" | "chat";

interface Tab {
  id: TabType;
  label: string;
  icon: React.ElementType;
}

const TABS: Tab[] = [
  { id: "image", label: "Image", icon: Image },
  { id: "video", label: "Video", icon: Video },
  { id: "speech", label: "Speech", icon: Mic },
  { id: "chat", label: "Chat", icon: MessageSquare },
];

interface FeatureTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function FeatureTabs({ activeTab, onTabChange }: FeatureTabsProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto rounded-[5px] bg-[#111111] p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "relative flex shrink-0 items-center gap-2 rounded-[3px] px-4 py-2 font-mono text-xs transition-colors duration-200",
              isActive
                ? "bg-[#1a1a1a] text-white"
                : "text-white/60 hover:bg-[#1a1a1a] hover:text-white"
            )}
          >
            {isActive ? (
              <span className="absolute inset-y-0 left-0 w-full rounded-[3px] bg-white/[0.04]" />
            ) : null}
            <Icon className="h-4 w-4" />
            <span className="relative">{tab.label.toLowerCase()}.ts</span>
          </button>
        );
      })}
    </div>
  );
}
