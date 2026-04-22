"use client";

import { useState, useEffect } from "react";
import { useGame } from "@/components/game/game-provider";
import { PHASE_ROUND } from "@/lib/config";
import { Timer } from "lucide-react";

export function HeaderBar() {
  const { gameState, phase } = useGame();
  const [elapsed, setElapsed] = useState(0);
  const currentRound = PHASE_ROUND[phase] ?? null;

  // Timer: counts total active round time
  useEffect(() => {
    if (!gameState) return;

    const interval = setInterval(() => {
      let total = 0;
      for (const r of [1, 2, 3]) {
        const started = gameState[
          `round${r}_started_at` as keyof typeof gameState
        ] as string | null;
        const completed = gameState[
          `round${r}_completed_at` as keyof typeof gameState
        ] as string | null;
        if (started) {
          const end = completed ? new Date(completed).getTime() : Date.now();
          total += end - new Date(started).getTime();
        }
      }
      setElapsed(total);
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState]);

  const minutes = Math.floor(elapsed / 60000);
  const seconds = Math.floor((elapsed % 60000) / 1000);

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-[#0a0a0f] border-b border-white/10">
      <div className="flex items-center gap-3">
        <span className="text-[#00ff88] font-bold text-lg tracking-tight">PTF</span>
        <span className="text-white/20 text-sm">Citadel Plaza</span>
      </div>

      {currentRound && (
        <div className="flex items-center gap-4">
          <div className="flex gap-1">
            {[1, 2, 3].map((r) => (
              <div
                key={r}
                className={`w-2 h-2 rounded-full ${
                  r < currentRound
                    ? "bg-[#00ff88]"
                    : r === currentRound
                    ? "bg-[#00ff88] animate-pulse"
                    : "bg-white/20"
                }`}
              />
            ))}
          </div>
          <span className="text-white/40 text-sm">Round {currentRound}/3</span>
        </div>
      )}

      <div className="flex items-center gap-2 text-white/60 text-sm font-mono">
        <Timer className="w-4 h-4" />
        {minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
      </div>
    </header>
  );
}
