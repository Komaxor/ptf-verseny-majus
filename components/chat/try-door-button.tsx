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
      className="flex items-center gap-1 px-3 py-1.5 text-xs text-[#00ff88]/80 hover:text-[#00ff88] border border-[#00ff88]/20 hover:border-[#00ff88]/40 rounded-lg transition-colors disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff88] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f]"
    >
      <DoorOpen className="w-3 h-3" />
      {isJudging ? "Próbálom..." : "Megpróbálom az ajtót"}
    </button>
  );
}
