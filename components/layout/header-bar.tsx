"use client";

import { useState, useEffect } from "react";
import { useGame } from "@/components/game/game-provider";
import { COMPETITION_END, PHASE_ROUND } from "@/lib/config";
import { Timer } from "lucide-react";

export function HeaderBar() {
  const { gameState, phase } = useGame();
  const [remaining, setRemaining] = useState(0);
  const currentRound = PHASE_ROUND[phase] ?? null;

  // Timer: counts down to competition end
  useEffect(() => {
    const update = () => {
      const diff = COMPETITION_END.getTime() - Date.now();
      setRemaining(Math.max(0, diff));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-[#0a0a0f] border-b border-white/10">
      <div className="flex items-center gap-3">
        <span className="text-[#00ff88] font-bold text-lg tracking-tight">PTF</span>
        <span className="text-white/20 text-sm">Áprilisi promptverseny</span>
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
          <span className="text-white/40 text-sm">
            {currentRound === 1 ? "Első" : currentRound === 2 ? "Második" : "Harmadik"} feladat
          </span>
        </div>
      )}

      <div
        className={`flex items-center gap-2 text-sm font-mono ${
          remaining === 0
            ? "text-red-500 font-bold"
            : minutes < 1
            ? "text-red-500"
            : minutes < 5
            ? "text-yellow-400"
            : "text-white/60"
        }`}
        title="Hátralévő idő"
      >
        <Timer className="w-4 h-4" />
        {remaining === 0
          ? "LEZÁRULT"
          : `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`}
      </div>
    </header>
  );
}
