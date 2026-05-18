"use client";

import { useRef, useState, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { VIDEO_SKIP_DELAY_MS } from "@/lib/config";

interface PhaseVideoProps {
  src: string;
  onComplete: () => void;
}

function readMutedPref(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("video_muted") === "true";
}

export function PhaseVideo({ src, onComplete }: PhaseVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showSkip, setShowSkip] = useState(false);
  const [isMuted, setIsMuted] = useState(readMutedPref);

  useEffect(() => {
    const timer = setTimeout(() => setShowSkip(true), VIDEO_SKIP_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const wantsMuted = readMutedPref();
    video.muted = wantsMuted;
    setIsMuted(wantsMuted);
    video.play().catch(() => {
      // Browser refused unmuted play (no user gesture / iOS) — fall back to muted.
      video.muted = true;
      setIsMuted(true);
      video.play().catch(() => {});
    });
  }, []);

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const next = !video.muted;
    video.muted = next;
    setIsMuted(next);
    localStorage.setItem("video_muted", String(next));
    if (!next && video.paused) {
      video.play().catch(() => {});
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      <video
        ref={videoRef}
        src={src}
        playsInline
        onEnded={onComplete}
        className="w-full h-full object-contain sm:object-cover"
      />
      <div className="absolute bottom-4 sm:bottom-8 left-4 sm:left-8 right-4 sm:right-8 flex items-center justify-between gap-2">
        <button
          onClick={toggleMute}
          aria-label={isMuted ? "Hang bekapcsolása" : "Hang kikapcsolása"}
          aria-pressed={!isMuted}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-lg backdrop-blur-sm transition-all text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          <span className="hidden sm:inline">{isMuted ? "Hang be" : "Hang ki"}</span>
        </button>
        {showSkip && (
          <button
            onClick={onComplete}
            className="px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-lg backdrop-blur-sm transition-all text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            Kihagyás &rarr;
          </button>
        )}
      </div>
    </div>
  );
}
