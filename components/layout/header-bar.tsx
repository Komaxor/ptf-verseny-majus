"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGame } from "@/components/game/game-provider";
import { COMPETITION_END, PHASE_ROUND } from "@/lib/config";
import { t } from "@/lib/translations";
import { Timer } from "lucide-react";
import { SoundToggle } from "@/components/sound-toggle";

export function HeaderBar() {
  const { gameState, phase } = useGame();
  const router = useRouter();
  const [remaining, setRemaining] = useState(0);
  const [givingUp, setGivingUp] = useState(false);
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
  const isUrgent = remaining === 0 || minutes < 1;

  return (
    <header className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-surface border-b border-white/10">
      <div className="flex items-center gap-2 min-w-0">
        <img src="/promptverseny-logo.jpg" alt="Promptverseny" className="w-6 h-6 rounded-sm" />
        <span className="text-white/60 text-sm hidden sm:inline truncate">Májusi promptverseny</span>
      </div>

      {currentRound && (
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex gap-1" aria-label={`${currentRound}. feladat / 3`}>
            {[1, 2, 3].map((r) => (
              <div
                key={r}
                className={`w-2 h-2 rounded-full ${r < currentRound
                    ? "bg-brand"
                    : r === currentRound
                      ? "bg-brand animate-pulse"
                      : "bg-white/30"
                  }`}
              />
            ))}
          </div>
          <span className="text-white/60 text-sm hidden sm:inline">
            {currentRound === 1 ? "Első" : currentRound === 2 ? "Második" : "Harmadik"} feladat
          </span>
        </div>
      )}

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative group">
          <SoundToggle />
          <span
            role="tooltip"
            className="pointer-events-none absolute right-0 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 top-full mt-2 whitespace-nowrap rounded-md bg-black/90 border border-brand/30 px-3 py-1.5 text-xs text-white/90 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 z-20"
          >
            A videók hanggal a legélvezetesebbek.
          </span>
        </div>
        <div
          role="timer"
          aria-live={isUrgent ? "assertive" : "polite"}
        aria-atomic="true"
        aria-label={
          remaining === 0
            ? "A verseny lezárult"
            : `Hátralévő idő: ${minutes} perc ${seconds} másodperc`
        }
        className={`flex items-center gap-2 text-sm font-mono ${remaining === 0
            ? "text-red-500 font-bold"
            : minutes < 1
              ? "text-red-500"
              : minutes < 5
                ? "text-yellow-400"
                : "text-white/80"
          }`}
        title={t.videoTimeNotice}
      >
        <Timer className="w-4 h-4" aria-hidden="true" />
        {remaining === 0
          ? "LEZÁRULT"
          : `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`}
      </div>

      {remaining === 0 && (
        <button
          disabled={givingUp}
          onClick={async () => {
            if (!confirm("Biztosan feladod? Ez a művelet nem vonható vissza.")) return;
            setGivingUp(true);
            try {
              const res = await fetch("/api/give-up", { method: "POST" });
              if (res.ok) {
                router.replace("/closed");
                return;
              }
              const body = await res.json().catch(() => ({}));
              // Middleware 403 for already-gave-up users — safe to redirect
              if (res.status === 403 && body.error === "Feladtad a versenyt.") {
                router.replace("/closed");
                return;
              }
              alert(body.error || "Hiba történt, próbáld újra.");
              setGivingUp(false);
            } catch {
              alert("Hálózati hiba, próbáld újra.");
              setGivingUp(false);
            }
          }}
          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded transition-colors"
        >
          Feladom
        </button>
      )}
      </div>
    </header>
  );
}
