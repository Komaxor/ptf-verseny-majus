"use client";

import { useRef, useEffect } from "react";
import Image from "next/image";
import { User } from "lucide-react";
import { useGame } from "@/components/game/game-provider";
import type { ChatMessage as ChatMessageType } from "@/lib/types";

const CHAT_AVATARS: Record<number, string> = {
  1: "/images/adel-crop.png",
  2: "/images/vanda-crop.png",
  3: "/images/copilot-crop.png",
};

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === "user";
  const { currentRound } = useGame();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // Try to play with sound — browsers allow this after user interaction
    video.muted = false;
    video.play().catch(() => {
      // Fallback: play muted if browser still blocks unmuted autoplay
      video.muted = true;
      video.play();
    });
  }, []);

  const avatarSrc = currentRound ? CHAT_AVATARS[currentRound] : null;

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      {isUser ? (
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[#00ff88]/20">
          <User className="w-4 h-4 text-[#00ff88]" />
        </div>
      ) : (
        <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 shrink-0">
          {avatarSrc ? (
            <Image src={avatarSrc} alt="" width={32} height={32} className="object-cover w-full h-full" />
          ) : (
            <div className="w-full h-full bg-white/10" />
          )}
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isUser
            ? "bg-[#00ff88]/10 border border-[#00ff88]/20"
            : "bg-white/5 border border-white/10"
        }`}
      >
        {message.video && (
          <video
            ref={videoRef}
            src={message.video}
            playsInline
            className="rounded-md w-full max-w-xs mb-2"
          />
        )}
        <p className="text-sm text-white/90 whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}
