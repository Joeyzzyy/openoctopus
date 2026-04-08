"use client";

import { useEffect, useState } from "react";
import { TabType } from "./FeatureTabs";

interface CodeEditorProps {
  activeTab: TabType;
}

const CODE_EXAMPLES: Record<TabType, { code: string; language: string }> = {
  image: {
    language: "typescript",
    code: `import { WaveSpeed } from '@wavespeed/sdk';

const client = new WaveSpeed({
  apiKey: process.env.WAVESPEED_API_KEY
});

// Generate an image from text
const result = await client.generate({
  model: 'nano-banana-2',
  prompt: 'A serene mountain landscape at sunset, cinematic lighting',
  width: 1024,
  height: 1024,
  steps: 30
});

console.log(result.url);`,
  },
  video: {
    language: "typescript",
    code: `import { WaveSpeed } from '@wavespeed/sdk';

const client = new WaveSpeed({
  apiKey: process.env.WAVESPEED_API_KEY
});

// Generate video from text
const result = await client.generate({
  model: 'wan-2.1',
  prompt: 'A cat playing piano in a jazz club',
  duration: 5,
  resolution: '720p',
  fps: 24
});

console.log(result.url);`,
  },
  speech: {
    language: "typescript",
    code: `import { WaveSpeed } from '@wavespeed/sdk';

const client = new WaveSpeed({
  apiKey: process.env.WAVESPEED_API_KEY
});

// Clone voice and generate speech
const result = await client.speech({
  model: 'voice-clone-v1',
  text: 'Hello, this is a cloned voice speaking.',
  voiceId: 'custom-voice-123',
  speed: 1.0
});

console.log(result.audioUrl);`,
  },
  chat: {
    language: "typescript",
    code: `import { WaveSpeed } from '@wavespeed/sdk';

const client = new WaveSpeed({
  apiKey: process.env.WAVESPEED_API_KEY
});

// Chat with multimodal AI
const response = await client.chat({
  model: 'gpt-4o-vision',
  messages: [
    { 
      role: 'user', 
      content: 'Describe this image',
      image: 'https://example.com/photo.jpg'
    }
  ]
});

console.log(response.content);`,
  },
};

// Simple syntax highlighting
function highlightCode(code: string) {
  return code
    .split("\n")
    .map((line) => {
      // Highlight keywords
      const highlighted = line
        .replace(/\b(import|from|const|let|var|async|await|function|return|if|else|for|while)\b/g, '<span class="text-purple-400">$1</span>')
        .replace(/\b(new|class|extends|interface|type)\b/g, '<span class="text-purple-400">$1</span>')
        .replace(/\b(process|console|JSON|Math|Date)\b/g, '<span class="text-yellow-400">$1</span>')
        .replace(/('[^']*'|"[^"]*"|`[^`]*`)/g, '<span class="text-green-400">$1</span>')
        .replace(/\b(\d+)\b/g, '<span class="text-orange-400">$1</span>')
        .replace(/(\/\/.*$)/gm, '<span class="text-gray-500">$1</span>');
      
      return `<div class="leading-6">${highlighted || "&nbsp;"}</div>`;
    })
    .join("");
}

export function CodeEditor({ activeTab }: CodeEditorProps) {
  const [displayedCode, setDisplayedCode] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const example = CODE_EXAMPLES[activeTab];
  const fullCode = example.code;

  // Typewriter effect when tab changes
  useEffect(() => {
    setIsTyping(true);
    setDisplayedCode("");
    
    let index = 0;
    const speed = 15; // ms per character
    
    const typeInterval = setInterval(() => {
      if (index < fullCode.length) {
        setDisplayedCode(fullCode.slice(0, index + 1));
        index++;
      } else {
        clearInterval(typeInterval);
        setIsTyping(false);
      }
    }, speed);

    return () => clearInterval(typeInterval);
  }, [activeTab, fullCode]);

  const totalLines = fullCode.split("\n").length;

  return (
    <div className="overflow-hidden rounded-[5px] border border-white/10 bg-[#111111] transition-all duration-300 hover:border-white/20">
      <div className="flex">
        <div className="select-none border-r border-white/10 bg-black/30 px-4 py-4 text-right">
          {Array.from({ length: totalLines }).map((_, i) => (
            <div key={i} className="leading-6 text-sm text-white/30">
              {i + 1}
            </div>
          ))}
        </div>

        <div className="relative flex-1 overflow-x-auto bg-[#111111] p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs text-white/45">example.{activeTab}.ts</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40">TypeScript</span>
              {isTyping && (
                <span className="flex h-2 w-2 animate-pulse rounded-full bg-[#24be58]" />
              )}
            </div>
          </div>
          <pre className="font-mono text-sm">
            <code
              dangerouslySetInnerHTML={{ __html: highlightCode(displayedCode) }}
            />
            {isTyping && (
              <span className="inline-block h-4 w-2 animate-pulse bg-white/50" />
            )}
          </pre>
        </div>
      </div>
    </div>
  );
}
