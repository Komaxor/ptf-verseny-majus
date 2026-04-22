"use client";

import { useRef, useState, useEffect } from "react";
import { VIDEO_SKIP_DELAY_MS } from "@/lib/config";

interface PhaseVideoProps {
  src: string;
  onComplete: () => void;
}

export function PhaseVideo({ src, onComplete }: PhaseVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showSkip, setShowSkip] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowSkip(true), VIDEO_SKIP_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      <video
        ref={videoRef}
        src={src}
        autoPlay
        playsInline
        onEnded={onComplete}
        className="w-full h-full object-cover"
      />
      {showSkip && (
        <button
          onClick={onComplete}
          className="absolute bottom-8 right-8 px-4 py-2 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded-lg backdrop-blur-sm transition-all text-sm"
        >
          Kihagyas &rarr;
        </button>
      )}
    </div>
  );
}
