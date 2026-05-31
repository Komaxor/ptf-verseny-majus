"use client";

import Image from "next/image";
import { useRef, useState, useEffect } from "react";
import { User, VolumeX } from "lucide-react";
import { useGame } from "@/components/game/game-provider";
import type { ChatMessage as ChatMessageType } from "@/lib/types";
import { CHARACTERS, type RoundKey } from "@/lib/characters";

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === "user";
  const { currentRound } = useGame();
  const videoRef = useRef<HTMLVideoElement>(null);
  // Set when the player wanted sound but the browser refused unmuted autoplay
  // (iOS Safari). We play muted and prompt for a tap, which CAN enable sound.
  const [awaitingUnmute, setAwaitingUnmute] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const wantsMuted =
      typeof window !== "undefined" &&
      localStorage.getItem("video_muted") === "true";
    video.muted = wantsMuted;
    video.play().catch(() => {
      video.muted = true;
      if (!wantsMuted) setAwaitingUnmute(true);
      video.play().catch(() => {});
    });
  }, [message.video]);

  // A direct tap reliably enables sound on iOS, unlike autoplay.
  const enableSound = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    setAwaitingUnmute(false);
    if (typeof window !== "undefined") localStorage.setItem("video_muted", "false");
    if (video.paused) video.play().catch(() => {});
  };

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
          <div className="relative mb-2">
            <video
              ref={videoRef}
              src={message.video}
              playsInline
              controls
              preload="metadata"
              className="rounded-md w-full"
              aria-label="Asszisztens videóüzenete"
            />
            {awaitingUnmute && (
              <button
                onClick={enableSound}
                aria-label="Hang bekapcsolása"
                className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-md bg-black/40 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset"
              >
                <span className="flex items-center justify-center w-12 h-12 rounded-full bg-white/15 backdrop-blur-sm">
                  <VolumeX className="w-6 h-6" />
                </span>
                <span className="text-sm font-medium">Koppints a hangért</span>
              </button>
            )}
          </div>
        )}
        <p className="text-sm text-white/90 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{message.content}</p>
      </div>
    </div>
  );
}
