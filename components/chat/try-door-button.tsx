"use client";

import { useState } from "react";
import { useGame } from "@/components/game/game-provider";
import { DoorOpen } from "lucide-react";

export function TryDoorButton() {
  const { tryDoor, advancePhase, setChatMessages } = useGame();
  const [isJudging, setIsJudging] = useState(false);

  const handleTryDoor = async () => {
    setIsJudging(true);
    try {
      const result = await tryDoor();
      if (result.granted) {
        await advancePhase();
      } else {
        // Add visual-only rejection message with locked video
        setChatMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant" as const,
            content: result.error || "Meghúzod a kilincset, de az ajtó meg se mozdul.",
            created_at: new Date().toISOString(),
            video: "/videos/locked.mp4",
          },
        ]);
      }
    } finally {
      setIsJudging(false);
    }
  };

  return (
    <button
      onClick={handleTryDoor}
      disabled={isJudging}
      className="flex items-center gap-1 sm:gap-1.5 min-h-[44px] px-2 sm:px-4 py-2.5 text-xs sm:text-sm text-brand/80 hover:text-brand border border-brand/20 hover:border-brand/40 rounded-lg transition-colors disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
    >
      <DoorOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      {isJudging ? "Próbálom..." : "Megpróbálom az ajtót"}
    </button>
  );
}
