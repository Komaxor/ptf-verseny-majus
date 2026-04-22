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
        // Add visual-only rejection message
        setChatMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant" as const,
            content: "Meghuzod a kilincset, de az ajto meg se mozdul.",
            created_at: new Date().toISOString(),
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
      className="flex items-center gap-1 px-3 py-1.5 text-xs text-[#00ff88]/70 hover:text-[#00ff88] border border-[#00ff88]/20 hover:border-[#00ff88]/40 rounded-lg transition-colors disabled:opacity-30"
    >
      <DoorOpen className="w-3 h-3" />
      {isJudging ? "Probalom..." : "Megprobalom az ajtot"}
    </button>
  );
}
