"use client";

import { useGame } from "@/components/game/game-provider";
import { RotateCcw } from "lucide-react";

export function ClearContextButton() {
  const { clearContext } = useGame();

  return (
    <button
      onClick={clearContext}
      className="flex items-center gap-1.5 min-h-[44px] px-4 py-2.5 text-sm text-white/60 hover:text-white/90 border border-white/10 hover:border-white/20 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
    >
      <RotateCcw className="w-4 h-4" />
      Kontextus törlése
    </button>
  );
}
