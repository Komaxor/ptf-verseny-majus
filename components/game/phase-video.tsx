"use client";

import { useRef, useState, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { VIDEO_SKIP_DELAY_MS } from "@/lib/config";

interface PhaseVideoProps {
  src: string;
  onComplete: () => void;
}

export function PhaseVideo({ src, onComplete }: PhaseVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showSkip, setShowSkip] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSkip(true), VIDEO_SKIP_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const next = !video.muted;
    video.muted = next;
    setIsMuted(next);
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      <video
        ref={videoRef}
        src={src}
        autoPlay
        muted
        playsInline
        onEnded={onComplete}
        className="w-full h-full object-cover"
      />
      <button
        onClick={toggleMute}
        aria-label={isMuted ? "Hang bekapcsolása" : "Hang kikapcsolása"}
        aria-pressed={!isMuted}
        className="absolute bottom-8 left-8 flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-lg backdrop-blur-sm transition-all text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      >
        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        <span>{isMuted ? "Hang be" : "Hang ki"}</span>
      </button>
      {showSkip && (
        <button
          onClick={onComplete}
          className="absolute bottom-8 right-8 px-4 py-2 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-lg backdrop-blur-sm transition-all text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          Kihagyás &rarr;
        </button>
      )}
    </div>
  );
}
