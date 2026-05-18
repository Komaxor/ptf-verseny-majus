"use client";

import Image from "next/image";
import { useRef, useEffect } from "react";
import { User } from "lucide-react";
import { useGame } from "@/components/game/game-provider";
import type { ChatMessage as ChatMessageType } from "@/lib/types";
import { CHARACTERS, type RoundKey } from "@/lib/characters";

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === "user";
  const { currentRound } = useGame();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const wantsMuted =
      typeof window !== "undefined" &&
      localStorage.getItem("video_muted") === "true";
    video.muted = wantsMuted;
    video.play().catch(() => {
      video.muted = true;
      video.play().catch(() => {});
    });
  }, [message.video]);

  const avatarSrc = currentRound ? CHARACTERS[currentRound as RoundKey].crop : null;

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      {isUser ? (
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-brand/20">
          <User className="w-4 h-4 text-brand" />
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
        className={`max-w-[80%] min-w-0 rounded-lg px-4 py-2 ${
          isUser
            ? "bg-brand/10 border border-brand/20"
            : "bg-white/5 border border-white/10"
        }`}
      >
        {message.video && (
          <video
            ref={videoRef}
            src={message.video}
            playsInline
            controls
            preload="metadata"
            className="rounded-md w-full mb-2"
            aria-label="Asszisztens videóüzenete"
          />
        )}
        <p className="text-sm text-white/90 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{message.content}</p>
      </div>
    </div>
  );
}
