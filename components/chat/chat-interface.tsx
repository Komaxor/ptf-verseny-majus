"use client";

import { useRef, useEffect } from "react";
import { useGame } from "@/components/game/game-provider";
import { ChatInput } from "./chat-input";
import { ChatMessage } from "./chat-message";
import { ClearContextButton } from "./clear-context-button";
import { TryDoorButton } from "./try-door-button";
import Image from "next/image";
import { Loader2 } from "lucide-react";

const CHAT_AVATARS: Record<number, string> = {
  1: "/images/adel-crop.png",
  2: "/images/vanda-crop.png",
  3: "/images/copilot-crop.png",
};

export function ChatInterface() {
  const { chatMessages, currentRound, isChatStreaming } = useGame();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages, but only if the user is already near the bottom
  // (preserves scroll position when the user has scrolled up to re-read earlier turns).
  // During streaming use instant scroll so token-by-token updates don't stack
  // concurrent smooth-scroll animations; honor reduced-motion preferences.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom > 200) return;
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior: ScrollBehavior =
      isChatStreaming || prefersReducedMotion ? "auto" : "smooth";
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, [chatMessages, isChatStreaming]);

  const isRound2 = currentRound === 2;
  const avatarSrc = currentRound ? CHAT_AVATARS[currentRound] : null;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatMessages.map((msg) =>
          msg.role === "assistant" && msg.content === "" ? null : (
            <ChatMessage key={msg.id} message={msg} />
          )
        )}
        {isChatStreaming && chatMessages[chatMessages.length - 1]?.content === "" && (
          <div className="flex gap-3" role="status" aria-live="polite">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 shrink-0">
              {avatarSrc ? (
                <Image src={avatarSrc} alt="" width={32} height={32} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full bg-white/10" />
              )}
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-white/60" aria-hidden="true" />
              <span className="text-sm text-white/60">Gondolkodom...</span>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-white/10 p-2 sm:p-4 space-y-3">
        <ChatInput />
        <div className="flex flex-wrap gap-1 sm:gap-2">
          <ClearContextButton />
          {isRound2 && <TryDoorButton />}
        </div>
      </div>
    </div>
  );
}
