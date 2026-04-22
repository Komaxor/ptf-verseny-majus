"use client";

import { useRef, useEffect } from "react";
import { useGame } from "@/components/game/game-provider";
import { ChatInput } from "./chat-input";
import { ChatMessage } from "./chat-message";
import { ClearContextButton } from "./clear-context-button";
import { TryDoorButton } from "./try-door-button";

export function ChatInterface() {
  const { chatMessages, currentRound } = useGame();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chatMessages]);

  const isRound2 = currentRound === 2;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatMessages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
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
