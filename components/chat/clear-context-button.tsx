"use client";

import { useGame } from "@/components/game/game-provider";
import { RotateCcw } from "lucide-react";

export function ClearContextButton() {
  const { clearContext } = useGame();

  return (
    <button
      onClick={clearContext}
      className="flex items-center gap-1 px-3 py-1.5 text-xs text-white/40 hover:text-white/70 border border-white/10 hover:border-white/20 rounded-lg transition-colors"
    >
      <RotateCcw className="w-3 h-3" />
      Kontextus torlese
    </button>
  );
}
