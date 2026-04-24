"use client";

import { useGame } from "./game-provider";
import { PHASE_VIDEOS, PHASE_ROUND } from "@/lib/config";
import { PhaseVideo } from "./phase-video";
import { PhaseRound } from "./phase-round";
import { PhaseSuccess } from "./phase-success";

export function GameShell() {
  const { phase, isLoading, advancePhase } = useGame();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0f] text-white">
        <div role="status" aria-live="polite" className="animate-pulse text-lg">Betöltés...</div>
      </div>
    );
  }

  const videoSrc = PHASE_VIDEOS[phase];
  if (videoSrc) {
    return <PhaseVideo src={videoSrc} onComplete={advancePhase} />;
  }

  if (PHASE_ROUND[phase] !== undefined) {
    return <PhaseRound />;
  }

  if (phase === "SUCCESS") {
    return <PhaseSuccess />;
  }

  return null;
}
