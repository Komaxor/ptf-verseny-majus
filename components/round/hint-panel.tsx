"use client";

import { useState, useEffect } from "react";
import { useGame } from "@/components/game/game-provider";
import { Lock, Unlock, Lightbulb, ChevronUp, ChevronDown } from "lucide-react";

interface HintPanelProps {
  round: number;
}

export function HintPanel({ round }: HintPanelProps) {
  const { gameState, revealedHints, revealHint } = useGame();
  const [now, setNow] = useState(Date.now());
  const [hints, setHints] = useState<
    Array<{ number: number; unlock_after_minutes: number; text: string }>
  >([]);
  const [isOpen, setIsOpen] = useState(false);

  // Load hints from config (client-side fetch)
  useEffect(() => {
    fetch(`/api/challenge?round=${round}`)
      .then((r) => r.json())
      .then((data) => setHints(data.hints || []))
      .catch(() => {});
  }, [round]);

  // Tick every second for countdowns
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const roundStarted = gameState?.[
    `round${round}_started_at` as keyof typeof gameState
  ] as string | null;
  if (!roundStarted || hints.length === 0) return null;

  const startTime = new Date(roundStarted).getTime();

  return (
    <div className="border-t border-white/10">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="hints-panel-body"
        className="w-full flex items-center gap-2 min-h-[44px] px-4 py-3 text-sm text-white/70 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      >
        <Lightbulb className="w-4 h-4" />
        Tippek (
        {hints.filter((h) => now >= startTime + h.unlock_after_minutes * 60000).length}/3)
        {isOpen ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
      </button>

      {isOpen && (
        <div id="hints-panel-body" className="px-4 pb-3 space-y-2">
          {hints.map((hint) => {
            const unlockTime = startTime + hint.unlock_after_minutes * 60000;
            const isUnlocked = now >= unlockTime;
            const isRevealed = revealedHints.some(
              (h) => h.round === round && h.hint_number === hint.number
            );

            if (!isUnlocked) {
              const remaining = Math.ceil((unlockTime - now) / 1000);
              const min = Math.floor(remaining / 60);
              const sec = remaining % 60;
              return (
                <div
                  key={hint.number}
                  className="flex items-center gap-2 min-h-[32px] text-sm text-white/60"
                >
                  <Lock className="w-4 h-4" />
                  <span>
                    Tipp {hint.number} - {min}:{sec.toString().padStart(2, "0")}
                  </span>
                </div>
              );
            }

            if (isRevealed) {
              return (
                <div
                  key={hint.number}
                  className="flex items-start gap-2 text-sm text-brand/90"
                >
                  <Lightbulb className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{hint.text}</span>
                </div>
              );
            }

            return (
              <button
                key={hint.number}
                onClick={() => revealHint(round, hint.number)}
                className="flex items-center gap-2 min-h-[40px] px-2 -mx-2 text-sm text-white/70 hover:text-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface rounded"
              >
                <Unlock className="w-4 h-4" />
                <span>Tipp {hint.number} felfedése</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
