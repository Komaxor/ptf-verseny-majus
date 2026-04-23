"use client";

import { useRef, useEffect } from "react";
import { useGame } from "@/components/game/game-provider";
import { ChatInput } from "./chat-input";
import { ChatMessage } from "./chat-message";
import { ClearContextButton } from "./clear-context-button";
import { TryDoorButton } from "./try-door-button";
import { Loader2, Bot } from "lucide-react";

export function ChatInterface() {
  const { chatMessages, currentRound, isChatStreaming } = useGame();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "instant" });
  }, [chatMessages]);

  const isRound2 = currentRound === 2;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatMessages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isChatStreaming && chatMessages[chatMessages.length - 1]?.content === "" && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-white/60" />
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-white/40" />
              <span className="text-sm text-white/40">Gondolkodom...</span>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-white/10 p-4 space-y-3">
        <ChatInput />
        <div className="flex gap-2">
          <ClearContextButton />
          {isRound2 && <TryDoorButton />}
        </div>
      </div>
    </div>
  );
}
